import fs from 'node:fs';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Parse the actual shipped geometry and hierarchy, including loader-renamed nodes.
export async function loadRoomFixture() {
  const bytes=fs.readFileSync(new URL('../public/lookandsay/assets/looksay_room.glb',import.meta.url));
  const length=bytes.readUInt32LE(12);
  const json=JSON.parse(bytes.subarray(20,20+length));
  json.buffers[0].uri='data:application/octet-stream;base64,'+bytes.subarray(28+length).toString('base64');
  delete json.images;delete json.textures;
  json.materials=json.materials.map(()=>({pbrMetallicRoughness:{}}));
  return (await new GLTFLoader().parseAsync(JSON.stringify(json),'')).scene;
}
