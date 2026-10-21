#!/usr/bin/env python3
"""Install the user-approved gold chess knight as the Android launcher icon.

Runs AFTER the legacy Android project is extracted in GitHub Actions.
The approved image is stored losslessly as base64 text for the GitHub connector;
the encoded source uses WebP compression, while launcher assets are PNG.
No other app artwork or local player data is modified.
"""
from __future__ import annotations

import base64
from io import BytesIO
from pathlib import Path
import re

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "app/src/main"
RES = APP / "res"
MANIFEST = APP / "AndroidManifest.xml"
SOURCE = ROOT / "branding/golden_knight.webp.base64"

if not (SOURCE.is_file() and MANIFEST.is_file()):
    raise FileNotFoundError("App Icon: AndroidManifest.xml or approved image missing")

raw = base64.b64decode(SOURCE.read_text("ascii").strip(), validate=True)
with Image.open(BytesIO(raw)) as original:
    if original.width != original.height or original.width < 192:
        raise ValueError("App Icon: must be at least 192x192 square")
    image = original.convert("RGB")

# Remove old resources bearing the *same names*, especially anydpi adaptive
# XML overrides which otherwise take precedence over the replacement PNGs.
for folder in RES.glob("mipmap*"):
    if folder.is_dir():
        for name in ("ic_launcher.*", "ic_launcher_round.*"):
            for obsolete in folder.glob(name):
                if obsolete.is_file():
                    obsolete.unlink()

for density, px in (
    ("mdpi", 48),
    ("hdpi", 72),
    ("xhdpi", 96),
    ("xxhdpi", 144),
    ("xxxhdpi", 192),
):
    folder = RES / f"mipmap-{density}"
    folder.mkdir(parents=True, exist_ok=True)
    img = image.resize((px, px), Image.Resampling.LANCZOS)
    for filename in ("ic_launcher.png", "ic_launcher_round.png"):
        img.save(folder / filename, format="PNG", optimize=True)

# Preserve the AndroidManifest's package, activities, features and permissions.
xml = MANIFEST.read_text("utf-8")
match = re.search(r"<application\b[^>]*>", xml, flags=re.DOTALL)
if not match:
    raise ValueError("App Icon: no <application> tag found in AndroidManifest.xml")
tag = match.group(0)
for attribute, resource in (
    ("android:icon", "@mipmap/ic_launcher"),
    ("android:roundIcon", "@mipmap/ic_launcher_round"),
):
    pattern = rf'(?<![\w:]){re.escape(attribute)}\s*=\s*["\'][^"\']*["\']'
    replacement = f'{attribute}="{resource}"'
    if re.search(pattern, tag):
        tag = re.sub(pattern, lambda _m: replacement, tag, count=1)
    else:
        tag = tag[:-1] + " " + replacement + ">"
xml = xml[:match.start()] + tag + xml[match.end():]
MANIFEST.write_text(xml, "utf-8")

print("Premium Gold Knight Android launcher icon installed in 5 densities.")
print("Manifest icon/roundIcon updated. Existing app components unchanged.")
