#!/usr/bin/env python3
from PIL import Image
import os

# Load the generated sprite
img = Image.open('src/assets/device-icons-sprite.png').convert('RGBA')
pixels = img.load()
width, height = img.size

print(f"Processing image: {width}x{height}")

# 1. Make background transparent
# The user asked for clean white icons. The background is black.
# We will turn black pixels (low brightness) to transparent.
# And ensure the white pixels are actually white.

new_img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
new_pixels = new_img.load()
pixels = img.load()

for y in range(height):
    for x in range(width):
        r, g, b, a = pixels[x, y]
        # Calculate brightness
        brightness = (r + g + b) / 3
        
        if brightness > 50:
            # It's part of an icon. Make it white, use brightness as alpha for anti-aliasing if needed, 
            # but for flat icons, let's keep it simple.
            # If it's somewhat bright, make it full white opque for now.
            new_pixels[x, y] = (255, 255, 255, 255)
        else:
            # Transparent
            new_pixels[x, y] = (0, 0, 0, 0)

# 2. Slice into 5 icons
# We expect 5 horizontal clusters. We'll scan x-columns to find gaps.

def find_segments(image):
    width, height = image.size
    pixels = image.load()
    
    in_segment = False
    segments = []
    start_x = 0
    
    for x in range(width):
        # Check if column has any non-transparent pixel
        has_pixel = False
        for y in range(height):
            if pixels[x, y][3] > 0:
                has_pixel = True
                break
        
        if has_pixel and not in_segment:
            in_segment = True
            start_x = x
        elif not has_pixel and in_segment:
            in_segment = False
            segments.append((start_x, x))
            
    if in_segment:
        segments.append((start_x, width))
        
    return segments

segments = find_segments(new_img)
print(f"Found {len(segments)} segments.")

names = ['mac', 'ipad', 'iphone', 'vision', 'watch']

if len(segments) != 5:
    print("Warning: Did not find exactly 5 segments. Saving raw transparent sprite instead.")
    new_img.save('src/assets/device-icons-transparent.png')
else:
    for i, (start, end) in enumerate(segments):
        # Crop with some padding logic if needed, but strict slice is fine
        icon = new_img.crop((start, 0, end, height))
        # Trim vertical whitespace
        bbox = icon.getbbox()
        if bbox:
            icon = icon.crop(bbox)
        
        # Resize to standard height (e.g. 32px) for consistency? 
        # Or just save as is. Let's save as is, high res.
        
        filename = f'src/assets/icon-{names[i]}.png'
        icon.save(filename)
        print(f"Saved {filename}")

