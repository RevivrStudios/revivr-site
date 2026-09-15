import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {dockDwell} from '../public/lanternlake/dock-dwell.js';
import {ActivityCycle,activitySpecs,smooth,visitWeight,feedingPoint,biteTime,feedingPose} from '../public/openspace/activity-state.js';
// Stub only asset I/O and canvas drawing; exercise the actual effects and interaction controller.
const document={createElement(){return {width:0,height:0,getContext(){return new Proxy({},{get:()=>()=>{}});}};}};
async function model(name){const base=new THREE.Group(),object=new THREE.Group();const mesh=new THREE.Mesh(new THREE.BoxGeometry(.2,.2,.2),new THREE.MeshStandardMaterial());mesh.name=name==='potted-plant'?'basil':name==='garden-chime'?'Hummer':'cover_mesh';object.add(mesh);base.add(object);return {base,object,mixer:new THREE.AnimationMixer(object),clips:[]};}
let source=fs.readFileSync('public/openspace/activities.js','utf8');source=source.slice(source.indexOf('function material'));source=source.replace('export async function','async function');
const build=new Function('THREE','document','model','dockDwell','ActivityCycle','activitySpecs','smooth','visitWeight','feedingPoint','biteTime','feedingPose',source+';return buildActivities;')(THREE,document,model,dockDwell,ActivityCycle,activitySpecs,smooth,visitWeight,feedingPoint,biteTime,feedingPose);
for(let level=0;level<6;level++)for(const reduced of [false,true]){
 const root=new THREE.Group();root.position.z=[0,8,23,35,60,86][level];
 const animals=[...Array.from({length:4},(_,index)=>({kind:'fish',index,holder:new THREE.Group()})),{kind:'butterfly',index:0,holder:new THREE.Group(),wings:[]}];
 const a=await build(root,level,{wildlife:{animals},waterLife:{ripple(){}},koiGarden:{feed(){}}});
 const progress=[];a.group.traverse(o=>{if(o.geometry?.parameters?.thetaLength<0)progress.push(o);});assert.equal(progress.length,1);const ring=progress[0].geometry.attributes.position;assert(ring.getX(1)>0,'progress grows clockwise from the top');
 a.configure({dwellSeconds:2,targetSize:'large',volume:0},null);assert.equal(a.hit.scale.x,1.4);
 root.updateMatrixWorld(true);
 const origin=a.hit.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,0,3)),ray=new THREE.Raycaster(origin,new THREE.Vector3(0,0,-1));
 for(let i=0;i<199;i++)a.gaze(ray,.01);assert(a.ready);
 a.gaze(ray,.01);assert(!a.ready);assert.equal(a.cycle.runs,1);assert(!a.activate());
 const context={active:true,reduced,viewer:origin};
 a.update(.1,{...context,active:false});assert.equal(a.cycle.age,0);
 for(let frame=0;frame<Math.ceil((a.spec.duration+4.1)/.05);frame++){
   a.update(.05,context);a.gaze(ray,.05);
   const label=a.group.children.find(o=>o.isMesh&&o.material.map?.isCanvasTexture);
   if(a.cycle.age>1)assert(label.material.opacity<.01,'activity label clears the view during animation');
   if(level===0&&a.cycle.age>=11)assert.equal(root.getObjectByName('Settled watering droplets').visible,false,'droplets disappear within three seconds of the can returning');
   root.traverse(o=>{for(const n of [...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray()])assert(Number.isFinite(n));if(o.isInstancedMesh)for(const n of o.instanceMatrix.array)assert(Number.isFinite(n));});
 }
 assert.equal(a.cycle.runs,1,'holding gaze must not repeatedly trigger activities');
 assert(a.ready);a.dispose();assert(!a.activate(),'disposed scene cannot reactivate');
}
console.log('PASS: all six real activity controllers in full/reduced motion, spatial dwell targets, finite effects, pause, cooldown, look-away rearm and disposal');
let tones=0,cancelled=0,master;
const audio={currentTime:0,resume:async()=>{},destination:{},createGain(){const node={gain:{value:0,setTargetAtTime(v){this.value=v;},setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};master ||= node;return node;},createOscillator(){tones++;return {frequency:{value:0},connect(){},disconnect(){},start(){},stop(t){if(t===undefined)cancelled++;}};}};
const gong=await build(new THREE.Group(),4);
gong.configure({dwellSeconds:2,targetSize:'normal',volume:.5},audio);gong.activate();assert.equal(tones,0);for(let i=0;i<26;i++)gong.update(.1,{active:true,reduced:false});assert.equal(tones,4);
gong.update(.1,{active:false,reduced:false});assert.equal(master.gain.value,0,'opening a menu silences the chime');
gong.update(.1,{active:true,reduced:false});assert(master.gain.value>0);gong.pause();assert.equal(master.gain.value,0,'visibility changes silence sound without waiting for another render frame');
gong.dispose();assert.equal(cancelled,4,'leaving stops every chime voice');
const muted=await build(new THREE.Group(),4);muted.configure({dwellSeconds:2,targetSize:'normal',volume:0},audio);muted.activate();assert.equal(tones,4,'muted chime creates no audio');muted.update(.1,{active:true,reduced:true});assert.equal(muted.status,'A quiet moment with the chime');muted.dispose();
console.log('PASS: chime honours mute and menu pause, visible reduced-motion feedback, all sound stops on scene disposal');
