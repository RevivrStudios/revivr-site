import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { dockLook } from '../public/lanternlake/dock-look.js';
import { buildLakeLandscape } from '../public/lanternlake/lake-landscape.js';
globalThis.ProgressEvent ||= class {};
const camera=new THREE.PerspectiveCamera();camera.position.set(0,1.65,0);
const events={},canvas={style:{},addEventListener:(n,f)=>events[n]=f,setPointerCapture(){},hasPointerCapture(){return true;},releasePointerCapture(){}};
let taps=0,xr=false;dockLook(camera,canvas,()=>xr,()=>taps++);
events.pointerdown({button:0,pointerId:1,clientX:10,clientY:10});events.pointermove({pointerId:1,clientX:200,clientY:80});events.pointerup({pointerId:1});
assert.deepEqual(camera.position.toArray(),[0,1.65,0]);assert.notEqual(camera.rotation.y,0);assert.equal(taps,0);
events.pointerdown({button:0,pointerId:1,clientX:10,clientY:10});events.pointerup({pointerId:1,timeStamp:100});assert.equal(taps,0);
events.pointerdown({button:0,pointerId:1,clientX:10,clientY:10});events.pointerup({pointerId:1,timeStamp:300});assert.equal(taps,1);
const scene=new THREE.Scene();buildLakeLandscape(scene);
scene.traverse(o=>{if(o.isMesh){assert([...o.geometry.attributes.position.array].every(Number.isFinite));assert.notEqual(o.geometry.type,'ConeGeometry');}});
const cache=new Map();
for(const [key,path] of [['wooden-boat','public/lanternlake/assets/boat/wooden-boat.glb'],['kohaku','public/openspace/assets/wildlife/kohaku.glb'],['showa','public/openspace/assets/wildlife/showa.glb'],['dragonfly','public/lanternlake/assets/wildlife/dragonfly.glb']]){
 const b=fs.readFileSync(path),length=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+length));
 j.buffers[0].uri='data:application/octet-stream;base64,'+b.subarray(28+length).toString('base64');delete j.images;delete j.textures;j.materials=j.materials.map(()=>({pbrMetallicRoughness:{}}));
 cache.set(key,await new GLTFLoader().parseAsync(JSON.stringify(j),''));
}
class Loader{async loadAsync(url){return cache.get(url.split('/').pop().replace('.glb',''));}}
const source=fs.readFileSync('public/lanternlake/lake-wildlife.js','utf8').replace(/^import .*;\n/gm,'').replace('export async function','async function');
const build=new Function('THREE','GLTFLoader','clone',source+';return buildLakeWildlife;')(THREE,Loader,clone);
const wildlife=await build(scene);wildlife.update(10);
const animals=scene.getObjectByName('Lake wildlife').children;assert.equal(animals.length,7);
assert.equal(animals.filter(a=>a.position.y<0).length,4,'Four koi below the water');
for(const a of animals)assert([...a.position].every(Number.isFinite));
assert(source.includes('wingTime*48.0'),'Wing animation included');
const boatSource=fs.readFileSync('public/lanternlake/moored-boat.js','utf8').replace(/^import .*;\n/gm,'').replace('export async function','async function');
const buildBoat=new Function('THREE','GLTFLoader',boatSource+';return buildMooredBoat;')(THREE,Loader);
const boat=await buildBoat(scene);boat.update(0);
const hull=scene.getObjectByName('Moored wooden boat');
const box=new THREE.Box3().setFromObject(hull);
assert(Math.abs(box.getSize(new THREE.Vector3()).z-2.8)<.01,'Boat length 2.8m');
assert(box.max.x < -1.1,'Hull clear of dock edge');
assert(box.min.y<0 && box.max.y>0,'Hull intersects waterline');
for(const t of [0,1,25,100]) {boat.update(t);assert([...scene.getObjectByName('Boat mooring rope').geometry.attributes.position.array].every(Number.isFinite));}
const crowns=scene.getObjectByName('Distant wooded shoreline');
const widths=new Set(),matrix=new THREE.Matrix4(),s=new THREE.Vector3();
for(let i=0;i<crowns.count;i++){crowns.getMatrixAt(i,matrix);s.setFromMatrixScale(matrix);widths.add(s.x.toFixed(2));}
assert(widths.size>50,'Varied canopy widths rather than uniform hedge');
scene.updateMatrixWorld(true);
const trunks=scene.getObjectByName('Irregular shoreline trunks'),terrain=scene.getObjectByName('Continuous mountain ridge 0');
const down=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
for(let i=0;i<trunks.count;i++) {
 trunks.getMatrixAt(i,matrix);
 const foot=new THREE.Vector3(0,-.5,0).applyMatrix4(matrix);
 down.ray.origin.set(foot.x,100,foot.z);
 const ground=down.intersectObject(terrain,false)[0];
 assert(ground,'Every tree has solid ground');
 assert(Math.abs(ground.point.y-foot.y-.15)<.001,'Tree roots embedded 15cm in actual bank');
 assert(foot.y<2,'Trees stay close to waterline');
}
const insects=animals.filter(a=>a.children[0].rotation.y===Math.PI);
const shoreGrass=scene.getObjectByName('Distant shoreline and tree-base grass');
assert.equal(shoreGrass.count,3600+180*12);
assert.equal(crowns.count,180*9);
assert(crowns.material.vertexColors,'Canopy occlusion colors enabled');
const foliage=crowns.geometry.attributes.color;
assert(Math.max(...foliage.array)-Math.min(...foliage.array)>.4,'Foliage has shaded undersides and brighter tops');
assert.equal(shoreGrass.geometry.index.count/3,15,'Low-poly distant tuft');
for(let i=0;i<shoreGrass.count;i++) {
 shoreGrass.getMatrixAt(i,matrix);const base=new THREE.Vector3().setFromMatrixPosition(matrix);
 down.ray.origin.set(base.x,100,base.z);const hit=down.intersectObject(terrain,false)[0];
 assert(hit && Math.abs(hit.point.y-base.y-.09)<.001,'Grass roots embedded in bank');
 if(i>=3600) {
   trunks.getMatrixAt(Math.floor((i-3600)/12),matrix);
   assert(Math.hypot(base.x-matrix.elements[12],base.z-matrix.elements[14])<.74,'Grass surrounds each tree base');
 }
}
console.log('PASS: 3,600 shoreline tufts plus twelve grounded tufts around every tree; layered canopy shading');
assert.equal(insects.length,3);
for(const t of [0,1,4,9,17]) {
 wildlife.update(t);const before=insects.map(a=>a.position.clone());
 const headings=insects.map(a=>new THREE.Vector3(0,0,-1).applyQuaternion(a.children[0].quaternion).applyQuaternion(a.quaternion));
 wildlife.update(t+.0001);
 insects.forEach((a,i)=>assert(headings[i].dot(a.position.clone().sub(before[i]).normalize())>.999,'Insect nose follows flight tangent'));
}
console.log('PASS: all 180 tree roots grounded near water; insect noses aligned with motion');
console.log('PASS: stationary dock viewpoint, drag/tap separation, continuous ridges, four underwater koi, three wing-animated dragonflies');
console.log('PASS: varied shoreline canopy; real boat dimensions, dock clearance, waterline, animated rope');
