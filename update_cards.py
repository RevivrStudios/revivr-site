import re

file_path = "trackstash.html"

with open(file_path, "r") as f:
    content = f.read()

# Remove class="hero-media-bg" and its style, replace with standard inline style
# pattern: class="hero-media-bg" style="..."
content = re.sub(
    r'class="hero-media-bg"\s+style="[^"]*"',
    r'style="width: 100%; height: auto; object-fit: cover; border-bottom: 1px solid rgba(255, 255, 255, 0.08);"',
    content
)

# For the div containing the text, remove the gradient and positioning
# pattern: style="padding: 50px; position: relative; z-index: 10; background: linear-gradient(...); border-radius: 0 0 32px 32px;"
# or similar
content = re.sub(
    r'style="padding:\s*\d+px;\s*position:\s*relative;\s*z-index:\s*10;\s*background:\s*linear-gradient[^"]*;\s*border-radius:[^"]*"',
    r'style="padding: 40px; background: #1c1c1e;"',
    content
)

# Fix justify-content: flex-end to flex-start on the bento-cards
content = content.replace('justify-content: flex-end;', 'justify-content: flex-start;')

# Also remove min-height: 480px; as it might look weird with stacked content
content = content.replace('min-height: 480px;', '')

with open(file_path, "w") as f:
    f.write(content)

print("Done updating trackstash.html")
