#!/usr/bin/env python3
from PIL import Image

# Load the VisionMark screenshot
img = Image.open('/Users/einarjohnson/.gemini/antigravity/brain/e51f85ea-f241-4405-9d3f-c6513a72071f/uploaded_media_1769287866163.png')
width, height = img.size

print(f"Original size: {width}x{height}")

# Adjust crop to show more of the bottom and less of the top
# Moving the crop window down to capture the full menu
left = int(width * 0.25)
top = int(height * 0.25)  # Start lower (was 0.15)
right = int(width * 0.75)
bottom = int(height * 0.80)  # Extend further down (was 0.70)

cropped = img.crop((left, top, right, bottom))

# Save the cropped version
cropped.save('src/assets/visionmark-thumbnail.png', 'PNG', optimize=True)
print(f"✓ Created VisionMark thumbnail: {cropped.size[0]}x{cropped.size[1]}")
