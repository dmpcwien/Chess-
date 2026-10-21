"""Protect Android file:// startup and authenticated API CORS integration."""
from pathlib import Path

from fastapi.testclient import TestClient

from online.server import app


def test_android_html_initializes_after_glicko_state():
    page = (Path(__file__).resolve().parents[1] / "client.html").read_text("utf-8")
    assert 'id="rated"' in page
    assert 'id="matchRating"' in page
    assert "https://schach-1001-online.onrender.com" in page
    # Earlier builds executed rule() before profileKey and ratingRefresh existed,
    # causing a TDZ ReferenceError on first open. Keep initializers first.
    assert page.index("const profileKey") < page.rfind("\nrule();")
    assert page.index("let ratingRefresh") < page.rfind("\nrule();")


def test_local_android_webview_can_authorize_profile_request():
    with TestClient(app) as client:
        response = client.options("/api/players/me", headers={
            "Origin": "null",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        })
    assert response.status_code == 200
    assert "authorization" in response.headers["access-control-allow-headers"].lower()


def test_gold_black_metal_board_is_optional_and_saved():
    page = (Path(__file__).resolve().parents[1] / "client.html").read_text("utf-8")
    assert 'data-chess-theme="gold-metal"' in page
    assert 'id="boardTheme"' in page and 'id="gameBoardTheme"' in page
    assert "chess1001_board_theme" in page
    assert "Gold &amp; Schwarzmetall" in page
    assert ".piece-gold" in page and ".piece-obsidian" in page
    assert 'if(visible==="normal"&&p)' in page
    assert "setBoardTheme(localStorage.getItem(themeKey)||\"gold-metal\");" in page
