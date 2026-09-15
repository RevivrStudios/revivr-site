import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {poolsForLevel} from '../public/openspace/water-life.js';
const source=fs.readFileSync('public/openspace/water-life.js','utf8');
const asset={scene:new THREE.Group(),animations:[]};
asset.scene.add(new THREE.Mesh(new THREE.BoxGeometry(.1,.03,.2),new THREE.MeshStandardMaterial()));
const lilyMaterial=new THREE.MeshStandardMaterial();
const build=new Function('THREE','clone','poolsForLevel','loadLilies','loadDragonfly',source.slice(source.indexOf('export async function buildWaterLife')).replace('export async function','async function')+';return buildWaterLife;')(THREE,clone,poolsForLevel,async()=>asset,async()=>asset);
for(let level=0;level<6;level++){
  const pools=poolsForLevel(level),root=new THREE.Group(),result=await build(root,level);
  assert.equal(pools.length,level>=4?3:level>=2?2:1);
  const grass=root.getObjectByName('Curved pool water grass'),m=new THREE.Matrix4(),v=new THREE.Vector3();
  assert.equal(grass.count,pools.length*144);
  for(let i=0;i<grass.count;i++){
    const p=pools[Math.floor(i/144)];grass.getMatrixAt(i,m);v.setFromMatrixPosition(m);
    if(p.radius)assert(Math.hypot(v.x-p.x,v.z-p.z)<p.radius-.2);
    else {assert(Math.abs(v.x-p.x)<p.width/2-.2);assert(Math.abs(v.z-p.z)<p.depth/2-.2);}
    assert(Math.abs(v.y-(p.y-.04))<1e-5);
  }
  const pads=result.group.children.filter(o=>o.name==='Whole lily pad');assert(pads.length>=(level>=4?170:60));
  root.updateMatrixWorld(true);for(const pad of pads){const bounds=new THREE.Box3().setFromObject(pad),pool=pools.find(p=>!p.radius&&Math.abs(pad.position.z-p.z)<p.depth/2);assert(pool);assert(bounds.min.x>pool.x-pool.width/2&&bounds.max.x<pool.x+pool.width/2);assert(bounds.min.z>pool.z-pool.depth/2&&bounds.max.z<pool.z+pool.depth/2);}
  for(const pool of pools.filter(p=>!p.radius))for(const side of [-1,1])assert(pads.some(pad=>Math.abs(pad.position.z-(pool.z+side*(pool.depth/2-.55)))<.5&&Math.abs(pad.position.x-pool.x)<pool.width/2-.7),'both short ends have lily pads');
  const insects=result.group.children.filter(o=>o.type==='Group'&&o.name!=='Whole lily pad');assert.equal(insects.length,pools.length*3);
  for(let t=0;t<100;t+=.7){result.update(t);for(let i=0;i<insects.length;i++){
    const p=pools[Math.floor(i/3)],v=insects[i].position;
    assert(v.y>p.y+.27&&v.y<p.y+.57);
    if(p.radius)assert(Math.hypot(v.x-p.x,v.z-p.z)<p.radius);
    else{assert(Math.abs(v.x-p.x)<p.width/2);assert(Math.abs(v.z-p.z)<p.depth/2);}
  }}
}
console.log('PASS: every stage retains correct pool populations, grass stays inside water, dragonflies remain above each pool, lilies only on rectangles');
