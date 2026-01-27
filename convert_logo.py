#!/usr/bin/env python3
from PIL import Image

# Convert the high-res logo from JPEG to PNG for better quality
img = Image.open('src/assets/revivr-logo-hires.jpg')
img.save('src/assets/revivr-logo-hires.png', 'PNG', optimize=True)
print(f"✓ Converted logo to PNG: {img.size[0]}x{img.size[1]}")
