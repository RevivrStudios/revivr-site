// Structural test only: real-device rendering and XR input still require device QA.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const html = fs.readFileSync(new URL('../public/openspace/index.html', import.meta.url), 'utf8');
const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const syntax = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: script, encoding: 'utf8' });
assert.equal(syntax.status, 0, syntax.stderr);
let source = fs.readFileSync(new URL('../public/openspace/retreat.js', import.meta.url), 'utf8');
source = source.slice(source.indexOf('export async function')).replace('export async function', 'async function');
// Stub only network-loaded textures; execute the actual geometry builder.
const materials = Object.fromEntries(['plaster', 'oak', 'stone', 'linen', 'teal', 'bronze', 'soil', 'leaf', 'landscape'].map(key => [key, new THREE.MeshStandardMaterial()]));
const artMaterials = [0, 1].map(() => new THREE.MeshStandardMaterial());
const build = new Function('THREE', 'RoundedBoxGeometry', 'mergeGeometries', 'materials', 'assetsReady', 'loadWallArt', source + '; return buildRetreat;')(THREE, RoundedBoxGeometry, mergeGeometries, materials, Promise.resolve(), async () => artMaterials);
for (const level of [0, 1, 2, 3, 4, 5]) {
  const group = new THREE.Group();
  const result = await build(group, level);
  let meshes = 0;
  group.traverse(object => {
    if (!object.isMesh) return;
    meshes++;
    assert(object.geometry);
    for (const coordinate of object.geometry.attributes.position.array) assert(Number.isFinite(coordinate));
  });
  assert(meshes <= (level < 2 ? 15 : level < 4 ? 17 : 19), 'Architecture, planting, and artwork should remain batched');
  for (const material of artMaterials) {
    let found = false;
    group.traverse(object => { if (object.material === material) found = true; });
    assert(found, 'Both companion prints should be present');
  }
  assert.equal(group.children[0].position.z, [0, 8, 23, 35, 60, 86][level]);
  // Inspect actual bench cross-sections, including lower faces, after batching.
  group.updateMatrixWorld(true);
  const seats = [
    [-3.52,-1.65,'oak',-.01,.24,'oak',.23],
    [-6,-14.6,'stone',-.02,.41,'oak',.375],
    [-3.2,-14.6,'stone',-.02,.41,'oak',.375],
  ];
  if (level >= 2) {
    for (const x of [-6.2,6.2]) seats.push([x,-24.2,'stone',-.02,.37,'linen',.37]);
    for (const [x,z] of [[-6.4,-41.8],[6,-44],[0,-50.2]]) {
      for (const dx of [-.95,.95]) seats.push([x+dx,z,'stone',-.02,.42,'oak',.40]);
    }
  }
  if (level >= 4) for (const [x,z] of [[-9,-64],[-9,-75],[-5,-92],[5,-95]]) {
    seats.push([x,z,'stone',-.02,.47,'oak',.47]);
  }
  for (const [x,z,support,bottom,top,seat,seatBottom] of seats) {
    const previousSides = Object.values(materials).map(m => m.side);
    Object.values(materials).forEach(m => { m.side = THREE.DoubleSide; });
    const ray = new THREE.Raycaster(new THREE.Vector3(x,-.1,z+group.children[0].position.z), new THREE.Vector3(0,1,0),0,1.2);
    const hits = ray.intersectObject(group,true);
    for (const [material,height] of [[support,bottom],[support,top],[seat,seatBottom]]) {
      assert(hits.some(hit => hit.object.material === materials[material] && Math.abs(hit.point.y-height)<.002), `Stage ${level}: missing connected ${material} at ${x},${z}, height ${height}`);
    }
    assert(bottom <= 0 && top >= seatBottom-.001, 'Bench support connects floor to seat');
    Object.values(materials).forEach((m,i) => { m.side=previousSides[i]; });
  }
  console.log(`PASS: stage ${level + 1}, ${seats.length} seating support cross-sections touch ground and seats`);
  if (level >= 4) {
    let terrain;
    group.traverse(object => { if(object.material === materials.landscape) terrain=object; });
    assert(terrain && terrain.geometry.attributes.color, 'Landscape needs broad color variation');
    terrain.geometry.computeBoundingBox();
    assert(terrain.geometry.boundingBox.max.y > 30, 'Distant terrain includes actual mountain ridges');
    assert(terrain.geometry.attributes.position.count <= 128*128*6, 'Mountain terrain remains bounded at 32K triangles');
    assert.equal(terrain.castShadow, false, 'Distant terrain does not add a shadow pass');
    group.updateMatrixWorld(true);
    const walls = [];
    group.traverse(object => { if (object.material === materials.plaster) walls.push(object); });
    const origin = new THREE.Vector3(0, 1.65, 0);
    const forward = new THREE.Raycaster(origin, new THREE.Vector3(0,0,-1), 0, 100);
    assert.equal(forward.intersectObjects(walls, false).length, 0, 'Final stages deliberately reveal the horizon');
    const up = new THREE.Raycaster(origin, new THREE.Vector3(0,1,0));
    assert.equal(up.intersectObject(group, true).length, 0, 'No overhead structures');
    const down = new THREE.Raycaster(origin, new THREE.Vector3(0,-1,0));
    const floor = down.intersectObject(group, true)[0];
    assert(floor && Math.abs(floor.point.y) < .05, 'Viewpoint is on a level dry path');
    for (const x of [-1,0,1]) for (const z of [-2,0,2]) {
      const ray = new THREE.Raycaster(new THREE.Vector3(x,1.65,z), new THREE.Vector3(0,-1,0));
      assert(Math.abs(ray.intersectObject(group,true)[0].point.y) < .05, 'Clear standing area around viewpoint');
    }
    console.log(`PASS: stage ${level + 1}, intentional horizon, dry level viewpoint, clear sky`);
  }
  if (level >= 2 && level < 4) {
    group.updateMatrixWorld(true);
    const walls = [];
    group.traverse(object => { if (object.material === materials.plaster) walls.push(object); });
    for (const height of [1.2, 1.65, 2.1]) for (let degrees = 0; degrees < 360; degrees += 2) {
      const a = degrees * Math.PI / 180;
      const ray = new THREE.Raycaster(new THREE.Vector3(0, height, 0), new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), 0, 60);
      assert(ray.intersectObjects(walls, false).length, `New stage ${level} has unintended horizon gap at ${degrees} degrees`);
    }
    const forward = new THREE.Raycaster(new THREE.Vector3(0, 1.65, 0), new THREE.Vector3(0,0,-1));
    const forwardWall = forward.intersectObjects(walls, false)[0];
    assert(forwardWall.distance > 15, 'The forward opening should reveal the larger garden');
    const side = new THREE.Raycaster(new THREE.Vector3(0, 1.65, 0), new THREE.Vector3(1,0,0));
    const sideWall = side.intersectObjects(walls, false)[0];
    assert(Math.abs(sideWall.distance - (level === 2 ? 7.96 : 12.35)) < .1, 'Garden should be wider than sheltered terrace');
    const up = new THREE.Raycaster(new THREE.Vector3(0, 1.65, 0), new THREE.Vector3(0,1,0));
    assert.equal(up.intersectObject(group, true).length, 0, 'New stages should remain open to sky');
    console.log(`PASS: stage ${level + 1}, connected boundaries, open garden sightline, clear sky`);
  }
  if (level === 1) {
    group.updateMatrixWorld(true);
    const walls = [];
    group.traverse(object => { if (object.material === materials.plaster) walls.push(object); });
    for (const [x, z] of [[0, 0], [-6, -2], [6, -2]]) {
      for (const height of [1.2, 1.65, 2.1]) for (let degrees = 0; degrees < 360; degrees += 2) {
        const a = degrees * Math.PI / 180;
        const ray = new THREE.Raycaster(new THREE.Vector3(x, height, z), new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), 0, 35);
        assert(ray.intersectObjects(walls, false).length, `Horizon gap from ${x},${height},${z} at ${degrees} degrees`);
      }
    }
    for (const z of [-6, -3, 0]) {
      const up = new THREE.Raycaster(new THREE.Vector3(-4.6, 2.9, z), new THREE.Vector3(0, 1, 0));
      assert.equal(up.intersectObject(group, true).length, 0, 'Courtyard should have no overhead trellis');
    }
    console.log('PASS: courtyard enclosed at seated/standing eye heights; trellis removed');
  }
  if (level === 0) {
    group.updateMatrixWorld(true);
    const origin = new THREE.Vector3(0, 1.65, 0);
    for (const material of artMaterials) {
      let print;
      group.traverse(object => { if (object.material === material) print = object; });
      const bounds = new THREE.Box3().setFromObject(print);
      assert(bounds.max.z < 3.86 && bounds.min.z > 3.7, 'Print must sit in front of the back wall opposite the garden');
      // Sample near all four edges and the center, not merely the existence of a mesh.
      for (const u of [.03, .5, .97]) for (const v of [.03, .5, .97]) {
        const target = new THREE.Vector3(THREE.MathUtils.lerp(bounds.min.x, bounds.max.x, v), THREE.MathUtils.lerp(bounds.min.y, bounds.max.y, u), bounds.min.z);
        const ray = new THREE.Raycaster(origin, target.sub(origin).normalize());
        const hit = ray.intersectObject(group, true)[0];
        assert.equal(hit?.object.material, material, 'Artwork must not be occluded by architecture, frame, or seating');
      }
    }
  }
  result.update(10);
  let water;
  group.traverse(object => { if (object.material?.name === 'Courtyard water') water = object; });
  assert(water, 'Pool surface should exist');
  assert.equal(water.material.transparent, false, 'Water must not require transparent sorting');
  assert.equal(water.material.metalness, 0, 'Water is a dielectric, not a metal');
  assert.equal(water.geometry.attributes.position.count, 4, 'Water stays a two-triangle surface');
  const shader = {
    uniforms: {},
    vertexShader: THREE.ShaderLib.standard.vertexShader,
    fragmentShader: THREE.ShaderLib.standard.fragmentShader,
  };
  water.material.onBeforeCompile(shader);
  assert(shader.vertexShader.includes('waterTangent = normalize(normalMatrix'));
  assert(shader.fragmentShader.includes('normal = normalize(normal - waterSlope.x'));
  assert(shader.fragmentShader.includes('diffuseColor.rgb = basinColor'));
  assert(shader.fragmentShader.includes('fwidth(phase)'));
  assert.equal(shader.uniforms.retreatTime.value, 10);
  result.update(12);
  assert.equal(shader.uniforms.retreatTime.value, 12, 'Animation updates the existing uniform');
  console.log(`PASS: environment ${level}, finite geometry, ${meshes} batches, correct viewpoint offset`);
}
