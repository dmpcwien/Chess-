"""End-to-end API and WebSocket tests for online multiplayer."""
import asyncio

from fastapi.testclient import TestClient

from online.server import QuickPlayRequest, app, quickplay, rooms


def test_random_matchmaking_pairs_players():
    rooms.clear()

    async def pair():
        first = await quickplay(QuickPlayRequest(name="Alice", mode="atomic"))
        second = await quickplay(QuickPlayRequest(name="Bob", mode="atomic"))
        return first, second

    first, second = asyncio.run(pair())
    assert first["role"] == "host" and not first["matched"]
    assert second["role"] == "guest" and second["matched"]
    assert second["code"] == first["code"]
    assert len(rooms[first["code"]].matches) == 1
    rooms.clear()


def test_server_rejects_illegal_and_out_of_turn_moves():
    rooms.clear()
    with TestClient(app) as client:
        host = client.post("/api/rooms", json={"name": "Alice", "mode": "standard"}).json()
        guest = client.post(
            f"/api/rooms/{host['code']}/join", json={"name": "Bob"}
        ).json()
        board_id = guest["board_id"]
        with client.websocket_connect(f"/ws/{host['code']}/{host['token']}") as host_ws:
            host_ws.receive_json()  # Host waiting for an opponent connection
            with client.websocket_connect(f"/ws/{host['code']}/{guest['token']}") as guest_ws:
                host_state = host_ws.receive_json()
                guest_state = guest_ws.receive_json()
                assert host_state["boards"][0]["id"] == board_id
                assert not guest_state["boards"][0]["moves"]

                guest_ws.send_json({"type": "move", "board_id": board_id, "uci": "e7e5"})
                assert guest_ws.receive_json()["type"] == "error"

                host_ws.send_json({"type": "move", "board_id": board_id, "uci": "e2e5"})
                assert host_ws.receive_json()["type"] == "error"

                host_ws.send_json({"type": "move", "board_id": board_id, "uci": "e2e4"})
                after_white = host_ws.receive_json()
                after_black = guest_ws.receive_json()
                assert after_white["boards"][0]["history"] == ["e2e4"]
                assert "e7e5" in after_black["boards"][0]["moves"]
    rooms.clear()


def test_unrated_online_time_gift_is_server_authorized_and_synced():
    rooms.clear()
    with TestClient(app) as client:
        host = client.post("/api/rooms", json={"name": "Alice", "mode": "standard", "rated": False}).json()
        guest = client.post(f"/api/rooms/{host['code']}/join", json={"name": "Bob"}).json()
        bid = guest["board_id"]
        with client.websocket_connect(f"/ws/{host['code']}/{host['token']}") as host_ws:
            host_ws.receive_json()
            with client.websocket_connect(f"/ws/{host['code']}/{guest['token']}") as guest_ws:
                host_ws.receive_json()
                guest_ws.receive_json()
                host_ws.send_json({"type": "gift_time", "board_id": bid})
                a = host_ws.receive_json()
                b = guest_ws.receive_json()
                assert a["boards"][0]["gifted_seconds"] == {"white": 0, "black": 15}
                assert b["boards"][0]["gifted_seconds"] == {"white": 0, "black": 15}
                guest_ws.send_json({"type": "gift_time", "board_id": bid})
                assert guest_ws.receive_json()["boards"][0]["gifted_seconds"] == {"white": 15, "black": 15}
                assert host_ws.receive_json()["boards"][0]["gifted_seconds"] == {"white": 15, "black": 15}
    rooms.clear()


def test_rated_online_time_gift_is_rejected():
    rooms.clear()
    with TestClient(app) as client:
        alice = client.post("/api/players", json={"name": "Alice"}).json()
        bob = client.post("/api/players", json={"name": "Bob"}).json()
        host = client.post("/api/rooms", json={"name": "Alice", "mode": "standard", "rated": True, "player_token": alice["token"]}).json()
        assert "code" in host, host
        guest = client.post(f"/api/rooms/{host['code']}/join", json={"name": "Bob", "player_token": bob["token"]}).json()
        assert "board_id" in guest, guest
        bid = guest["board_id"]
        with client.websocket_connect(f"/ws/{host['code']}/{host['token']}") as host_ws:
            host_ws.receive_json()
            with client.websocket_connect(f"/ws/{host['code']}/{guest['token']}") as guest_ws:
                host_ws.receive_json()
                guest_ws.receive_json()
                host_ws.send_json({"type": "gift_time", "board_id": bid})
                error = host_ws.receive_json()
                assert error["type"] == "error"
                assert rooms[host["code"]].matches[bid].gifted_seconds_black == 0
    rooms.clear()
