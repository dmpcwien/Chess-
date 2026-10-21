"""Glicko-2 ratings and durable-capable player store for Schach 1001+ Pro.

Default SQLite is for local development. On Render Free the filesystem is ephemeral:
configure RATING_DATABASE_URL pointing to a persistent PostgreSQL database before
treating rankings as permanent.
"""
from __future__ import annotations

from contextlib import contextmanager
import hashlib
import math
import os
from pathlib import Path
import secrets
import sqlite3
import threading
import time

SCALE = 173.7178
DEFAULT_RATING = 1500.0
DEFAULT_RD = 350.0
DEFAULT_SIGMA = 0.06
PERIOD_SECONDS = 86400
MAX_RD = 350.0


def glicko2_update(R, RD, sigma, opponents, tau=0.5):
    """One Glicko-2 rating period; opponents = [(rating, RD, score), ...].

    Scores are 1 for win, 1/2 for draw, 0 for loss.
    Return UNROUNDED numbers; only round for user-facing display.
    """
    if not (0 < RD <= MAX_RD and 0 < sigma <= 1 and 0 < tau <= 2):
        raise ValueError("Ungültige Glicko-2-Parameter")
    mu = (R - 1500.0) / SCALE
    phi = RD / SCALE
    if not opponents:
        return R, min(MAX_RD, SCALE * math.sqrt(phi * phi + sigma * sigma)), sigma

    def g(p):
        return 1.0 / math.sqrt(1.0 + 3.0 * p * p / math.pi**2)

    def expected(m, opponent_mu, opponent_phi):
        x = g(opponent_phi) * (m - opponent_mu)
        # Stable sigmoid also for extreme rating differences.
        return 1.0 / (1.0 + math.exp(-x)) if x >= 0 else math.exp(x) / (1.0 + math.exp(x))

    values = []
    for rating_j, rd_j, score in opponents:
        if not (0 < rd_j <= MAX_RD and score in (0.0, 0.5, 1.0)):
            raise ValueError("Ungültiger Gegner oder Ergebnis")
        mj = (rating_j - 1500.0) / SCALE
        pj = rd_j / SCALE
        values.append((g(pj), expected(mu, mj, pj), score))

    v_inv = sum(gj**2 * ej * (1 - ej) for gj, ej, _ in values)
    if v_inv <= 0:
        raise ValueError("Glicko-2 variance cannot be computed")
    v = 1.0 / v_inv
    score_sum = sum(gj * (sj - ej) for gj, ej, sj in values)
    delta = v * score_sum
    a = math.log(sigma * sigma)

    def f(x):
        ex = math.exp(x)
        base = phi * phi + v + ex
        return (ex * (delta**2 - phi * phi - v - ex)) / (2 * base * base) - (x - a) / (tau**2)

    # Glickman's Illinois method (not basic regula falsi).
    A = a
    if delta * delta > phi * phi + v:
        B = math.log(delta * delta - phi * phi - v)
    else:
        k = 1
        while f(a - k * tau) < 0:
            k += 1
            if k > 1000:
                raise ArithmeticError("Volatility bracketing did not converge")
        B = a - k * tau
    fA, fB = f(A), f(B)
    for _ in range(100):
        if abs(B - A) <= 1e-7:
            break
        C = A + ((A - B) * fA) / (fB - fA)
        fC = f(C)
        if fC * fB <= 0:
            A, fA = B, fB
        else:
            fA /= 2.0
        B, fB = C, fC
    else:
        raise ArithmeticError("Glicko-2 volatility did not converge")

    new_sigma = math.exp(A / 2.0)
    phi_star = math.sqrt(phi * phi + new_sigma * new_sigma)
    new_phi = 1.0 / math.sqrt((1.0 / (phi_star * phi_star)) + (1.0 / v))
    new_mu = mu + new_phi * new_phi * score_sum
    return (1500.0 + SCALE * new_mu, min(MAX_RD, SCALE * new_phi), new_sigma)


def aged_rating(rating_row, now: int):
    """Increase RD by one inactive rating period per elapsed full UTC day."""
    rating, rd, sigma, played, last_period = rating_row
    today = now // PERIOD_SECONDS
    idle = max(0, today - int(last_period))
    if idle:
        _, rd, _ = glicko2_update(rating, rd, sigma, [])
        if idle > 1:
            rd = min(MAX_RD, math.sqrt(rd**2 + (idle - 1) * (sigma * SCALE)**2))
    return rating, rd, sigma, played, today


def public_rating(row):
    return {
        "rating": round(row[0], 1),
        "rd": round(row[1], 1),
        "sigma": round(row[2], 5),
        "games": int(row[3]),
        "provisional": int(row[3]) < 10,
    }


class RatingStore:
    """Two-player atomic updates, once per completed game, independent pools."""

    def __init__(self, path=None, database_url=None):
        self.url = database_url if database_url is not None else os.getenv("RATING_DATABASE_URL", "")
        self.pg = bool(self.url)
        if self.pg:
            # Do not import unless the feature is configured.
            import psycopg
            self.psycopg = psycopg
        self.path = str(path or os.getenv("CHESS_RATINGS_DB_PATH", "/tmp/schach1001-ratings.sqlite3"))
        self.lock = threading.RLock()
        if not self.pg:
            Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    @contextmanager
    def connect(self):
        if self.pg:
            with self.psycopg.connect(self.url) as connection:
                yield connection
        else:
            with sqlite3.connect(self.path, timeout=30) as connection:
                connection.execute("PRAGMA busy_timeout = 30000")
                yield connection

    def execute(self, con, sql, params=()):
        if self.pg:
            return con.execute(sql.replace("?", "%s"), params)
        return con.execute(sql, params)

    def _init_schema(self):
        with self.lock, self.connect() as con:
            if not self.pg:
                con.execute("PRAGMA journal_mode = WAL")
            self.execute(con, """CREATE TABLE IF NOT EXISTS players (
                id TEXT PRIMARY KEY, nickname TEXT NOT NULL,
                token_hash TEXT NOT NULL UNIQUE, created_at BIGINT NOT NULL)""")
            self.execute(con, """CREATE TABLE IF NOT EXISTS ratings (
                player_id TEXT NOT NULL, mode TEXT NOT NULL,
                rating DOUBLE PRECISION NOT NULL, rd DOUBLE PRECISION NOT NULL,
                sigma DOUBLE PRECISION NOT NULL, games INTEGER NOT NULL,
                last_period BIGINT NOT NULL,
                PRIMARY KEY (player_id, mode))""")
            self.execute(con, """CREATE TABLE IF NOT EXISTS rated_games (
                game_id TEXT PRIMARY KEY, mode TEXT NOT NULL,
                white_id TEXT NOT NULL, black_id TEXT NOT NULL,
                result TEXT NOT NULL, finished_at BIGINT NOT NULL,
                white_before DOUBLE PRECISION NOT NULL, white_after DOUBLE PRECISION NOT NULL,
                black_before DOUBLE PRECISION NOT NULL, black_after DOUBLE PRECISION NOT NULL)""")

    def create_player(self, name):
        nickname = name.strip()
        if not nickname or len(nickname) > 32:
            raise ValueError("Spielername: 1 bis 32 Zeichen")
        token = secrets.token_urlsafe(32)
        pid = secrets.token_hex(16)
        hashed = hashlib.sha256(token.encode()).hexdigest()
        with self.lock, self.connect() as con:
            self.execute(con, "INSERT INTO players (id,nickname,token_hash,created_at) VALUES (?,?,?,?)",
                         (pid, nickname, hashed, int(time.time())))
        return {"id": pid, "name": nickname, "player_token": token}

    def player_for_token(self, token):
        if not token or not isinstance(token, str) or len(token) > 256:
            return None
        hashed = hashlib.sha256(token.encode()).hexdigest()
        with self.lock, self.connect() as con:
            row = self.execute(con, "SELECT id,nickname FROM players WHERE token_hash = ?", (hashed,)).fetchone()
            return {"id": row[0], "name": row[1]} if row else None

    def get_rating(self, player_id, mode, now=None):
        now = int(now or time.time())
        with self.lock, self.connect() as con:
            r = self.execute(con, "SELECT nickname FROM players WHERE id = ?", (player_id,)).fetchone()
            if not r:
                return None
            row = self.execute(con, "SELECT rating,rd,sigma,games,last_period FROM ratings WHERE player_id = ? AND mode = ?",
                               (player_id, mode)).fetchone()
        if row:
            stats = public_rating(aged_rating(row, now))
        else:
            stats = public_rating((DEFAULT_RATING, DEFAULT_RD, DEFAULT_SIGMA, 0, now // PERIOD_SECONDS))
        return {"id": player_id, "name": r[0], "mode": mode, **stats}

    def finish_game(self, game_id, mode, white_id, black_id, result, now=None):
        """Compute both outcomes from the SAME pre-game ratings, commit atomically.

        Idempotent across repeated websocket events / reconnects / process restarts,
        as long as the database itself persists.
        """
        if result not in ("1-0", "0-1", "1/2-1/2"):
            raise ValueError("Ungültiges Partieergebnis")
        if white_id == black_id:
            raise ValueError("Eigenpartien dürfen nicht gewertet werden")
        now = int(now or time.time())
        today = now // PERIOD_SECONDS

        with self.lock, self.connect() as con:
            if not self.pg:
                self.execute(con, "BEGIN IMMEDIATE")
            existing = self.execute(con, """SELECT white_before,white_after,black_before,black_after
                         FROM rated_games WHERE game_id = ?""", (game_id,)).fetchone()
            if existing:
                return self._changes(existing, True)
            # Acquire row locks for both players, in deterministic order on PostgreSQL.
            for pid in sorted([white_id, black_id]):
                if not self.execute(con, "SELECT id FROM players WHERE id = ?", (pid,)).fetchone():
                    raise ValueError("Unbekanntes Spielerprofil")
                self.execute(con, """INSERT INTO ratings (player_id,mode,rating,rd,sigma,games,last_period)
                             VALUES (?,?,?,?,?,?,?) ON CONFLICT (player_id,mode) DO NOTHING""",
                             (pid, mode, DEFAULT_RATING, DEFAULT_RD, DEFAULT_SIGMA, 0, today))
            ratings = {}
            for pid in sorted([white_id, black_id]):
                query = """SELECT rating,rd,sigma,games,last_period FROM ratings
                           WHERE player_id = ? AND mode = ?"""
                if self.pg:
                    query += " FOR UPDATE"
                row = self.execute(con, query, (pid, mode)).fetchone()
                ratings[pid] = aged_rating(row, now)

            w = ratings[white_id]
            b = ratings[black_id]
            w_score = {"1-0": 1.0, "0-1": 0.0, "1/2-1/2": 0.5}[result]
            nw = glicko2_update(w[0], w[1], w[2], [(b[0], b[1], w_score)])
            nb = glicko2_update(b[0], b[1], b[2], [(w[0], w[1], 1.0 - w_score)])
            for pid, old, new in [(white_id, w, nw), (black_id, b, nb)]:
                self.execute(con, """UPDATE ratings SET rating=?,rd=?,sigma=?,games=?,last_period=?
                              WHERE player_id=? AND mode=?""",
                             (*new, old[3] + 1, today, pid, mode))
            self.execute(con, """INSERT INTO rated_games
                         (game_id,mode,white_id,black_id,result,finished_at,
                          white_before,white_after,black_before,black_after)
                         VALUES (?,?,?,?,?,?,?,?,?,?)""",
                         (game_id, mode, white_id, black_id, result, now, w[0], nw[0], b[0], nb[0]))
            return self._changes((w[0], nw[0], b[0], nb[0]), False)

    @staticmethod
    def _changes(values, duplicate):
        w0, w1, b0, b1 = values
        return {
            "white": {"before": round(w0, 1), "after": round(w1, 1), "change": round(w1 - w0, 1)},
            "black": {"before": round(b0, 1), "after": round(b1, 1), "change": round(b1 - b0, 1)},
            "already_recorded": duplicate,
        }


# Shared singleton, with lazy connection on import avoided for CI/tests.
_default_store = None
_default_lock = threading.Lock()


def get_store():
    global _default_store
    with _default_lock:
        if _default_store is None:
            _default_store = RatingStore()
        return _default_store
