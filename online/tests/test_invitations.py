"""Shareable chess invitations: QR generation, room links and privacy."""
import re

from fastapi.testclient import TestClient
from online.server import app, rooms


def test_private_room_has_svg_qr_and_no_player_token():
    rooms.clear()
    with TestClient(app) as client:
        response = client.post("/api/rooms", json={"name":"Host","mode":"standard"})
        assert response.status_code == 200
        room = response.json()
        code = room["code"]
        response = client.get(f"/api/rooms/{code}/qr.svg")
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("image/svg+xml")
        assert b"<svg" in response.content
        assert room["token"].encode() not in response.content
        assert "no-store" in response.headers.get("cache-control", "")
        guest = client.post(f"/api/rooms/{code}/join", json={"name":"Gast"})
        assert guest.status_code == 200
        assert guest.json()["code"] == code
    rooms.clear()


def test_qr_invite_rejects_unknown_room():
    rooms.clear()
    with TestClient(app) as client:
        assert client.get("/api/rooms/ABCDEFGH/qr.svg").status_code == 404


def test_online_client_supports_qr_scan_code_and_link():
    from pathlib import Path
    html = (Path(__file__).resolve().parents[1] / "client.html").read_text("utf-8")
    for name in ("scanInvite", "pasteInvite", "inviteQr", "copyLink", "shareLink", "qrScanner"):
        assert f'id="{name}"' in html
    assert "BarcodeDetector" in html
    assert 'searchParams.get("invite")' in html
    assert "codeFromInvite" in html
    assert "invitationUrl(session.code)" in html
