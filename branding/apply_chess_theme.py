#!/usr/bin/env python3
"""Add optional black-metal/gold chessboard skin to the legacy offline app.

Only style, saved theme preference and a selector are injected. The original
tactics JS, puzzle history and piece assets stay unchanged.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "app/src/main/assets/www/index.html"
assert INDEX.exists(), "Legacy offline chess index.html missing"
html = INDEX.read_text("utf-8")

START = "<!-- chess1001-metal-theme-start -->"
END = "<!-- chess1001-metal-theme-end -->"
if START in html:
    before = html.index(START)
    after = html.index(END, before) + len(END)
    html = html[:before] + html[after:]

SELECTOR = """<!-- chess1001-board-theme-picker -->
<div class="chess1001-board-theme-picker">
  <label for="chess1001-board-theme">♟ Brett &amp; Figuren</label>
  <select id="chess1001-board-theme" aria-label="Design für Brett und Figuren">
    <option value="gold-metal">Gold &amp; Schwarzmetall</option>
    <option value="classic">Klassisch</option>
  </select>
</div>"""

if 'id="chess1001-board-theme"' not in html:
    anchor = '<div class="board" id="board">'
    assert anchor in html, "Legacy board anchor changed; cannot inject theme safely"
    html = html.replace(anchor, SELECTOR + "\n" + anchor, 1)

SKIN = """
<!-- chess1001-metal-theme-start -->
<style id="chess1001-metal-css">
.chess1001-board-theme-picker{
  display:flex;align-items:center;justify-content:space-between;gap:8px;
  padding:4px 4px 11px;color:var(--muted,#cab58d);font-size:13px;
}
.chess1001-board-theme-picker label{font-weight:700}
.chess1001-board-theme-picker select{
  max-width:64%;min-width:0;min-height:39px;
  padding:7px 10px;border:1px solid #926d3c;border-radius:10px;
  background:#1d1c1c;color:#f5d58e;font:inherit;
}
html[data-chess-theme="gold-metal"]{
  --light:#d3a358;--dark:#171a1f;--accent:#e7bb66;
  --hint:#0bbeb0;--sel:#4adddf;
}
html[data-chess-theme="gold-metal"] body{
  background:radial-gradient(ellipse at top,#302519,#0d0f14 72%)!important;
}
html[data-chess-theme="gold-metal"] .board{
  border:3px solid #c09043;
  outline:2px solid #24180c;
  box-shadow:0 0 0 5px #372719,0 8px 25px #000b;
}
html[data-chess-theme="gold-metal"] .sq.light{
  background:
    linear-gradient(140deg,#fff9d446,#fff0bc00 48%,#43210248 95%),
    repeating-linear-gradient(96deg,#ffffff1f 0px,#8d5b101c 2px,#ffffff0e 4px),
    linear-gradient(135deg,#ac782e,#f8d889 48%,#b67a2b);
}
html[data-chess-theme="gold-metal"] .sq.dark{
  background:
    linear-gradient(135deg,#ffffff24 0%,#ffffff00 34%,#00000077 97%),
    repeating-linear-gradient(132deg,#292e36 0px,#101116 3px,#21242b 7px);
}
html[data-chess-theme="gold-metal"] .sq{
  box-shadow:inset 0 1px 0 #fff2ca21,inset 1px 0 0 #f6e3b60f;
}
html[data-chess-theme="gold-metal"] .sq.selected{
  box-shadow:inset 0 0 0 4px #20d8df,inset 0 0 14px #47e5ee;
}
/* Original SVG silhouettes retain their identities; metallic color is a visual filter. */
html[data-chess-theme="gold-metal"] .pieceImg[src*="/w"]{
  filter:sepia(1) saturate(2.8) hue-rotate(-12deg) contrast(1.15)
    drop-shadow(1px 1px 1px #2b1a0c) drop-shadow(-1px 0 1px #0009)!important;
}
html[data-chess-theme="gold-metal"] .pieceImg[src*="/b"]{
  filter:brightness(.78) contrast(1.6)
    drop-shadow(-1px -1px 0 #e6bc6f) drop-shadow(1px 1px 0 #bb8740)
    drop-shadow(0 2px 2px #000c)!important;
}
html[data-chess-theme="gold-metal"] .sq .coord{
  color:#37230f;text-shadow:none;font-weight:800;
}
html[data-chess-theme="gold-metal"] .sq.dark .coord{
  color:#e6c27b;
}
</style>
<script>
(function(){
 "use strict";
 const KEY="chess1001_board_theme";
 const picker=document.getElementById("chess1001-board-theme");
 if(!picker)return;
 function apply(v){
   const theme=v==="classic"?"classic":"gold-metal";
   document.documentElement.setAttribute("data-chess-theme",theme);
   picker.value=theme;
   try{localStorage.setItem(KEY,theme);}catch(_){}
 }
 let saved="gold-metal";
 try{saved=localStorage.getItem(KEY)||saved;}catch(_){}
 picker.addEventListener("change",function(){apply(picker.value);});
 apply(saved);
})();
</script>
<!-- chess1001-metal-theme-end -->
"""

assert "</body>" in html, "Closing </body> missing in offline chess HTML"
html=html.replace("</body>", SKIN + "\n</body>", 1)
INDEX.write_text(html,"utf-8")
print("Chess 1001 offline: switchable gold/black metal board and piece styling installed")
