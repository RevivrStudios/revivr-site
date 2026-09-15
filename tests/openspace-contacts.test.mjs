import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {buildActivities} from '../public/openspace/activities.js';
import {feedingPoint,feedingPose,biteTime} from '../public/openspace/activity-state.js';
globalThis.ProgressEvent=class{constructor(type,values){Object.assign(this,values);}};
globalThis.document={createElement(){return {width:0,height:0,getContext(){return new Proxy({},{get:()=>()=>{}});}};}};
// Keep the real model hierarchy, geometry and animation; omit image decoding in Node.
GLTFLoader.prototype.loadAsync=async function(url){
 const file='public/openspace/'+url.replace(/^\.\//,''),b=fs.readFileSync(file),n=b.readUInt32LE(12),json=JSON.parse(b.subarray(20,20+n));
 json.buffers[0].uri='data:application/octet-stream;base64,'+b.subarray(28+n).toString('base64');delete json.images;delete json.textures;json.materials=json.materials.map(()=>({pbrMetallicRoughness:{}}));return this.parseAsync(JSON.stringify(json),'');
};
const context={active:true,reduced:false},root=new THREE.Group(),gong=await buildActivities(root,4);
root.updateMatrixWorld(true);const mallet=root.getObjectByName('Hummer'),home=mallet.position.clone();gong.activate();gong.cycle.age=2.5;gong.update(0,context);
assert(Math.abs(mallet.position.x-home.x+.0858568)<1e-7);assert(Math.abs(mallet.position.z-home.z-.020924)<1e-7);
gong.cycle.age=6;gong.update(0,context);assert(mallet.position.equals(home),'mallet returns exactly to its hook');
for(let run=0;run<5;run++)for(let i=0;i<18;i++){
 const p=feedingPoint(i,run),pose=feedingPose(i%4,biteTime(i),run),mouth=.13+(i%4)*.008;
 const point=new THREE.Vector3(0,0,mouth).applyEuler(new THREE.Euler(pose.pitch,pose.yaw,0,'YXZ')).add(new THREE.Vector3(pose.x,pose.y,pose.z));
 assert(point.distanceTo(new THREE.Vector3(p.x,p.y,p.z))<1e-5,'mouth meets its assigned pellet when consumed');
 const before=feedingPose(i%4,biteTime(i)+.59,run),after=feedingPose(i%4,biteTime(i)+.61,run);assert(Math.hypot(before.x-after.x,before.y-after.y,before.z-after.z)<.015,'no snap after eating');
}
const birdRoot=new THREE.Group(),bird=await buildActivities(birdRoot,5);bird.activate();
let collisions=0;const point=new THREE.Vector3();
for(let age=5;age<=22;age+=.1){
 bird.cycle.age=age;bird.update(0,context);birdRoot.updateMatrixWorld(true);
 const mesh=birdRoot.getObjectByName('Kolibri');mesh.skeleton.update();
 for(let i=0;i<mesh.geometry.attributes.position.count;i++){
  mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld);
  const r=.14+(.18-.14)*((point.y-1.055)/.07);
  if(point.y>1.055&&point.y<1.124&&Math.hypot(point.x-2.35,point.z+88.5)<r-.004)collisions++;
 }
}
assert.equal(collisions,0,'bird must not pass through the bowl');
console.log('PASS: real mallet returns to hook, all pellet/mouth contacts align, smooth feeding, real animated bird clears bowl');

const flowerRoot=new THREE.Group();flowerRoot.position.z=23;
const flower=await buildActivities(flowerRoot,2);flowerRoot.updateMatrixWorld(true);
const flowerBounds=new THREE.Box3().setFromObject(flowerRoot.getObjectByName('Butterfly flower arrangement'),true);
const center=flowerRoot.worldToLocal(flowerBounds.getCenter(new THREE.Vector3()));
assert(Math.abs(flower.hit.position.x-center.x)<1e-6&&Math.abs(flower.hit.position.y-center.y)<1e-6,'flower gaze target aligns with whole arrangement, including shifted stages');
const sign=bird.group.children.find(o=>o.isMesh&&o.material.map?.isCanvasTexture);
assert(sign.material.depthTest&&!sign.material.depthWrite,'bird sign respects scene occlusion');
for(const age of [0,3,5,7,20,22,24,25]){bird.cycle.age=age;bird.update(0,context);birdRoot.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(birdRoot.getObjectByName('Kolibri'),true);assert(bounds.getCenter(new THREE.Vector3()).z>sign.position.z,'bird stays in front of its sign on approach and departure');}
console.log('PASS: flower target centers on supplied model; bird remains in front of depth-tested sign');
