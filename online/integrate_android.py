#!/usr/bin/env python3
"""Integrate the separate online chess UI into the existing Schach1001 Android WebView APK.
Safe to re-run. Invoked after extraction of the legacy tar archive in GitHub Actions.
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "app/src/main/assets/www"
INDEX = WEB / "index.html"
ONLINE = ROOT / "online/client.html"
GRADLE = ROOT / "app/build.gradle"

assert INDEX.is_file(), "Bundled Schach-1001-Pro app/index.html was not extracted"
assert ONLINE.is_file(), "online/client.html is missing"
assert GRADLE.is_file(), "Android Gradle configuration is missing"

# Copy the full standalone mobile UI into the bundled assets.
(WEB / "online.html").write_text(ONLINE.read_text(encoding="utf-8"), encoding="utf-8")

# An unobtrusive launcher on the original app's home view. Keep all old JS/CSS untouched.
start_mark = "<!-- chess1001-online-launcher-start -->"
end_mark = "<!-- chess1001-online-launcher-end -->"
inject = """<!-- chess1001-online-launcher-start -->
<style>
#chess1001-online-shortcut{
 position:fixed!important;z-index:2147483000!important;right:12px!important;
 bottom:calc(16px + env(safe-area-inset-bottom,0px))!important;
 padding:10px 14px!important;border-radius:999px!important;
 border:1px solid #f2c772!important;background:#252c34!important;
 color:#ffe3a5!important;font:700 14px system-ui,sans-serif!important;
 box-shadow:0 3px 19px #0009!important;line-height:1.25!important;
 min-height:45px!important;cursor:pointer!important;
}
#chess1001-online-shortcut:focus-visible{outline:3px solid #f2c772!important}
</style>
<button id="chess1001-online-shortcut" type="button" aria-label="Online-Schach und Varianten öffnen">🌐 Online</button>
<script>
(function(){
  "use strict";
  var button=document.getElementById("chess1001-online-shortcut");
  if(button)button.addEventListener("click",function(){location.assign("online.html");});
})();
</script>
<!-- chess1001-online-launcher-end -->"""
page = INDEX.read_text(encoding="utf-8")
if start_mark in page:
    a = page.index(start_mark)
    b = page.index(end_mark, a) + len(end_mark)
    page = page[:a] + page[b:]
if "</body>" in page:
    page = page.replace("</body>", inject + "\n</body>", 1)
else:
    page += "\n" + inject + "\n"
INDEX.write_text(page, encoding="utf-8")

# Increase versionCode above the old repository's hard-coded value 1.
gradle = GRADLE.read_text(encoding="utf-8")
gradle, code_changes = re.subn(r"(?m)^[ \t]*versionCode[ \t]+\d+[ \t]*$", "        versionCode 630000", gradle, count=1)
gradle, name_changes = re.subn(r"(?m)^[ \t]*versionName[ \t]+['\"][^'\"]*['\"][ \t]*$", "        versionName '6.3.0-metal-board'", gradle, count=1)
assert code_changes == 1 and name_changes == 1, "Could not update Android version metadata"

# Do not commit key material. A release is signable only if 4 environment variables
# are provided by GitHub Actions, including an on-runner keystore file path.
if "SCHACH_ONLINE_RELEASE_SIGNING" not in gradle:
    gradle += """
// SCHACH_ONLINE_RELEASE_SIGNING
if (System.getenv('CHESS_SIGNING_STORE_PATH') &&
    System.getenv('CHESS_SIGNING_STORE_PASSWORD') &&
    System.getenv('CHESS_SIGNING_ALIAS') &&
    System.getenv('CHESS_SIGNING_KEY_PASSWORD')) {
    android {
        signingConfigs {
            onlineRelease {
                storeFile file(System.getenv('CHESS_SIGNING_STORE_PATH'))
                storePassword System.getenv('CHESS_SIGNING_STORE_PASSWORD')
                keyAlias System.getenv('CHESS_SIGNING_ALIAS')
                keyPassword System.getenv('CHESS_SIGNING_KEY_PASSWORD')
            }
        }
        buildTypes {
            release {
                signingConfig signingConfigs.onlineRelease
            }
        }
    }
}
"""
GRADLE.write_text(gradle, encoding="utf-8")
print("Online-Modul integriert: www/online.html und Navigation in index.html")
print("App-Version auf 6.3.0-metal-board / code 620001 aktualisiert.")
print("Alte Spieloberfläche, Java-Activity und lokale Daten bleiben im APK unberührt.")
