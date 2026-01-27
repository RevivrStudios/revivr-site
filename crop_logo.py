#!/usr/bin/env python3
from PIL import Image

# Use the current live logo
input_path = 'src/assets/revivr-vision-logo-clean-v11.png'
output_path = 'src/assets/revivr-vision-logo-clean-v11.png'

img = Image.open(input_path)
print(f"Original size: {img.size}")

# Get valid pixels box
bbox = img.getbbox()

if bbox:
    # Crop to the bounding box
    cropped_img = img.crop(bbox)
    print(f"New size: {cropped_img.size}")
    cropped_img.save(output_path, 'PNG', optimize=True)
    print("✓ Cropped transparency!")
else:
    print("Image is empty?")
