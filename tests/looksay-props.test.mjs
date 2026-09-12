import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { loadRoomFixture } from './load-room-fixture.mjs';
globalThis.ProgressEvent ||= class {constructor(type,values){Object.assign(this,values);}};
const assets=new Map();
for(const name of ['curtains','clock','plant','table','compact-chair','books']) {
 const bytes=fs.readFileSync(new URL(`../public/lookandsay/assets/local-props/${name}.glb`,import.meta.url));
 const length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length));
 json.buffers[0].uri='data:application/octet-stream;base64,'+bytes.subarray(28+length).toString('base64');
 delete json.images;delete json.textures;json.materials=json.materials.map(()=>({pbrMetallicRoughness:{}}));
 const asset=await new GLTFLoader().parseAsync(JSON.stringify(json),'');assets.set(name,asset);
 let triangles=0;asset.scene.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;assert(Array.from(o.geometry.attributes.position.array).every(Number.isFinite));}});
 assert(triangles<60000,`${name} triangle budget`);console.log(name,triangles,'triangles');
}
class Loader {async loadAsync(path){return assets.get(path.split('/').pop().replace('.glb',''));}}
const source=fs.readFileSync(new URL('../public/lookandsay/room-props.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export async function','async function');
const replace=new Function('THREE','GLTFLoader','RoundedBoxGeometry',source+';return replaceRoomProps;')(THREE,Loader,RoundedBoxGeometry);
const room=await loadRoomFixture();
const originals=['Plane.007','Plane.007_mirror','Plane.001','Plane.001_mirror','Circle.001','PlantPot','PlantLeaves','Cube.005','Cube.007','Circle','Cube.008','Cube.012','Cube.013'];
for(const name of originals)assert(room.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name)),`${name} exists in real room`);
const originalObjects=originals.map(name=>room.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name)));
await replace(room);room.updateMatrixWorld(true);
for(const object of originalObjects)assert.equal(object.parent,null,`${object.name} removed from real room`);
const chair=room.getObjectByName('Compact visitor chair');
assert(chair.children[0].children.length>0,'Replacement chair survives source-name collisions');
const chairBounds=new THREE.Box3().setFromObject(chair,true);
assert(chairBounds.max.z<-.67-.5,'Chair leaves over half a meter clear of the bed');
assert(Math.abs(chairBounds.min.y-.265)<.001,'Chair rests on floor');
assert.equal(room.getObjectByName('Plane003'),undefined,'Ambiguous mirror removed');
const drinkBounds=new THREE.Box3().setFromObject(room.getObjectByName('Bedside glass of water'),true);
assert(Math.abs(drinkBounds.min.y-1.074)<.001,'Water glass coaster rests on table');
for(const name of ['Linen curtains -1','Linen curtains 1','Detailed wall clock','Textured thyme plant','Oak bedside cabinet Cube.005','Oak bedside cabinet Cube.007']) {
 const bounds=new THREE.Box3().setFromObject(room.getObjectByName(name),true);
 assert([...bounds.min,...bounds.max].every(Number.isFinite));
 assert(bounds.min.y>.26 && bounds.max.y<2.5,`${name} fits interior`);
 console.log(name,bounds.getSize(new THREE.Vector3()).toArray().map(x=>x.toFixed(2)).join(','));
}
const html=fs.readFileSync(new URL('../public/lookandsay/index.html',import.meta.url),'utf8');
assert(!/moteGeo|moteCount|new THREE.Points\(/.test(html),'Particles removed completely');
console.log('PASS: replacement props, dimensions, hidden originals, no particles');
