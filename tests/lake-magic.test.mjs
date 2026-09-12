import assert from 'node:assert/strict';
import * as THREE from 'three';
import { lakeMagic } from '../public/lanternlake/lake-magic.js';
import { dockLook,doubleActivation } from '../public/lanternlake/dock-look.js';
globalThis.document={addEventListener(){}};
const scene=new THREE.Scene(),magic=lakeMagic(scene,false);
assert.equal(magic.update(30),0,'No settling before real releases');
for(let i=0;i<3;i++)magic.release(new THREE.Vector3(2,1,16),i);
assert.equal(magic.update(4),0,'Settling is delayed');
assert.equal(magic.update(20),1,'Settles gradually after three releases');
magic.release(new THREE.Vector3(2,1,16),21);assert.equal(magic.update(21),0,'New release re-engages');
for(let i=0;i<20;i++)magic.release(new THREE.Vector3(2,1,16),22);
assert(scene.children.filter(o=>o.isMesh).length<=8,'Ripple population bounded');
magic.update(40);assert.equal(scene.children.filter(o=>o.isMesh).length,0,'Ripples cleaned up');
const reducedScene=new THREE.Scene(),reduced=lakeMagic(reducedScene,true);
reduced.release(new THREE.Vector3(),0);reduced.update(100);
assert.equal(reducedScene.children.filter(o=>o.isMesh).length,0);
assert.equal(reducedScene.getObjectByName('Occasional shooting star').visible,false);
let releases=0;
const events={},canvas={style:{},addEventListener:(n,f)=>events[n]=f,setPointerCapture(){},hasPointerCapture(){return true;},releasePointerCapture(){events.lostpointercapture();}};
dockLook(new THREE.PerspectiveCamera(),canvas,()=>false,()=>releases++);
events.pointerdown({button:0,pointerId:1,clientX:0,clientY:0});assert.equal(releases,0);
events.pointerup({pointerId:1,timeStamp:100});assert.equal(releases,0);
events.pointerdown({button:0,pointerId:1,clientX:0,clientY:0});events.pointerup({pointerId:1,timeStamp:300});assert.equal(releases,1);
events.pointerdown({button:0,pointerId:2,clientX:0,clientY:0});
events.pointermove({pointerId:2,clientX:100,clientY:0});
events.pointerup({pointerId:2});assert.equal(releases,1,'Looking does not release');
const pinch=doubleActivation(()=>releases++,650);pinch.tap(100,'left');pinch.tap(200,'right');assert.equal(releases,1);pinch.tap(300,'right');assert.equal(releases,2);
pinch.tap(400,'right');pinch.reset();pinch.tap(500,'right');assert.equal(releases,2);
for(let i=0;i<9;i++)magic.burst(new THREE.Vector3(0,6,0),40);
assert.equal(scene.children.filter(o=>o.name==='Lantern firework').length,4);
magic.update(41);for(const o of scene.children.filter(o=>o.name==='Lantern firework'))assert([...o.geometry.attributes.position.array].every(Number.isFinite));
magic.update(45);assert.equal(scene.children.filter(o=>o.name==='Lantern firework').length,0);
reduced.burst(new THREE.Vector3(0,6,0),101);const spark=reducedScene.getObjectByName('Lantern firework'),before=[...spark.geometry.attributes.position.array];reduced.update(102);assert.deepEqual([...spark.geometry.attributes.position.array],before);
console.log('PASS: double activation, no drag preview, bounded fireworks, static reduced-motion bloom');
for(const reducedMotion of [false,true]) {
  const colorScene=new THREE.Scene(),colored=lakeMagic(colorScene,reducedMotion),sequence=[];
  for(let i=0;i<70;i++) {
    colored.burst(new THREE.Vector3(0,6,0),i);
    const effect=colorScene.children.filter(o=>o.name==='Lantern firework').at(-1);
    sequence.push(effect.userData.burstColor);
    if(i)assert.notEqual(sequence[i],sequence[i-1],'No consecutive repeated colors, including bag boundaries');
    assert.equal(effect.material.toneMapped,false,'Keep bright palette from being desaturated by tone mapping');
    if(i%7===6)assert.equal(new Set(sequence.slice(i-6,i+1)).size,7,'Every cycle uses all seven colors');
  }
}
console.log('PASS: seven bright colors shuffled without repeats in normal and reduced-motion modes');
