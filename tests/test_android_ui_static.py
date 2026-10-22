"""Static Android chess UI regression checks. Runtime/device tests are separately required."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
JS = (ROOT / "app/src/main/assets/www/analysis.js").read_text(encoding="utf-8")
HTML = (ROOT / "app/src/main/assets/www/index.html").read_text(encoding="utf-8")


class ChessControls(unittest.TestCase):
    def test_primary_game_controls_exist(self):
        for control in ("gameNew", "gameUndo", "gameFlip", "gameAnalyze",
                        "gameResign", "gameOffer", "gameClaim", "gameExport",
                        "v555Undo", "v555Resign", "v555Draw", "v555SetStart"):
            with self.subTest(control=control):
                self.assertRegex(JS, rf'id=["\']{control}["\']')

    def test_buttons_wired(self):
        for binding in ("elem('gameUndo').onclick=undo",
                        "elem('gameResign').onclick=resign",
                        "elem('gameOffer').onclick=offerDraw",
                        "elem('gameClaim').onclick=claimDraw",
                        "elem('v555Undo').onclick=()=>undo()",
                        "elem('v555Resign').onclick=()=>resign()",
                        "elem('v555Draw').onclick=()=>offerDraw()"):
            with self.subTest(binding=binding):
                self.assertIn(binding, JS)

    def test_stockfish_only_bot(self):
        start = JS.index("async function scheduleComputer(){")
        end = JS.index("\nfunction gameNew(){", start)
        bot = JS[start:end]
        self.assertIn("window.analyzeFen", bot)
        self.assertIn("if(!chosen)", bot)
        self.assertNotIn("Math.random()", bot)
        self.assertNotIn("think(pos,", bot)
        self.assertNotIn("v58StyledMove", bot)

    def test_undo_not_disabled_while_engine_thinks(self):
        self.assertIn("elem('gameUndo').disabled=!record.length;", JS)

    def test_offline_variant_selection_honest(self):
        self.assertIn("Diese Variante benötigt eigene Zugregeln", JS)

    def test_review_and_stockfish_assets(self):
        self.assertIn("v560ReviewPerformance", JS)
        self.assertIn("stockfish-local-assets.js", HTML)
        self.assertIn("function initStockfish()", HTML)
        self.assertIn("function analyzeFen(", HTML)

    def test_every_static_button_has_identifier_or_action(self):
        # Only buttons in the initial HTML. Dynamic buttons are checked above.
        for tag in re.findall(r"<button\b[^>]*>", HTML, flags=re.I):
            with self.subTest(button=tag[:110]):
                self.assertTrue(re.search(r"\b(id|onclick|data-[\w-]+)\s*=", tag),
                                f"Button without selector/action: {tag[:140]}")


if __name__ == "__main__":
    unittest.main()
