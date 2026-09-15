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
  levelEnteredAt:-10000,LOOK_AROUND_GRACE_MS:2000, performance:{now:()=>now}, renderer:{xr:{isPresenting:true,getCamera:()=>head,getSession:()=>({visibilityState:'visible'})}},
  raycaster, camera:new THREE.PerspectiveCamera(), centerVec:new THREE.Vector2(),
  _gazeOrigin:new THREE.Vector3(), _gazeDir:new THREE.Vector3(),
  readyBtn:{classList:{add(){},remove(){}}}, document:{hidden:false,getElementById:()=>({})},
  retreatScene:null,sessionStarted:true, sessionEnded:false, levelLoading:false, awaitingCheckin:false,
  envGroup:{children:[]}, progressMarker:{material:{},userData:{dwellFill:{geometry:{setDrawRange:(start,n)=>{count=n;}}}}},
  vrUI:{visible:false}, vrButtons:[], dwellProgressMs:0, lastTickTime:0,
  DWELL_MS:2000, comfort:{dwellSeconds:2},comfortOpen:false, DECAY_MS:600, MAX_FRAME_DT_MS:50,
  onAdvanceTriggered:()=>{calls++;context.awaitingCheckin=true;},
});
vm.runInContext(code,context);
function frames(n,step=10){for(let i=0;i<n;i++){now+=step;context.updateGaze();}}
frames(199); assert.equal(calls,0); assert(count>0 && count<384);
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
console.log('PASS: XR world ray, 2s threshold, spatial progress, single activation, drift decay, hidden/frame-gap reset, no desktop dwell');

// Settings/menu controls use the same duration and require looking away before repeating.
let menuCalls=0;
const button={material:{},userData:{cold:{},hot:{},progress:{scale:{x:0}},vrPick:()=>menuCalls++}};
context.renderer.xr.isPresenting=true;
context.vrHot=null;context.vrDwellMs=0;context.vrNeedsLookAway=false;context.vrAwayMs=0;
raycaster.intersectObjects=()=>hit?[{object:button}]:[];
hit=true;
for(let i=0;i<199;i++)context.updateVrGaze(10,10);
assert.equal(menuCalls,0);assert(button.userData.progress.scale.x>.9);
context.updateVrGaze(10,10);assert.equal(menuCalls,1);
for(let i=0;i<400;i++)context.updateVrGaze(10,10);assert.equal(menuCalls,1);
hit=false;for(let i=0;i<30;i++)context.updateVrGaze(10,10);
hit=true;for(let i=0;i<200;i++)context.updateVrGaze(10,10);assert.equal(menuCalls,2);
context.vrNeedsLookAway=false;context.vrDwellMs=1900;context.updateVrGaze(10,500);assert.equal(menuCalls,2);assert.equal(context.vrDwellMs,10);
context.DWELL_MS=3000;context.vrDwellMs=0;
for(let i=0;i<299;i++)context.updateVrGaze(10,10);assert.equal(menuCalls,2);
context.updateVrGaze(10,10);assert.equal(menuCalls,3);
console.log('PASS: VR menu dwell progress, shared adjustable duration, look-away rearming, frame-gap reset');

// Arriving while already looking forward cannot trigger the next check-in.
context.awaitingCheckin=false;context.vrUI.visible=false;context.DWELL_MS=2000;
context.levelEnteredAt=now;context.progressMarker.userData.needsLookAway=true;
raycaster.intersectObjects=()=>hit?[{object:{userData:{interactive:'advance'}}}]:[];
const beforeArrival=calls;hit=true;frames(200);assert.equal(count,0);assert.equal(context.progressMarker.material.opacity,0);
frames(300);assert.equal(calls,beforeArrival);assert.equal(count,0);
hit=false;frames(1);hit=true;frames(199);assert.equal(calls,beforeArrival);frames(1);assert.equal(calls,beforeArrival+1);
console.log('PASS: arrival hides marker, fades in, then requires look-away before a fresh full dwell');
// Finishing exploration must not disable dwell on the summary buttons.
context.sessionEnded=true;context.awaitingCheckin=true;context.vrUI.visible=true;context.vrButtons=[button];
context.vrNeedsLookAway=false;context.vrHot=null;context.vrDwellMs=0;hit=true;
raycaster.intersectObjects=()=>hit?[{object:button}]:[];
const beforeSummary=menuCalls;
frames(100);assert.equal(menuCalls,beforeSummary);assert.equal(button.userData.progress.scale.x,.5);
frames(100);assert.equal(menuCalls,beforeSummary+1);
frames(200);assert.equal(menuCalls,beforeSummary+1,'Summary cannot repeatedly activate while staring');
console.log('PASS: completed-session summary uses visible dwell progress and activates once');
