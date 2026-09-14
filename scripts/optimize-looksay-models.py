"""Repack embedded PNG textures without changing model geometry or dimensions."""
import io
import json
import pathlib
import struct
from PIL import Image

for path in [*pathlib.Path('public/lookandsay/assets/local-props').glob('*.glb'), *pathlib.Path('public/lookandsay/assets/local-bed').glob('*.glb')]:
    original = path.read_bytes()
    length = struct.unpack_from('<I', original, 12)[0]
    document = json.loads(original[20:20+length])
    source = original[28+length:]
    images = {image['bufferView']: image for image in document.get('images', []) if 'bufferView' in image}
    output = bytearray()
    for index, view in enumerate(document['bufferViews']):
        start = view.get('byteOffset', 0)
        data = source[start:start+view['byteLength']]
        if index in images and images[index].get('mimeType') == 'image/png':
            image = Image.open(io.BytesIO(data))
            encoded = io.BytesIO()
            image.save(encoded, format='PNG', optimize=True)
            if len(encoded.getvalue()) < len(data):
                data = encoded.getvalue()
        output.extend(b'\0' * (-len(output) % 4))
        view['byteOffset'] = len(output)
        view['byteLength'] = len(data)
        output.extend(data)
    document['buffers'][0]['byteLength'] = len(output)
    output.extend(b'\0' * (-len(output) % 4))
    metadata = json.dumps(document, separators=(',', ':')).encode()
    metadata += b' ' * (-len(metadata) % 4)
    result = struct.pack('<III', 0x46546c67, 2, 28+len(metadata)+len(output)) + struct.pack('<II', len(metadata), 0x4e4f534a) + metadata + struct.pack('<II', len(output), 0x004e4942) + output
    if len(result) < len(original):
        path.write_bytes(result)
    print(f'{path.name}: {len(original)/1e6:.2f} MB → {min(len(result), len(original))/1e6:.2f} MB')
