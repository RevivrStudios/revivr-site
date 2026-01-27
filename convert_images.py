#!/usr/bin/env python3
from PIL import Image

# Convert founder photo from JPEG to PNG
img = Image.open('src/assets/founder-photo.jpg')
img.save('src/assets/founder-photo.png', 'PNG', optimize=True)
print(f"✓ Converted founder-photo.jpg to PNG: {img.size[0]}x{img.size[1]}")
