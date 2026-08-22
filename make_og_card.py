"""Generate public/og-card.png — the Revivr logo centered on the ground color."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).parent
LOGO = ROOT / "src" / "assets" / "revivr-logo-transparent.png"
OUT = ROOT / "public" / "og-card.png"

W, H = 1200, 630
GROUND = (0x0F, 0x14, 0x1D)
LOGO_WIDTH = 620

card = Image.new("RGB", (W, H), GROUND)

with Image.open(LOGO) as logo:
    logo = logo.convert("RGBA")
    logo = logo.crop(logo.getbbox())  # trim transparent padding
    ratio = LOGO_WIDTH / logo.width
    logo = logo.resize((LOGO_WIDTH, round(logo.height * ratio)), Image.LANCZOS)
    card.paste(logo, ((W - logo.width) // 2, (H - logo.height) // 2), logo)

OUT.parent.mkdir(parents=True, exist_ok=True)
card.save(OUT, "PNG", optimize=True)
print(f"wrote {OUT} ({OUT.stat().st_size / 1024:.0f} KB) {card.size}")
