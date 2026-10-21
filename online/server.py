"""Schach 1001+ Pro: authoritative online chess/variant server.

Run: pip install -r requirements.txt
     uvicorn server:app --host 0.0.0.0 --port 8000

Prototype: rooms are held in memory and disappear on server restart.
Deploy behind HTTPS; use a persistent shared store before scaling to >1 process.
"""
from __future__ import annotations

import asyncio
import os
import secrets
import string
import time
from pathlib import Path
from dataclasses import dataclass, field
from contextlib import asynccontextmanager

import chess
import chess.variant
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from fastapi import Header

try:
    from .ratings import get_store
    from .migrate_ratings import migrate_on_startup
except ImportError:  # uvicorn server:app when cwd is online/
    from ratings import get_store
    from migrate_ratings import migrate_on_startup

MODES = {
    "standard": "Klassisches Schach",
    "chess960": "Schach960",
    "kingofthehill": "King of the Hill",
    "threecheck": "Three-Check",
    "antichess": "Räuberschach",
    "atomic": "Atomschach",
    "horde": "Horde",
    "racingkings": "Racing Kings",
    "crazyhouse": "Crazyhouse",
    "simul": "Simultanschach",
    "blind1": "Blindschach 1 · Leicht",
    "blind2": "Blindschach 2 · Mittel",
    "blind3": "Blindschach 3 · Schwer",
    "blind4": "Blindschach 4 · Experte",
    "blind5": "Blindschach 5 · Komplett blind",
}
BOARD_CLASSES = {
    "standard": chess.Board,
    "kingofthehill": chess.variant.KingOfTheHillBoard,
    "threecheck": chess.variant.ThreeCheckBoard,
    "antichess": chess.variant.AntichessBoard,
    "atomic": chess.variant.AtomicBoard,
    "horde": chess.variant.HordeBoard,
    "racingkings": chess.variant.RacingKingsBoard,
    "crazyhouse": chess.variant.CrazyhouseBoard,
    "simul": chess.Board,
    "blind1": chess.Board,
    "blind2": chess.Board,
    "blind3": chess.Board,
    "blind4": chess.Board,
    "blind5": chess.Board,
}
@asynccontextmanager
async def lifespan(app):
    # A successful service startup also verifies database access and creates
    # the ratings tables (so a misconfigured Render DB cannot show as Live).
    migrate_on_startup()
    get_store()
    yield


app = FastAPI(
    title="Schach 1001+ Pro Online", version="0.2.0",
    lifespan=lifespan,
)
origins = [s.strip() for s in os.getenv("ONLINE_ALLOW_ORIGINS", "*").split(",")]
app.add_middleware(
    CORSMiddleware, allow_origins=origins, allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"], allow_credentials=False,
)


class RoomRequest(BaseModel):
    name: str = Field(min_length=1, max_length=32)
    mode: str = "standard"
    max_opponents: int = Field(default=5, ge=1, le=20)
    rated: bool = False
    player_token: str | None = None


class JoinRequest(BaseModel):
    name: str = Field(min_length=1, max_length=32)
    player_token: str | None = None


class QuickPlayRequest(BaseModel):
    name: str = Field(min_length=1, max_length=32)
    mode: str = "standard"
    rated: bool = False
    player_token: str | None = None


class PlayerRequest(BaseModel):
    name: str = Field(min_length=1, max_length=32)


@dataclass
class Match:
    board: chess.Board
    guest_token: str
    guest_name: str
    forced_winner: str | None = None
    guest_player_id: str | None = None
    rating_change: dict | None = None
    rating_applied: bool = False
    rating_message: str = ""


@dataclass
class Room:
    code: str
    mode: str
    host_token: str
    host_name: str
    capacity: int
    public: bool = False
    rated: bool = False
    host_player_id: str | None = None
    matches: dict[str, Match] = field(default_factory=dict)
    connections: dict[str, set[WebSocket]] = field(default_factory=dict)
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    last_active: float = field(default_factory=time.monotonic)

    def is_member(self, token: str) -> bool:
        return token == self.host_token or any(
            match.guest_token == token for match in self.matches.values()
        )

    def matching(self, token: str) -> str | None:
        return next(
            (mid for mid, match in self.matches.items()
             if match.guest_token == token), None
        )


rooms: dict[str, Room] = {}
quickplay_lock = asyncio.Lock()


@app.get("/")
def online_client():
    """Serve the same mobile UI on the public chess server for browser guests."""
    return FileResponse(Path(__file__).with_name("client.html"), media_type="text/html")


def new_board(mode: str) -> chess.Board:
    if mode == "chess960":
        return chess.Board.from_chess960_pos(secrets.randbelow(960))
    return BOARD_CLASSES[mode]()


def room_or_404(code: str) -> Room:
    room = rooms.get(code.upper())
    if room is None:
        raise HTTPException(404, "Partie nicht gefunden.")
    return room


def room_details(room: Room) -> dict:
    return {
        "code": room.code, "mode": room.mode, "host_name": room.host_name,
        "guests": len(room.matches), "max_opponents": room.capacity,
        "public": room.public, "rated": room.rated,
        "blind_level": int(room.mode[-1]) if room.mode.startswith("blind") else 0,
    }


@app.get("/api/health")
def health():
    return {
        "ok": True, "active_rooms": len(rooms),
        "rating_storage": "postgresql" if (os.getenv("LONG_TERM_RATING_DATABASE_URL") or os.getenv("RATING_DATABASE_URL")) else "sqlite",
        "rating_storage_durable": bool(os.getenv("LONG_TERM_RATING_DATABASE_URL") or os.getenv("RATING_DATABASE_URL")),
        "rating_storage_long_term": bool(os.getenv("LONG_TERM_RATING_DATABASE_URL")),
        "rating_database_expires_at": None if os.getenv("LONG_TERM_RATING_DATABASE_URL") else os.getenv("RATING_DATABASE_EXPIRES_AT"),
    }


def rated_player(token: str | None):
    player = get_store().player_for_token(token)
    if not player:
        raise HTTPException(401, "Für gewertete Partien zuerst ein Spielerprofil erstellen.")
    return player


@app.post("/api/players")
def register_player(req: PlayerRequest):
    try:
        return get_store().create_player(req.name)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


@app.get("/api/players/me")
def player_profile(authorization: str | None = Header(default=None)):
    token = authorization.removeprefix("Bearer ").strip() if authorization else None
    return rated_player(token)


@app.get("/api/ratings/{player_id}/{mode}")
def read_rating(player_id: str, mode: str):
    if mode not in MODES or mode == "simul":
        raise HTTPException(422, "Keine eigene Wertung für diesen Modus.")
    rating = get_store().get_rating(player_id, mode)
    if rating is None:
        raise HTTPException(404, "Spielerprofil nicht gefunden.")
    return rating



@app.get("/api/modes")
def modes():
    return [{"id": key, "name": name} for key, name in MODES.items()]


@app.post("/api/rooms")
def create_room(req: RoomRequest):
    if req.mode not in MODES:
        raise HTTPException(422, "Unbekannter Spielmodus.")
    if req.rated and req.mode == "simul":
        raise HTTPException(422, "Simultanschach ist nur ungewertet verfügbar.")
    player = rated_player(req.player_token) if req.rated else None
    # Expire inactive in-memory rooms instead of letting abandoned games grow forever.
    now = time.monotonic()
    for old_code, old_room in list(rooms.items()):
        if not old_room.connections and now - old_room.last_active > 24 * 3600:
            del rooms[old_code]
    if len(rooms) >= 1000:
        raise HTTPException(503, "Zu viele offene Partien. Bitte später erneut versuchen.")
    alphabet = string.ascii_uppercase + string.digits
    code = "".join(secrets.choice(alphabet) for _ in range(8))
    while code in rooms:
        code = "".join(secrets.choice(alphabet) for _ in range(8))
    token = secrets.token_urlsafe(32)
    room = Room(
        code, req.mode, token, player["name"] if player else req.name.strip(),
        req.max_opponents if req.mode == "simul" else 1,
        rated=req.rated, host_player_id=player["id"] if player else None,
    )
    rooms[code] = room
    return {**room_details(room), "token": token, "role": "host"}


@app.get("/api/rooms/{code}")
def get_room(code: str):
    return room_details(room_or_404(code))


@app.post("/api/quickplay")
async def quickplay(req: QuickPlayRequest):
    """Pair two anonymous players server-side, or create a short-lived waiting room."""
    if req.mode not in MODES or req.mode == "simul":
        raise HTTPException(422, "Für diesen Modus gibt es keine automatische Gegnersuche.")
    player = rated_player(req.player_token) if req.rated else None
    async with quickplay_lock:
        now = time.monotonic()
        for room in list(rooms.values()):
            if (room.public and room.mode == req.mode and room.rated == req.rated
                    and not room.matches
                    and (not player or room.host_player_id != player["id"])
                    and now - room.last_active < 90
                    and (room.connections.get(room.host_token) or now - room.last_active < 10)):
                async with room.lock:
                    board_id = secrets.token_hex(6)
                    token = secrets.token_urlsafe(32)
                    room.matches[board_id] = Match(
                        new_board(req.mode), token,
                        player["name"] if player else req.name.strip(),
                        guest_player_id=player["id"] if player else None,
                    )
                    room.last_active = now
                    return {**room_details(room), "token": token, "role": "guest",
                            "board_id": board_id, "matched": True}
        if len(rooms) >= 1000:
            raise HTTPException(503, "Zu viele offene Partien.")
        alphabet = string.ascii_uppercase + string.digits
        code = "".join(secrets.choice(alphabet) for _ in range(8))
        while code in rooms:
            code = "".join(secrets.choice(alphabet) for _ in range(8))
        token = secrets.token_urlsafe(32)
        room = Room(
            code, req.mode, token, player["name"] if player else req.name.strip(), 1,
            public=True, rated=req.rated, host_player_id=player["id"] if player else None,
        )
        rooms[code] = room
        return {**room_details(room), "token": token, "role": "host",
                "matched": False}


@app.post("/api/rooms/{code}/join")
async def join_room(code: str, req: JoinRequest):
    room = room_or_404(code)
    player = rated_player(req.player_token) if room.rated else None
    async with room.lock:
        if len(room.matches) >= room.capacity:
            raise HTTPException(409, "Diese Partie ist bereits voll.")
        if player and player["id"] == room.host_player_id:
            raise HTTPException(409, "Eine gewertete Partie gegen dich selbst ist nicht erlaubt.")
        board_id = secrets.token_hex(6)
        token = secrets.token_urlsafe(32)
        room.matches[board_id] = Match(
            new_board(room.mode), token, player["name"] if player else req.name.strip(),
            guest_player_id=player["id"] if player else None,
        )
        room.last_active = time.monotonic()
        return {
            **room_details(room), "token": token,
            "role": "guest", "board_id": board_id,
        }


def snapshot(room: Room, token: str) -> dict:
    host = token == room.host_token
    own_board = room.matching(token) if not host else None
    data = []
    for board_id, match in room.matches.items():
        if not host and board_id != own_board:
            continue
        board = match.board
        outcome = board.outcome(claim_draw=False)
        result = ("1-0" if match.forced_winner == "white" else
                  "0-1" if match.forced_winner == "black" else
                  outcome.result() if outcome else None)
        can_move = (result is None and
                    ((host and board.turn == chess.WHITE) or
                     (not host and board.turn == chess.BLACK)))
        blind5 = room.mode == "blind5"
        data.append({
            "id": board_id, "guest_name": match.guest_name,
            "rated": room.rated,
            "blind_level": int(room.mode[-1]) if room.mode.startswith("blind") else 0,
            "rating_change": match.rating_change,
            "rating_message": match.rating_message,
            "rating": (get_store().get_rating(
                room.host_player_id if host else match.guest_player_id, room.mode
            ) if room.rated else None),
            "opponent_rating": (get_store().get_rating(
                match.guest_player_id if host else room.host_player_id, room.mode
            ) if room.rated else None),
            "fen": ("8/8/8/8/8/8/8/8 w - - 0 1" if blind5 else board.fen()),
            "chess960": board.chess960,
            "turn": "white" if board.turn else "black",
            "can_move": can_move,
            # Complete blindfold stage must not send piece positions or
            # enumerate legal moves. The server still validates every UCI move.
            "moves": ([] if blind5 else
                      [board.uci(move) for move in board.legal_moves] if can_move else []),
            "history": [board.uci(move) for move in board.move_stack],
            "result": result,
            "check": board.is_check(),
        })
    return {
        "type": "state", "room": room_details(room),
        "role": "host" if host else "guest",
        "boards": data, "your_board": own_board,
    }


def record_rating_if_finished(room: Room, board_id: str, match: Match):
    """Run only on server-validated terminal states; never trust a client result."""
    if not room.rated or match.rating_applied:
        return
    result = ("1-0" if match.forced_winner == "white" else
              "0-1" if match.forced_winner == "black" else
              match.board.outcome(claim_draw=False).result()
              if match.board.is_game_over(claim_draw=False) else None)
    if result is None:
        return
    # Abort very short games without changing ratings.
    if len(match.board.move_stack) < 4:
        match.rating_message = "Nicht gewertet: weniger als 4 Halbzüge gespielt."
        match.rating_applied = True
        return
    try:
        match.rating_change = get_store().finish_game(
            f"{room.code}:{board_id}", room.mode,
            room.host_player_id, match.guest_player_id, result,
        )
        match.rating_applied = True
    except Exception:
        # Never invent a successful rating update when DB persistence failed.
        match.rating_message = "Rating konnte nicht gespeichert werden. Bitte Server prüfen."


async def broadcast(room: Room):
    for token, connections in list(room.connections.items()):
        state = snapshot(room, token)
        for ws in list(connections):
            try:
                await ws.send_json(state)
            except Exception:
                connections.discard(ws)
        if not connections:
            room.connections.pop(token, None)


@app.websocket("/ws/{code}/{token}")
async def ws_game(ws: WebSocket, code: str, token: str):
    room = rooms.get(code.upper())
    if room is None or not room.is_member(token):
        await ws.close(code=4403)
        return
    await ws.accept()
    async with room.lock:
        room.connections.setdefault(token, set()).add(ws)
        for board_id, match in room.matches.items():
            record_rating_if_finished(room, board_id, match)
        await broadcast(room)
    try:
        while True:
            msg = await ws.receive_json()
            action = msg.get("type")
            board_id = msg.get("board_id")
            async with room.lock:
                room.last_active = time.monotonic()
                if action == "ping":
                    await ws.send_json({"type": "pong"})
                    continue
                if action not in ("move", "resign"):
                    await ws.send_json({"type": "error", "message": "Unbekannte Aktion."})
                    continue
                match = room.matches.get(board_id)
                if match is None or (token != room.host_token and
                                     token != match.guest_token):
                    await ws.send_json({"type": "error", "message": "Kein Zugriff auf dieses Brett."})
                    continue
                board = match.board
                if match.forced_winner or board.is_game_over(claim_draw=False):
                    await ws.send_json({"type": "error", "message": "Partie beendet."})
                    continue
                host = token == room.host_token
                if action == "resign":
                    match.forced_winner = "black" if host else "white"
                else:
                    if board.turn != host:
                        await ws.send_json({"type": "error", "message": "Nicht am Zug."})
                        continue
                    raw = msg.get("uci")
                    if not isinstance(raw, str) or len(raw) > 8:
                        await ws.send_json({"type": "error", "message": "Ungültige Zugnotation."})
                        continue
                    try:
                        move = board.parse_uci(raw)
                    except (ValueError, AssertionError):
                        await ws.send_json({"type": "error", "message": "Illegaler Zug."})
                        continue
                    if move not in board.legal_moves:
                        await ws.send_json({"type": "error", "message": "Illegaler Zug."})
                        continue
                    board.push(move)
                record_rating_if_finished(room, board_id, match)
                await broadcast(room)
    except (WebSocketDisconnect, RuntimeError, ValueError):
        pass
    finally:
        async with room.lock:
            active = room.connections.get(token)
            if active:
                active.discard(ws)
                if not active:
                    room.connections.pop(token, None)
