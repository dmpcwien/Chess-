#!/usr/bin/env python3
"""Package pinned Stockfish.js 19 Lite single-thread for Android WebView offline use.

The worker in index.html reads __STOCKFISH_OFFLINE_JS and __STOCKFISH_OFFLINE_WASM_B64.
Uses a single-threaded WASM build because Android file:// WebViews cannot rely on
cross-origin isolation / SharedArrayBuffer.
"""
import base64
import json
import pathlib
import sys

if len(sys.argv) != 4:
    raise SystemExit("Usage: embed_stockfish19.py <engine.js> <engine.wasm> <output.js>")
js_path, wasm_path, output_path = map(pathlib.Path, sys.argv[1:])
js = js_path.read_text(encoding="utf-8")
wasm = wasm_path.read_bytes()
if len(js) < 10_000 or len(wasm) < 100_000 or not wasm.startswith(bytes.fromhex("0061736d")):
    raise SystemExit("Invalid or incomplete Stockfish 19 JS/WASM assets")
if "stockfish" not in js.lower():
    raise SystemExit("Unexpected JS engine file")
output_path.parent.mkdir(parents=True, exist_ok=True)
output_path.write_text(
    "// Generated from npm stockfish@19.0.1; GPL-3.0; do not edit.\n"
    "window.__STOCKFISH_OFFLINE_JS=" + json.dumps(js, ensure_ascii=True) + ";\n"
    "window.__STOCKFISH_OFFLINE_WASM_B64=" +
    json.dumps(base64.b64encode(wasm).decode("ascii")) + ";\n",
    encoding="utf-8",
)
print(f"Embedded Stockfish 19 Lite single-thread: JS={len(js)} WASM={len(wasm)} bytes")
