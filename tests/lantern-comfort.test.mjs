import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { comfortDefaults,sanitizeComfort,readComfort,saveComfort,reducedMotion,nextComfort } from '../public/lanternlake/comfort-settings.js';
import { comfortXR } from '../public/lanternlake/comfort-xr.js';
import { lakeMagic } from '../public/lanternlake/lake-magic.js';

test('Settings recover from invalid or unavailable storage and preserve valid choices',()=>{
 assert.deepEqual(readComfort({getItem(){throw Error();}}),comfortDefaults);
 assert.deepEqual(readComfort({getItem:()=>'{broken'}),comfortDefaults);
 assert.deepEqual(sanitizeComfort({dwellSeconds:-1,fireworks:'strobe'}),comfortDefaults);
 const memory={};const storage={getItem:key=>memory[key],setItem:(key,value)=>memory[key]=value};
 saveComfort(storage,{...comfortDefaults,dwellSeconds:2.5,placement:'nearby',fireworks:'off'});
 assert.equal(readComfort(storage).dwellSeconds,2.5);assert.equal(readComfort(storage).fireworks,'off');
 assert(reducedMotion(comfortDefaults,true));assert(!reducedMotion({...comfortDefaults,motion:'full'},true));
 assert(reducedMotion({...comfortDefaults,motion:'reduced'},false));
 assert.equal(nextComfort({...comfortDefaults,fireworks:'off'},'fireworks'),'gentle');
});

test('Nearby controls face a seated or reclined viewer and raycast each action independently',()=>{
 const previous=globalThis.document;
 globalThis.document={createElement:()=>({getContext:()=>({clearRect(){},beginPath(){},roundRect(){},fill(){},stroke(){},fillText(){}})})};
 try {
  for(const direction of [new THREE.Vector3(0,0,-1),new THREE.Vector3(.1,.8,-.6).normalize()]) {
   const scene=new THREE.Scene(),controls=comfortXR(scene),origin=new THREE.Vector3(0,1.1,18);
   controls.set([['release','Release lantern'],['exit','Exit VR'],['settings','Comfort'],['practice','Practice']]);
   controls.panel.visible=true;controls.place(origin,direction);scene.updateMatrixWorld(true);
   assert(Math.abs(controls.panel.position.distanceTo(origin)-2.6)<1e-6);
   for(const button of controls.panel.children.filter(o=>o.userData.key)) {
    const position=button.getWorldPosition(new THREE.Vector3());
    const ray=new THREE.Raycaster(origin,position.sub(origin).normalize());
    assert.equal(controls.pick(ray),button.userData.key);
    controls.progress(button.userData.key,.5);assert(button.userData.fill.visible);
   }
   controls.hide();assert.equal(controls.panel.visible,false);
  }
 }finally{globalThis.document=previous;}
});

test('Ambient fireworks never evict player bursts; intensity and off settings apply',()=>{
 const previous=globalThis.document;globalThis.document={addEventListener(){}};
 try {
  const scene=new THREE.Scene(),magic=lakeMagic(scene,false);
  magic.burst(new THREE.Vector3(),0,{player:true});const player=scene.getObjectByName('Lantern firework');
  for(let i=0;i<20;i++)magic.burst(new THREE.Vector3(),1);
  assert(scene.children.includes(player));assert.equal(scene.children.filter(o=>o.name==='Lantern firework').length,5);
  magic.configure({fireworks:'gentle',reduceMotion:false,feedbackSound:false});
  assert(!scene.children.includes(player));magic.burst(new THREE.Vector3(),2);magic.update(3);
  assert(scene.getObjectByName('Lantern firework').material.opacity<=.4);
  magic.configure({fireworks:'off',reduceMotion:false,feedbackSound:false});magic.burst(new THREE.Vector3(),4,{player:true});
  assert.equal(scene.getObjectByName('Lantern firework'),undefined);
 }finally{globalThis.document=previous;}
});
