import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import * as THREE from 'three';
import {finishRoom} from '../public/xr-shared/room-finish.js';
for(const experience of ['openspace','lanternlake','lookandsay','mriprep']) {
 const html=fs.readFileSync(`public/${experience}/index.html`,'utf8');
 for(const [,attrs,script] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
  if(attrs.includes('importmap')||attrs.includes('src='))continue;
  const r=spawnSync(process.execPath,['--input-type=module','--check'],{input:script,encoding:'utf8'});
  assert.equal(r.status,0,`${experience}: ${r.stderr}`);
 }
}
// Stub only texture loading: test actual shared room geometry and window cutout.
THREE.TextureLoader.prototype.loadAsync=async()=>new THREE.Texture();
const suite=new THREE.Group();
for(const name of ['CtrlGlass','SuiteWallLeft','corpo','estofado']) {
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.1),new THREE.MeshStandardMaterial());mesh.name=name;suite.add(mesh);
}
await finishRoom(suite,true);suite.updateMatrixWorld(true);
assert.equal(suite.getObjectByName('SuiteWallLeft').visible,false);
assert.equal(suite.getObjectByName('corpo').visible,false);
assert(suite.getObjectByName('CtrlGlass').material.transparent);
const walls=suite.children.filter(o=>o.isMesh&&o.visible&&o.material.color?.getHexString()==='eee9df');
const view=new THREE.Raycaster(new THREE.Vector3(-2,1.5,.5),new THREE.Vector3(-1,0,0),0,2);
assert.equal(view.intersectObjects(walls).length,0,'Viewing window has no solid wall behind it');
const below=new THREE.Raycaster(new THREE.Vector3(-2,.5,.5),new THREE.Vector3(-1,0,0),0,2);
assert(below.intersectObjects(walls).length,'Solid wall remains below glass');
const room=new THREE.Group();
await finishRoom(room);
assert(room.getObjectByName('Art_NewPrint'));
room.traverse(o=>{if(o.isMesh)for(const p of o.geometry.attributes.position.array)assert(Number.isFinite(p));});
const retreat=fs.readFileSync('public/openspace/retreat.js','utf8');
assert(!retreat.slice(0,retreat.indexOf('let laterAssets')).includes("'grass_path_2'"),'Late terrain is not in initial texture batch');
console.log('PASS: all four entry scripts; room geometry; MRI glass aperture; later terrain asset separation');
