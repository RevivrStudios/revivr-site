#!/usr/bin/env python3
from PIL import Image

# Load the AI GENERATED Vision Pro logo (Version 11 - Straight On Perspective)
img = Image.open('src/assets/revivr-vision-logo-gen-v11.png')

# Convert to RGBA
img = img.convert('RGBA')

# Get pixel data
pixels = img.load()
width, height = img.size

# Make black/dark-gray pixels transparent
threshold = 15

for y in range(height):
    for x in range(width):
        r, g, b, a = pixels[x, y]
        # If pixel is very dark, make it transparent
        if r < threshold and g < threshold and b < threshold:
            pixels[x, y] = (0, 0, 0, 0)

# Save as PNG
img.save('src/assets/revivr-vision-logo-clean-v11.png', 'PNG', optimize=True)
print(f"✓ Created transparent AI logo v11: {width}x{height}")

