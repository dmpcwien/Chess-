"""Five blindfold chess stages and rated/unrated online matching."""
from pathlib import Path

import chess
from fastapi.testclient import TestClient

from online import server
from online.ratings import RatingStore


def test_all_five_blindfold_variants_use_standard_chess_rules():
    for level in range(1, 6):
        mode = f"blind{level}"
        assert mode in server.MODES
        board = server.new_board(mode)
        assert isinstance(board, chess.Board)
        assert board.fen() == chess.Board().fen()
        assert board.legal_moves.count() == 20


def test_room_pins_blind_level_and_rating_before_start(tmp_path, monkeypatch):
    store = RatingStore(path=tmp_path / "blind.sqlite3")
    monkeypatch.setattr(server, "get_store", lambda: store)
    server.rooms.clear()
    with TestClient(server.app) as client:
        player_a = client.post("/api/players", json={"name": "A"}).json()
        player_b = client.post("/api/players", json={"name": "B"}).json()
        room = client.post("/api/rooms", json={
            "name": "A", "mode": "blind4", "rated": True,
            "player_token": player_a["player_token"],
        }).json()
        assert room["rated"] is True
        assert room["blind_level"] == 4
        assert client.get(f"/api/rooms/{room['code']}").json()["rated"] is True
        b = client.post(f"/api/rooms/{room['code']}/join", json={
            "name": "B", "player_token": player_b["player_token"]
        }).json()
        with client.websocket_connect(f"/ws/{room['code']}/{room['token']}") as ws:
            message = ws.receive_json()
            board = message["boards"][0]
            assert board["rated"] and board["blind_level"] == 4
            assert "e2e4" in board["moves"]
        assert b["rated"] is True
        assert store.get_rating(player_a["id"], "blind4")["rating"] == 1500.0
        assert store.get_rating(player_a["id"], "standard")["games"] == 0
    server.rooms.clear()


def test_unrated_blindfold_games_do_not_affect_ratings(tmp_path, monkeypatch):
    store = RatingStore(path=tmp_path / "blind.sqlite3")
    monkeypatch.setattr(server, "get_store", lambda: store)
    server.rooms.clear()
    with TestClient(server.app) as client:
        room = client.post("/api/rooms", json={
            "name": "A", "mode": "blind5", "rated": False
        }).json()
        guest = client.post(f"/api/rooms/{room['code']}/join", json={"name": "B"}).json()
        match = server.rooms[room["code"]].matches[guest["board_id"]]
        for move in ("e2e4","e7e5","g1f3","b8c6"):
            match.board.push_uci(move)
        match.forced_winner = "white"
        server.record_rating_if_finished(server.rooms[room["code"]], guest["board_id"], match)
        assert match.rating_change is None
        assert room["blind_level"] == 5 and room["rated"] is False
    server.rooms.clear()




def test_level_five_hides_server_side_board_details(tmp_path, monkeypatch):
    store = RatingStore(path=tmp_path / "stage5.sqlite3")
    monkeypatch.setattr(server, "get_store", lambda: store)
    server.rooms.clear()
    with TestClient(server.app) as client:
        room = client.post("/api/rooms", json={
            "name": "A", "mode": "blind5", "rated": False
        }).json()
        client.post(f"/api/rooms/{room['code']}/join", json={"name": "B"})
        with client.websocket_connect(f"/ws/{room['code']}/{room['token']}") as ws:
            state = ws.receive_json()
            board = state["boards"][0]
            assert board["blind_level"] == 5
            assert board["can_move"] is True
            assert board["moves"] == []
            assert board["fen"].startswith("8/8/8/8/8/8/8/8")
    server.rooms.clear()


def test_client_has_five_blind_modes_without_piece_leaks():
    source = (Path(__file__).resolve().parents[1] / "client.html").read_text("utf-8")
    for level in range(1, 6):
        assert f'"blind{level}"' in source
    assert "function blindVisibility" in source
    assert 'cell.setAttribute("aria-label","Feld "+sq)' in source
    assert 'cell.title=sq;' in source
    assert 'if(level===5)return "empty";' in source
    assert "function updateRatedState" in source
    assert "Die Einladung ist GEWERTET" in source
    assert "if(b.blind_level===5)" in source
