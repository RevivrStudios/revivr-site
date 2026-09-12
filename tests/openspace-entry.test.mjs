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
