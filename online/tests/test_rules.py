import chess
import chess.variant

from online.server import MODES, new_board, Room, Match, snapshot


def test_every_requested_mode_has_a_board():
    for mode in MODES:
        b = new_board(mode)
        assert isinstance(b, chess.Board)
        assert len(list(b.legal_moves)) > 0


def test_chess960_position_and_bishops():
    for _ in range(10):
        b = new_board("chess960")
        assert b.chess960
        bishops = list(b.pieces(chess.BISHOP, chess.WHITE))
        assert len(bishops) == 2
        assert chess.square_rank(bishops[0]) == 0
        assert bool((chess.square_file(bishops[0]) + chess.square_rank(bishops[0])) % 2) != bool(
            (chess.square_file(bishops[1]) + chess.square_rank(bishops[1])) % 2)


def test_antichess_must_capture():
    b = chess.variant.AntichessBoard()
    b.set_fen("8/8/8/8/8/4p3/3P4/4K2k w - - 0 1")
    moves = [m.uci() for m in b.legal_moves]
    assert "d2e3" in moves
    assert "d2d3" not in moves


def test_crazyhouse_drop():
    b = chess.variant.CrazyhouseBoard()
    b.set_fen("4k3/8/8/8/8/8/8/4K3[N] w - - 0 1")
    assert chess.Move.from_uci("N@e4") in b.legal_moves


def test_simul_has_two_independent_games():
    r = Room("ABCDEFGH", "simul", "host", "Host", 5)
    r.matches["a"] = Match(new_board("simul"), "guest1", "A")
    r.matches["b"] = Match(new_board("simul"), "guest2", "B")
    r.matches["a"].board.push_uci("e2e4")
    host = snapshot(r, "host")
    guest2 = snapshot(r, "guest2")
    assert len(host["boards"]) == 2
    assert guest2["boards"][0]["id"] == "b"
    assert guest2["boards"][0]["history"] == []
    assert host["boards"][0]["turn"] == "black"
