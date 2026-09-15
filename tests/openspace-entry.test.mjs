import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as THREE from 'three';
const html=fs.readFileSync('public/openspace/index.html','utf8');
let hidden=false, builds=0;
const button={disabled:false};
const c=vm.createContext({sessionStarted:false,sessionEnded:false,levelLoading:false,
  awaitingCheckin:false,currentLevelIndex:0,retreatScene:{},levelStats:[{visits:0}],timingAt:0,
  document:{getElementById:()=>button},initAudio(){},audioCtx:{state:'running'},
  introOverlay:{classList:{add(){hidden=true;}}},performance:{now:()=>100},buildLevel(){builds++;}});
vm.runInContext(html.slice(html.indexOf('function startExperience()'),html.indexOf("document.getElementById('startBtn').addEventListener('click', startExperience);")),c);
c.startExperience();assert(c.sessionStarted);assert(hidden);assert.equal(builds,0);
c.startExperience();assert.equal(c.levelStats[0].visits,1,'No duplicate start after entering VR');
c.sessionStarted=false;button.disabled=true;c.startExperience();assert(!c.sessionStarted);
assert(html.includes('if (!sessionStarted && !sessionEnded) startExperience();'));
assert(html.includes('class="revivr-vr-button" disabled'));
// A real six-sided enclosure exists before any network asset is available.
const scene=new THREE.Scene();
vm.runInNewContext(html.slice(html.indexOf('const loadingRoom ='),html.indexOf('scene.background =',html.indexOf('const loadingRoom ='))),{THREE,scene});
scene.updateMatrixWorld(true);
assert.equal(scene.children[0].children.length,6);
for(const dir of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){
  const ray=new THREE.Raycaster(new THREE.Vector3(0,1.65,0),new THREE.Vector3(...dir));
  assert(ray.intersectObjects(scene.children,true).length,'Loading room closes direction '+dir);
}
console.log('PASS: direct VR entry starts once, loading blocks entry, six-sided immediate enclosure');

// Entry curtain survives loading, follows the XR pose, then clears after readiness.
const cover=new THREE.Group(),xrHead=new THREE.Object3D();xrHead.position.set(1,1.7,2);xrHead.rotation.y=.4;xrHead.updateMatrixWorld(true);
const cc=vm.createContext({entryTransition:false,entryTexture:{},nextSpaceTexture:{},loadingDots:[{material:{},position:{}},{material:{},position:{}},{material:{},position:{}}],levelLoading:true,entryCoverUntil:0,entryCoverOpacity:1,entryCover:cover,entryBackdrop:{material:{}},entryLabel:{material:{},position:{}},prefersReducedMotion:false,performance:{now:()=>1000},renderer:{xr:{isPresenting:true,getCamera:()=>xrHead}},document:{body:{classList:{toggle(){}}}}});
vm.runInContext(html.slice(html.indexOf('function updateEntryCover('),html.indexOf("renderer.xr.addEventListener('sessionstart'")),cc);
cc.updateEntryCover(.1);assert.equal(cc.entryCoverOpacity,1);assert(cover.position.equals(xrHead.position));assert(cover.quaternion.angleTo(xrHead.quaternion)<1e-6);
cc.levelLoading=false;cc.updateEntryCover(.1);assert(cc.entryCoverOpacity>0&&cc.entryCoverOpacity<1);
for(let i=0;i<7;i++)cc.updateEntryCover(.1);assert.equal(cc.entryCoverOpacity,0);assert(!cover.visible);
cc.entryCoverOpacity=1;cc.prefersReducedMotion=true;cc.updateEntryCover(.02);assert.equal(cc.entryCoverOpacity,0);
console.log('PASS: opaque loading curtain follows headset, fades on readiness, honours reduced motion');

cc.entryTransition=true;cc.levelLoading=true;cc.updateEntryCover(.1);
assert.equal(cc.entryBackdrop.visible,false,'later transitions retain scenery without a white enclosure');
assert.equal(cc.entryLabel.material.map,cc.nextSpaceTexture);assert.equal(cc.entryCoverOpacity,1);
cc.prefersReducedMotion=false;cc.entryCoverOpacity=0;cc.updateEntryCover(.1);
assert.equal(cc.entryCoverOpacity,.2,'Transition panel fades in over half a second');
assert.equal(cc.entryLabel.position.z,-2.2,'Transition panel stays farther from the headset');
assert(cc.loadingDots.every(dot=>Math.abs(dot.position.z+2.19)<1e-6));
