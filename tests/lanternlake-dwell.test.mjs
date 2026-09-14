import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import { buildBoatExit } from '../public/lanternlake/boat-exit.js';
import { buildDockMusic } from '../public/lanternlake/dock-music.js';
import { dockDwell } from '../public/lanternlake/dock-dwell.js';

const html=fs.readFileSync('public/lanternlake/index.html','utf8');
function fixture() {
  const scene=new THREE.Scene(), rig=new THREE.Group();
  rig.position.set(0,.46,18); scene.add(rig);
  const vrSound=new THREE.Mesh(new THREE.PlaneGeometry(1.9,.3),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
  vrSound.position.set(0,1.28,12.4);scene.add(vrSound);
  const dockLantern=new THREE.Group();
  vm.runInNewContext(html.match(/dockLantern.position.set\([^;]+;/)[0],{dockLantern});
  dockLantern.add(new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,.46),new THREE.MeshBasicMaterial()));
  vm.runInNewContext(html.slice(html.indexOf('  const lanternTarget='),html.indexOf('  scene.add(dockLantern);')),{THREE,dockLantern});
  scene.add(dockLantern);
  const dockMusic=buildDockMusic(dockLantern.position);scene.add(dockMusic);
  const musicProgress=dockMusic.getObjectByName('Music dwell progress');
  const lanternProgress=new THREE.Mesh(new THREE.RingGeometry(.29,.315,64),new THREE.MeshBasicMaterial());
  const boatExit=buildBoatExit();boatExit.visible=true;scene.add(boatExit);
  const exitProgress=boatExit.getObjectByName('Exit dwell progress');
  let soundOn=false, soundCalls=0, launches=0, exits=0;
  const session={visibilityState:'visible'}, referenceSpace={};
  const xr={isPresenting:true,getSession:()=>session,getReferenceSpace:()=>referenceSpace};
  const context=vm.createContext({clock:{elapsedTime:0},preferences:{aimDot:false},recenterAt:null,needsPanelPlacement:false,comfortControls:{panel:{visible:false},pick:()=>null,progress(){},update(){},place(){}},renderer:{xr},scene,rig,vrSound,dockLantern,dockMusic,musicProgress,lanternProgress,boatExit,exitProgress,exitVR:()=>exits++,dwell:dockDwell(),
    gazeMatrix:new THREE.Matrix4(),gazeOrigin:new THREE.Vector3(),gazeDirection:new THREE.Vector3(),gazeRay:new THREE.Raycaster(),
    progressPanel:{visible:false},progressTexture:{},progressCanvas:{getContext:()=>({clearRect(){},fillRect(){},fillText(){}})},
    lanterns:[],playerLanternCount:()=>0,MAX_LANTERNS:8,toggleSound:()=>{soundOn=!soundOn;soundCalls++;},launchFromDock:()=>launches++});
  vm.runInContext(html.slice(html.indexOf('  function updateDockDwell('),html.indexOf('  let releaseCount')),context);
  function aim(point) {
    scene.updateMatrixWorld(true);
    const head=new THREE.PerspectiveCamera();
    head.position.copy(new THREE.Vector3(0,1.65,0).applyMatrix4(rig.matrixWorld));
    head.lookAt(point);head.updateMatrixWorld(true);
    const pose=new THREE.Matrix4().copy(rig.matrixWorld).invert().multiply(head.matrixWorld);
    return {getViewerPose:space=>{assert.equal(space,referenceSpace);return {transform:{matrix:pose.toArray()}};}};
  }
  function hold(frame, count=120) {for(let i=0;i<count;i++)context.updateDockDwell(1/60,frame);}
  return {context,rig,vrSound,dockLantern,dockMusic,musicProgress,lanternProgress,boatExit,exitProgress,exitCount:()=>exits,session,xr,aim,hold,counts:()=>({soundOn,soundCalls,launches})};
}

test('Head dwell hits both dock controls before rendering, including a rotated rig',()=>{
  for(const angle of [0,.35]) {
    const f=fixture();f.rig.rotation.y=angle;
    const sound=f.aim(f.dockMusic.position), lantern=f.aim(f.dockLantern.position);
    f.hold(sound);assert.deepEqual(f.counts(),{soundOn:true,soundCalls:1,launches:0});
    f.hold(sound,200);assert.equal(f.counts().soundCalls,1);
    f.hold(lantern);assert.equal(f.counts().launches,1);
    f.hold(sound);assert.equal(f.counts().soundOn,false);assert.equal(f.counts().soundCalls,2);
  }
});

test('Missing tracking, hidden sessions, frame gaps, and desktop cannot complete a dwell',()=>{
  const f=fixture(), sound=f.aim(f.dockMusic.position);
  for(const interrupt of [
    ()=>f.context.updateDockDwell(1/60,{getViewerPose:()=>null}),
    ()=>f.context.updateDockDwell(1/60,undefined),
    ()=>{f.session.visibilityState='visible-blurred';f.hold(sound,1);f.session.visibilityState='visible';},
    ()=>{f.xr.isPresenting=false;f.hold(sound,1);f.xr.isPresenting=true;},
    ()=>f.context.updateDockDwell(1,sound),
  ]) {
    f.context.dwell.reset();f.hold(sound,60);interrupt();f.hold(sound,60);
    assert.equal(f.counts().soundCalls,0);
  }
  f.hold(sound,40);assert.equal(f.counts().soundCalls,1);
});

test('Dock lantern clears the signs horizontally from the starting viewpoint',()=>{
  const f=fixture();
  const viewer=new THREE.Vector3(0,2.11,18);
  const nearestLeft=f.dockLantern.position.x-.205;
  const signPlaneX=nearestLeft*(viewer.z-f.vrSound.position.z)/(viewer.z-f.dockLantern.position.z);
  assert(signPlaneX>1.9/2+.1,'Lantern silhouette has clearance beyond the signs right edge');
});


test('Music note mirrors the lantern; the old sign is no longer a dwell target',()=>{
  const f=fixture();
  assert.equal(f.dockMusic.position.x,-f.dockLantern.position.x);
  assert.equal(f.dockMusic.position.y,f.dockLantern.position.y);
  assert.equal(f.dockMusic.position.z,f.dockLantern.position.z);
  f.hold(f.aim(f.vrSound.position),150);
  assert.equal(f.counts().soundCalls,0);
  f.hold(f.aim(f.dockMusic.position),45);
  assert(f.musicProgress.geometry.drawRange.count>0);
  assert(f.musicProgress.geometry.drawRange.count<384);
  f.hold(f.aim(f.vrSound.position),15);
  assert.equal(f.musicProgress.geometry.drawRange.count,0);
  assert.equal(f.counts().soundCalls,0);
});


test('Lantern dwell feedback stays on the target and clears when looking away or losing tracking',()=>{
  const f=fixture(), lantern=f.aim(f.dockLantern.position);
  f.hold(lantern,45);
  assert.equal(f.lanternProgress.visible,true);
  assert(f.lanternProgress.geometry.drawRange.count>0&&f.lanternProgress.geometry.drawRange.count<384);
  assert.equal(f.counts().launches,0);
  f.hold(f.aim(f.vrSound.position),15);
  assert.equal(f.lanternProgress.visible,false);
  assert.equal(f.lanternProgress.geometry.drawRange.count,0);
  f.hold(lantern,100);assert.equal(f.counts().launches,1);
  f.context.updateDockDwell(1/60,undefined);
  assert.equal(f.lanternProgress.visible,false);
  assert(!html.includes('progressCanvas'),'No distracting menu progress meter');
});


test('Expanded lantern target accepts centered gaze and equal drift to either side',()=>{
  for(const offset of [[0,0],[-.35,0],[.35,0],[0,.35],[0,-.35]]) {
    const f=fixture();
    const point=f.dockLantern.position.clone().add(new THREE.Vector3(...offset,0));
    f.hold(f.aim(point),100);
    assert.equal(f.counts().launches,1,`Dwell activates at offset ${offset}`);
  }
});


test('Boat exit dwells once, shows progress at the icon, and stays separate from dock actions',()=>{
  const f=fixture();
  assert(f.boatExit.position.distanceTo(f.dockMusic.position)>4);
  const exit=f.aim(f.boatExit.position);
  f.hold(exit,45);assert.equal(f.exitCount(),0);assert(f.exitProgress.geometry.drawRange.count>0);
  f.hold(exit,60);assert.equal(f.exitCount(),1);
  f.hold(exit,120);assert.equal(f.exitCount(),1);
  assert.deepEqual(f.counts(),{soundOn:false,soundCalls:0,launches:0});
  f.hold(f.aim(f.dockLantern.position),1);assert.equal(f.exitProgress.geometry.drawRange.count,0);
  f.context.dwell.reset();f.boatExit.visible=false;f.hold(exit,120);assert.equal(f.exitCount(),1);
});

test('Exit action ends the XR session once and permits retry if ending fails',async()=>{
  let calls=0,reset=0,finish;
  const session={end:()=>{calls++;return new Promise(resolve=>finish=resolve);}};
  const context=vm.createContext({renderer:{xr:{getSession:()=>session}},dwell:{reset:()=>reset++},notify(){},console:{warn(){}}});
  vm.runInContext(html.slice(html.indexOf('  let exitingVR=false;'),html.indexOf('  const dwell = dockDwell(')),context);
  const pending=context.exitVR();await context.exitVR();assert.equal(calls,1);
  finish();await pending;
  session.end=async()=>{calls++;throw Error('Session temporarily busy');};
  await context.exitVR();assert.equal(reset,1);
  session.end=async()=>{calls++;};await context.exitVR();assert.equal(calls,3);
});
