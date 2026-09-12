import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
const source=fs.readFileSync(new URL('../public/lookandsay/garden-terrain.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replaceAll('export ','');
const {addGardenTerrain,gardenHeight}=new Function('THREE','softenTerrainTiling',source+';return {addGardenTerrain,gardenHeight};')(THREE,()=>{});
THREE.TextureLoader.prototype.loadAsync=async()=>new THREE.Texture();
const room=new THREE.Group(),outdoor=new THREE.Group(),original=new THREE.Group();original.name='GardenGround';room.add(outdoor,original);
await addGardenTerrain(room,outdoor,new THREE.PlaneGeometry(.13,.28),new THREE.MeshStandardMaterial());
assert.equal(original.parent,null);
assert.equal(outdoor.children.length,3);
assert(gardenHeight(0,0)<.27,'Lawn remains below room floor');
for(const mesh of outdoor.children){
 assert([...mesh.geometry.attributes.position.array].every(Number.isFinite));
 if(mesh.isInstancedMesh)assert([...mesh.instanceMatrix.array].every(Number.isFinite));
}
assert(gardenHeight(0,17)>1,'Distant berm breaks flat horizon');
console.log('PASS: textured terrain, removed original, two finite shrub batches, clear room floor');
