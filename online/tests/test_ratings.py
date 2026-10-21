"""Glicko-2 correctness, idempotence, identity and integration smoke tests."""
import math
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from online import server
from online.ratings import RatingStore, glicko2_update


def test_official_glicko2_three_game_reference():
    new_rating, rd, sigma = glicko2_update(
        1500, 200, 0.06,
        [(1400, 30, 1.0), (1550, 100, 0.0), (1700, 300, 0.0)]
    )
    assert new_rating == pytest.approx(1464.06, abs=0.03)
    assert rd == pytest.approx(151.52, abs=0.03)
    assert sigma == pytest.approx(0.06, abs=0.0001)


def test_inactivity_only_increases_rd():
    new_rating, new_rd, sigma = glicko2_update(1500, 200, 0.06, [])
    assert new_rating == 1500
    assert new_rd > 200
    assert sigma == 0.06


def test_win_and_draw_update_opponents_simultaneously(tmp_path):
    store = RatingStore(path=tmp_path / "ratings.sqlite3")
    white = store.create_player("Weiß")
    black = store.create_player("Schwarz")
    w_id, b_id = white["id"], black["id"]
    match = store.finish_game("G1", "standard", w_id, b_id, "1-0")
    assert match["white"]["before"] == 1500.0
    assert match["black"]["before"] == 1500.0
    assert match["white"]["after"] > 1500
    assert match["black"]["after"] < 1500
    assert store.get_rating(w_id, "standard")["games"] == 1
    assert store.get_rating(b_id, "standard")["games"] == 1

    # Replaying a completed match must NOT alter ratings again.
    again = store.finish_game("G1", "standard", w_id, b_id, "1-0")
    assert again["already_recorded"] is True
    assert store.get_rating(w_id, "standard")["games"] == 1

    # A separate pool remains untouched and provisional.
    atomic = store.get_rating(w_id, "atomic")
    assert atomic["rating"] == 1500.0 and atomic["games"] == 0

    # Identical initial ratings plus a draw should produce no directional drift.
    a = store.create_player("Alpha")
    b = store.create_player("Beta")
    draw = store.finish_game("G2", "chess960", a["id"], b["id"], "1/2-1/2")
    assert draw["white"]["change"] == 0
    assert draw["black"]["change"] == 0


def test_cannot_rate_against_oneself(tmp_path):
    store = RatingStore(path=tmp_path / "ratings.sqlite3")
    player = store.create_player("Test")
    assert store.player_for_token(player["player_token"])["id"] == player["id"]
    assert store.player_for_token("not-the-token") is None
    with pytest.raises(ValueError):
        store.finish_game("G3", "standard", player["id"], player["id"], "1-0")


@pytest.fixture
def ratings_server(tmp_path, monkeypatch):
    store = RatingStore(path=tmp_path / "server.sqlite3")
    monkeypatch.setattr(server, "get_store", lambda: store)
    server.rooms.clear()
    yield store
    server.rooms.clear()


def test_rated_room_rejects_unknown_identity_and_self_play(ratings_server):
    with TestClient(server.app) as client:
        assert client.post("/api/rooms", json={
            "name": "Fake", "mode": "standard", "rated": True
        }).status_code == 401
        user = client.post("/api/players", json={"name": "Anna"}).json()
        assert client.get("/api/players/me", headers={
            "Authorization": "Bearer " + user["player_token"]
        }).json()["id"] == user["id"]
        room = client.post("/api/rooms", json={
            "name": "Another name", "mode": "standard", "rated": True,
            "player_token": user["player_token"]
        }).json()
        assert room["host_name"] == "Anna"
        assert room["rated"]
        self_join = client.post(f"/api/rooms/{room['code']}/join", json={
            "name": "Me again", "player_token": user["player_token"]
        })
        assert self_join.status_code == 409


def test_rated_websocket_result_recorded_once(ratings_server):
    with TestClient(server.app) as client:
        alice = client.post("/api/players", json={"name": "Alice"}).json()
        bob = client.post("/api/players", json={"name": "Bob"}).json()
        room = client.post("/api/rooms", json={
            "name": "Alice", "mode": "standard", "rated": True,
            "player_token": alice["player_token"],
        }).json()
        guest = client.post(f"/api/rooms/{room['code']}/join", json={
            "name": "Bob", "player_token": bob["player_token"],
        }).json()
        code, board_id = room["code"], guest["board_id"]
        with client.websocket_connect(f"/ws/{code}/{room['token']}") as host_ws:
            host_ws.receive_json()
            with client.websocket_connect(f"/ws/{code}/{guest['token']}") as guest_ws:
                host_ws.receive_json()
                guest_ws.receive_json()
                for i, uci in enumerate(["e2e4", "e7e5", "g1f3", "b8c6"]):
                    (host_ws if i % 2 == 0 else guest_ws).send_json(
                        {"type": "move", "board_id": board_id, "uci": uci}
                    )
                    host_ws.receive_json()
                    guest_ws.receive_json()
                host_ws.send_json({"type": "resign", "board_id": board_id})
                white = host_ws.receive_json()["boards"][0]
                black = guest_ws.receive_json()["boards"][0]
                assert white["result"] == "0-1"
                assert white["rating_change"]["white"]["change"] < 0
                assert black["rating_change"]["black"]["change"] > 0
                assert white["rating"]["games"] == 1
                assert black["rating"]["games"] == 1
                # Same match cannot change values again even if finalized twice.
                server.record_rating_if_finished(server.rooms[code], board_id, server.rooms[code].matches[board_id])
                assert ratings_server.get_rating(alice["id"], "standard")["games"] == 1


def test_short_rated_game_does_not_change_rating(ratings_server):
    a = ratings_server.create_player("A")
    b = ratings_server.create_player("B")
    r = server.Room("ABCDEFGH", "standard", "host", "A", 1, rated=True, host_player_id=a["id"])
    m = server.Match(server.new_board("standard"), "guest", "B", guest_player_id=b["id"])
    r.matches["x"] = m
    m.forced_winner = "white"
    server.record_rating_if_finished(r, "x", m)
    assert "Nicht gewertet" in m.rating_message
    assert ratings_server.get_rating(a["id"], "standard")["games"] == 0
