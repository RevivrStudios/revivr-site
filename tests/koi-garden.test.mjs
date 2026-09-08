import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildKoiGarden } from '../public/openspace/koi-garden.js';
const root=new THREE.Group();
const materials={stone:new THREE.MeshStandardMaterial(),oak:new THREE.MeshStandardMaterial()};
const sourceWater=new THREE.MeshStandardMaterial();
sourceWater.onBeforeCompile=shader=>{shader.fragmentShader+='min(2.175 - abs(p.x), 4.025 - abs(p.y))';};
const garden=buildKoiGarden(root,materials,sourceWater);
assert.equal(garden.water.geometry.type,'CircleGeometry');
assert.equal(garden.bodies.count,4);
assert(garden.water.material.transparent && !garden.water.material.depthWrite);
const shader={fragmentShader:''};garden.water.material.onBeforeCompile(shader);
assert(shader.fragmentShader.includes('3.0 - length(p)'));
const matrix=new THREE.Matrix4(),position=new THREE.Vector3();
const initial=Array.from(garden.bodies.instanceMatrix.array);
for(let t=0;t<=120;t+=.5) {
 garden.update(t);
 for(let i=0;i<4;i++) {
  garden.bodies.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix);
  assert(Math.hypot(position.x-5.2,position.z+39)+.5<3,'Fish and tails stay inside pond');
  assert(position.y+.09<.29 && position.y-.09>.035,'Fish stay between basin and water');
 }
}
assert.notDeepEqual(Array.from(garden.bodies.instanceMatrix.array),initial,'Koi move');
garden.group.traverse(object=>{
 if(object.geometry) for(const v of object.geometry.attributes.position.array) assert(Number.isFinite(v));
});
console.log('PASS: circular transparent pond, bounded swimming koi, finite planting geometry');
