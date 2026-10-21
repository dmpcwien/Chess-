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

import chess
import chess.variant
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

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
}
app = FastAPI(title="Schach 1001+ Pro Online", version="0.1.0")
origins = [s.strip() for s in os.getenv("ONLINE_ALLOW_ORIGINS", "*").split(",")]
app.add_middleware(
    CORSMiddleware, allow_origins=origins, allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"], allow_credentials=False,
)


class RoomRequest(BaseModel):
    name: str = Field(min_length=1, max_length=32)
    mode: str = "standard"
    max_opponents: int = Field(default=5, ge=1, le=20)


class JoinRequest(BaseModel):
    name: str = Field(min_length=1, max_length=32)


class QuickPlayRequest(BaseModel):
    name: str = Field(min_length=1, max_length=32)
    mode: str = "standard"


@dataclass
class Match:
    board: chess.Board
    guest_token: str
    guest_name: str
    forced_winner: str | None = None


@dataclass
class Room:
    code: str
    mode: str
    host_token: str
    host_name: str
    capacity: int
    public: bool = False
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
        "public": room.public,
    }


@app.get("/api/health")
def health():
    return {"ok": True, "active_rooms": len(rooms)}


@app.get("/api/modes")
def modes():
    return [{"id": key, "name": name} for key, name in MODES.items()]


@app.post("/api/rooms")
def create_room(req: RoomRequest):
    if req.mode not in MODES:
        raise HTTPException(422, "Unbekannter Spielmodus.")
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
        code, req.mode, token, req.name.strip(),
        req.max_opponents if req.mode == "simul" else 1,
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
    async with quickplay_lock:
        now = time.monotonic()
        for room in list(rooms.values()):
            if (room.public and room.mode == req.mode and not room.matches
                    and now - room.last_active < 90):
                async with room.lock:
                    board_id = secrets.token_hex(6)
                    token = secrets.token_urlsafe(32)
                    room.matches[board_id] = Match(new_board(req.mode), token, req.name.strip())
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
        room = Room(code, req.mode, token, req.name.strip(), 1, public=True)
        rooms[code] = room
        return {**room_details(room), "token": token, "role": "host",
                "matched": False}


@app.post("/api/rooms/{code}/join")
async def join_room(code: str, req: JoinRequest):
    room = room_or_404(code)
    async with room.lock:
        if len(room.matches) >= room.capacity:
            raise HTTPException(409, "Diese Partie ist bereits voll.")
        board_id = secrets.token_hex(6)
        token = secrets.token_urlsafe(32)
        room.matches[board_id] = Match(new_board(room.mode), token, req.name.strip())
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
        data.append({
            "id": board_id, "guest_name": match.guest_name,
            "fen": board.fen(), "chess960": board.chess960,
            "turn": "white" if board.turn else "black",
            "moves": [board.uci(move) for move in board.legal_moves] if can_move else [],
            "history": [board.uci(move) for move in board.move_stack],
            "result": result,
            "check": board.is_check(),
        })
    return {
        "type": "state", "room": room_details(room),
        "role": "host" if host else "guest",
        "boards": data, "your_board": own_board,
    }


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
