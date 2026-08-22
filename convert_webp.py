"""Convert heavy homepage-referenced images to WebP.

Originals are kept in place; the redesigned pages reference the .webp copies.
Follows the same Pillow-based pattern as the other scripts in this repo.
"""
from pathlib import Path
from PIL import Image

ASSETS = Path(__file__).parent / "src" / "assets"

# Homepage-referenced images over ~300 KB.
TARGETS = [
    "stareandshare-main.png",
    "quietspace-1.jpg",
    "webxr-mobility.jpg",
    "plantelier-12.jpg",
    "trackstash-splash-dark.png",
    "televisionprompter-2.png",
    "founder-photo.png",
]

MAX_WIDTH = 1200
QUALITY = 82

for name in TARGETS:
    src = ASSETS / name
    if not src.exists():
        print(f"SKIP (missing) {name}")
        continue
    out = src.with_suffix(".webp")
    with Image.open(src) as im:
        im = im.convert("RGB")
        if im.width > MAX_WIDTH:
            ratio = MAX_WIDTH / im.width
            im = im.resize((MAX_WIDTH, round(im.height * ratio)), Image.LANCZOS)
        im.save(out, "WEBP", quality=QUALITY, method=6)
    before = src.stat().st_size
    after = out.stat().st_size
    print(f"{name}: {before/1024:.0f} KB -> {out.name} {after/1024:.0f} KB "
          f"({100 - after/before*100:.0f}% smaller)  [{im.width}x{im.height}]")
