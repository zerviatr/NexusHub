build/
├── icons/
│   ├── icon.ico        ← Windows (multi-size .ico: 16/32/48/64/128/256px)
│   ├── icon.icns       ← macOS (Apple Icon Image format)
│   └── icon.png        ← Linux + fallback (512×512 PNG, must be square)
├── installer/
│   ├── installer-sidebar.bmp  ← NSIS sidebar (164×314px, 24-bit BMP)
│   └── dmg-background.png     ← macOS DMG background (660×400px)
├── entitlements.mac.plist     ← macOS Hardened Runtime permissions ✅
└── license.txt                ← NSIS license agreement page ✅

HOW TO GENERATE ICONS
─────────────────────

Option A — from a single 1024×1024 PNG source image (recommended):

  Windows .ico:
    Use https://www.icoconverter.com or ImageMagick:
    magick convert icon-1024.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico

  macOS .icns:
    On macOS only (requires Xcode command line tools):
    mkdir nexushub.iconset
    sips -z 16 16     icon-1024.png --out nexushub.iconset/icon_16x16.png
    sips -z 32 32     icon-1024.png --out nexushub.iconset/icon_16x16@2x.png
    sips -z 32 32     icon-1024.png --out nexushub.iconset/icon_32x32.png
    sips -z 64 64     icon-1024.png --out nexushub.iconset/icon_32x32@2x.png
    sips -z 128 128   icon-1024.png --out nexushub.iconset/icon_128x128.png
    sips -z 256 256   icon-1024.png --out nexushub.iconset/icon_128x128@2x.png
    sips -z 256 256   icon-1024.png --out nexushub.iconset/icon_256x256.png
    sips -z 512 512   icon-1024.png --out nexushub.iconset/icon_256x256@2x.png
    sips -z 512 512   icon-1024.png --out nexushub.iconset/icon_512x512.png
    cp icon-1024.png nexushub.iconset/icon_512x512@2x.png
    iconutil -c icns nexushub.iconset -o icon.icns

  Cross-platform (no macOS required):
    Use https://cloudconvert.com/png-to-icns
    or npm install -g png2icons → png2icons icon-1024.png output -icns

Option B — online services:
  https://www.electron-icon-builder.com (free, electron-specific)
  https://icon.kitchen (free, generates all formats)
