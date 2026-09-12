import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
const assets = new Map();
globalThis.ProgressEvent ||= class { constructor(type,values) { Object.assign(this,values); } };
for(const name of ['kohaku','showa','blue','brimstone','dove']) {
  const bytes=fs.readFileSync(new URL(`../public/openspace/assets/wildlife/${name}.glb`,import.meta.url));
  const length=bytes.readUInt32LE(12);
  const json=JSON.parse(bytes.subarray(20,20+length));
  const bin=bytes.subarray(28+length);
  json.buffers[0].uri=`data:application/octet-stream;base64,${bin.toString('base64')}`;
  // Test geometry and animation without requiring browser image decoding.
  delete json.images; delete json.textures;
  json.materials=json.materials.map(()=>({pbrMetallicRoughness:{}}));
  const gltf=await new GLTFLoader().parseAsync(JSON.stringify(json),'');
  assets.set(name,gltf);
  const mixer=new THREE.AnimationMixer(gltf.scene);
  gltf.animations.forEach(clip=>mixer.clipAction(clip).play());
  let triangles=0;
  gltf.scene.traverse(o=>{ if(o.isMesh) triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3; });
  for(const time of [0,.3,.6,1]) {
    mixer.setTime(time); gltf.scene.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(gltf.scene);
    assert([...bounds.min,...bounds.max].every(Number.isFinite));
    console.log(name,time,bounds.getSize(new THREE.Vector3()).toArray().map(n=>n.toFixed(3)).join(','));
  }
  if(['kohaku','showa','dove'].includes(name)) assert(gltf.animations.length,'Animation exported');
  assert(triangles<30000,`${name}: bounded triangle count`);
  console.log('PASS',name,triangles,'triangles',json.skins?.[0].joints.length||0,'bones');
}
const source=fs.readFileSync(new URL('../public/openspace/wildlife.js',import.meta.url),'utf8')
  .replace(/^import .*;\n/gm,'').replace('export async function','async function');
class LocalLoader { async loadAsync(url) { return assets.get(url.split('/').pop().replace('.glb','')); } }
const build=new Function('THREE','GLTFLoader','clone',source+';return buildWildlife;')(THREE,LocalLoader,clone);
const root=new THREE.Group();
const wildlife=await build(root,3,{setDetailedFish(){}});
for (const time of [0,.5,1,4]) {
  wildlife.update(time); root.updateMatrixWorld(true);
  for(const fish of root.children[0].children.slice(0,4)) {
    fish.traverse(o=>{if(o.isSkinnedMesh) {o.skeleton.update();o.computeBoundingBox();}});
    const bounds=new THREE.Box3().setFromObject(fish,true);
    assert(Math.max(...bounds.getSize(new THREE.Vector3()))<.5,'Animated koi stays below half a metre');
    assert(bounds.max.y<.29,'Fish remains under water');
  }
}
const finalRoot=new THREE.Group();
await build(finalRoot,5,null);
assert.equal(finalRoot.children[0].children.length,0,'Final level contains no doves');
console.log('PASS: animated koi scale, submerged placement, and no final-level birds');
