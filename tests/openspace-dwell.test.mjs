import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as THREE from 'three';

const html = fs.readFileSync('public/openspace/index.html', 'utf8');
const code = html.slice(html.indexOf('function setHeadRay()'), html.indexOf('/* ---------------------------------------------------------\n   FLOW CONTROL'));
const head = new THREE.ArrayCamera();
head.position.set(1, 1.6, 2); head.rotation.y = .4; head.updateMatrixWorld(true);
let hit = true, now = 0, calls = 0, count = 0;
const raycaster = new THREE.Raycaster();
raycaster.intersectObjects = () => hit ? [{object:{userData:{interactive:'advance'}}}] : [];
const context = vm.createContext({
  performance:{now:()=>now}, renderer:{xr:{isPresenting:true,getCamera:()=>head,getSession:()=>({visibilityState:'visible'})}},
  raycaster, camera:new THREE.PerspectiveCamera(), centerVec:new THREE.Vector2(),
  _gazeOrigin:new THREE.Vector3(), _gazeDir:new THREE.Vector3(),
  readyBtn:{classList:{add(){},remove(){}}}, document:{hidden:false,getElementById:()=>({})},
  sessionStarted:true, sessionEnded:false, levelLoading:false, awaitingCheckin:false,
  envGroup:{children:[]}, progressMarker:{material:{},userData:{dwellFill:{geometry:{setDrawRange:(start,n)=>{count=n;}}}}},
  vrUI:{visible:false}, vrButtons:[], dwellProgressMs:0, lastTickTime:0,
  DWELL_MS:1500, DECAY_MS:600, MAX_FRAME_DT_MS:50,
  onAdvanceTriggered:()=>{calls++;context.awaitingCheckin=true;},
});
vm.runInContext(code,context);
function frames(n,step=10){for(let i=0;i<n;i++){now+=step;context.updateGaze();}}
frames(149); assert.equal(calls,0); assert(count>0 && count<384);
assert(raycaster.ray.origin.distanceTo(head.position)<1e-8);
assert(raycaster.ray.direction.distanceTo(head.getWorldDirection(new THREE.Vector3()))<1e-8);
frames(1); assert.equal(calls,1); frames(200); assert.equal(calls,1);
context.awaitingCheckin=false; frames(75); hit=false; frames(60);
assert.equal(context.dwellProgressMs,0); assert.equal(count,0);
hit=true; frames(75); context.document.hidden=true; frames(1);
assert.equal(context.dwellProgressMs,0);
context.document.hidden=false; frames(75); frames(1,1000);
assert(context.dwellProgressMs<=50); assert.equal(calls,1);
context.renderer.xr.isPresenting=false; frames(200); assert.equal(calls,1);
assert.equal(count,0);
console.log('PASS: XR world ray, 1.5s threshold, spatial progress, single activation, drift decay, hidden/frame-gap reset, no desktop dwell');
