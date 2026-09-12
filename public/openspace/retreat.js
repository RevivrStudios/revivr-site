import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { loadWallArt } from './wall-art.js';
import { softenTerrainTiling } from './terrain-material.js';
import { buildKoiGarden } from './koi-garden.js';
import { buildWildlife } from './wildlife.js';

// Metre-scale architectural scene. No screen-space effects or stereo-unsafe reflections.
const loader = new THREE.TextureLoader();
let materials;
const assetsReady = Promise.all([
  ...['wood_floor', 'white_plaster_02'].flatMap(id => ['Diffuse', 'nor_gl', 'Rough'].map(async channel => {
    const texture = await loader.loadAsync(`./assets/retreat/${id}_${channel}.jpg`);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 4;
    if (channel === 'Diffuse') texture.colorSpace = THREE.SRGBColorSpace;
    const repeat = id === 'wood_floor' ? 3 : 2;
    texture.repeat.set(repeat, repeat);
    return texture;
  })),
]).then(([wood, woodNormal, woodRough, plaster, plasterNormal, plasterRough]) => {
  const material = props => {
    const m = new THREE.MeshStandardMaterial(props);
    m.userData.shared = true;
    return m;
  };
  // Painted ivory stucco: retain fine surface relief without the gray photographic
  // mottling used on the stone. Clone UV settings so floors remain unchanged.
  const stuccoNormal = plasterNormal.clone();
  stuccoNormal.repeat.set(8, 8);
  stuccoNormal.needsUpdate = true;
  materials = {
    plaster: material({ color: '#eed9bb', normalMap: stuccoNormal, normalScale: new THREE.Vector2(.075, .075), roughness: 1, metalness: 0 }),
    oak: material({ color: '#d7bb90', map: wood, normalMap: woodNormal, normalScale: new THREE.Vector2(.22, .22), roughnessMap: woodRough, roughness: .8 }),
    stone: material({ color: '#dad7cb', map: plaster, normalMap: plasterNormal, normalScale: new THREE.Vector2(.28, .28), roughness: .85 }),
    linen: material({ color: '#e7ded0', normalMap: plasterNormal, normalScale: new THREE.Vector2(.12, .12), roughness: 1 }),
    teal: material({ color: '#6d9993', roughness: 1 }),
    bronze: material({ color: '#51483b', metalness: .6, roughness: .42 }),
    soil: material({ color: '#474334', roughness: 1 }),
    leaf: material({ color: '#75865a', roughness: .8, side: THREE.DoubleSide }),
  };
}).catch(error => { console.error('Retreat materials could not load', error); throw error; });

let laterAssets;
export function preloadLaterRetreat() {
  return laterAssets ||= assetsReady.then(async () => {
    const maps = await Promise.all(['Diffuse','nor_gl','Rough'].map(async channel => {
      const texture = await loader.loadAsync(`./assets/retreat/grass_path_2_${channel}.jpg`);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(115,115); texture.anisotropy = 4;
      if(channel === 'Diffuse') texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }));
    materials.landscape = new THREE.MeshStandardMaterial({color:'#c0c3a0',map:maps[0],normalMap:maps[1],normalScale:new THREE.Vector2(.15,.15),roughnessMap:maps[2],roughness:1,vertexColors:true});
    materials.landscape.userData.shared = true;
    softenTerrainTiling(materials.landscape);
  }).catch(error => { laterAssets = null; throw error; });
}

export async function buildRetreat(group, level) {
  await assetsReady;
  if(level >= 4) await preloadLaterRetreat();
  const artMaterials = await loadWallArt();
  const m = materials;
  const root = new THREE.Group();
  let koiGarden = null;
  // Fixed, metre-scale viewpoints in a connected sequence; never move the camera for the user.
  root.position.z = [0, 8, 23, 35, 60, 86][level];
  root.userData.stage = level;
  group.add(root);
  function mesh(geo, mat, x, y, z) {
    const obj = new THREE.Mesh(geo, mat);
    obj.position.set(x, y, z); obj.castShadow = true; obj.receiveShadow = true;
    root.add(obj); return obj;
  }
  function box(w, h, d, x, y, z, mat = m.plaster, radius = .035) {
    return mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w/3, h/3, d/3)), mat, x, y, z);
  }
  function cylinder(rt, rb, h, x, y, z, mat) {
    return mesh(new THREE.CylinderGeometry(rt, rb, h, 40), mat, x, y, z);
  }
  // Ground and thresholds: slightly raised structure prevents coplanar surfaces.
  box(110, .12, 110, 0, -.23, -18, m.stone);
  box(9, .18, 9, 0, -.09, -.5, m.oak);
  box(17, .16, 15, 0, -.09, -12, m.stone);
  box(6.2, .05, .48, 0, .025, -5, m.stone);
  // A generous portal frames the garden; roof and side walls make the first space a room.
  box(.28, 3.6, 9, -4.5, 1.8, -.5);
  box(.28, 3.6, 9, 4.5, 1.8, -.5);
  box(9, 3.6, .28, 0, 1.8, 4);
  box(9.3, .22, 9.3, 0, 3.65, -.5);
  box(1.5, 3.6, .35, -3.85, 1.8, -5);
  box(1.5, 3.6, .35, 3.85, 1.8, -5);
  box(6.3, .46, .35, 0, 3.37, -5);
  // Thin bronze reveals define the aperture without a heavy window grid.
  [-3.08, 3.08].forEach(x => box(.045, 3.1, .4, x, 1.55, -5, m.bronze));
  // Center the pair on the plain back wall opposite the garden opening.
  // Face into the room (-Z), clear of the wall's interior face at Z=3.86.
  const paper = new THREE.MeshStandardMaterial({color: '#faf5e9', roughness: 1});
  [.65, -.65].forEach((x, index) => {
    box(1.14, 1.14, .065, x, 1.95, 3.81, m.oak, .012).rotation.y = Math.PI;
    box(1.075, 1.075, .012, x, 1.95, 3.77, paper, .003).rotation.y = Math.PI;
    const print = mesh(new THREE.PlaneGeometry(.86, .86), artMaterials[index], x, 1.95, 3.762);
    print.rotation.y = Math.PI;
    print.castShadow = false;
  });
  // Slatted oak wall and built-in seating, with rounded cushions rather than hard blocks.
  for (let i = 0; i < 30; i++) box(.055, 2.75, .065, -4.30, 1.65, -3.6 + i * .21, m.oak);
  box(1.06, .22, 3.5, -3.52, .34, -1.65, m.oak);
  // Inset plinth connects the sofa frame to the room floor.
  box(.82, .25, 3.22, -3.52, .115, -1.65, m.oak, .015);
  box(.88, .25, 3.25, -3.45, .55, -1.65, m.linen, .10);
  box(.23, .74, 3.25, -3.95, .85, -1.65, m.linen, .09);
  const pillow = box(.3, .48, .62, -3.72, .942, -2.5, m.teal, .12);
  pillow.rotation.z = -.2;
  // Low monolithic table: softly rounded top and inset base.
  box(1.15, .13, 1.85, -1.9, .48, -2.0, m.stone, .06);
  box(.7, .4, 1.15, -1.9, .21, -2.0, m.stone);
  cylinder(.14, .12, .21, -1.95, .65, -2.25, m.linen);
  box(.24, .018, .34, -1.75, .56, -1.55, m.teal, .005);
  // Built-in opposite shelf and a tall ceramic vessel.
  box(.48, .07, 3.8, 4.08, .82, -.6, m.oak);
  cylinder(.19, .23, .62, 4.06, 1.17, -1.3, m.stone);
  // Shelf objects sit on its .855m top; a small framed print faces into the room.
  box(.065, .48, .39, 4.04, 1.095, .35, m.oak, .008);
  box(.012, .425, .335, 4.001, 1.095, .35, paper, .002);
  const shelfArt = artMaterials[1].clone();
  shelfArt.userData.shared = false;
  const shelfPrint = mesh(new THREE.PlaneGeometry(.28, .37), shelfArt, 3.993, 1.095, .35);
  shelfPrint.rotation.y = -Math.PI / 2;
  shelfPrint.castShadow = false;
  box(.30, .045, .48, 4.03, .878, -.35, m.teal, .004);
  box(.28, .035, .44, 4.03, .918, -.32, paper, .003);
  // Restrained coral flowers, with rounded petals and separate green stems.
  const petals = new THREE.MeshStandardMaterial({color:'#dc917e', roughness:.9});
  for (let i=0; i<5; i++) {
    const angle=i*2.39996, x=4.06+Math.cos(angle)*.12, z=-1.3+Math.sin(angle)*.12;
    const top=1.78+.08*Math.sin(i*2);
    cylinder(.008,.008,top-1.43,x,(top+1.43)/2,z,m.leaf);
    for(let p=0;p<5;p++) {
      const a=p*Math.PI*2/5;
      const petal=mesh(new THREE.SphereGeometry(1,12,8),petals,x+Math.cos(a)*.045,top,z+Math.sin(a)*.045);
      petal.scale.set(.055,.025,.04); petal.rotation.y=-a;
    }
    mesh(new THREE.SphereGeometry(.023,12,8),m.linen,x,top+.015,z);
  }
  // Continuous enclosure, open only above. Return walls overlap the building
  // and perimeter so neither rounded edges nor their junctions expose the horizon.
  box(.28, 2.8, 14.5, -8.1, 1.4, -12);
  box(.28, 2.8, 14.5, 8.1, 1.4, -12);
  if (level < 2) {
    box(16.5, 2.8, .28, 0, 1.4, -19.2);
  } else {
    // A purposeful doorway connects the terrace back to the original courtyard.
    [-4.95, 4.95].forEach(x => box(6.6, 2.8, .28, x, 1.4, -19.2));
  }
  [-6.3, 6.3].forEach(x => box(3.9, 2.8, .32, x, 1.4, -4.9));
  // Recessed garden alcove and framed vertical oak screen at the end of the sightline.
  if (level < 2) {
    box(5.2, 2.25, .18, -1, 1.2, -18.99, m.oak);
    for (let i = 0; i < 31; i++) box(.065, 2.35, .16, -3.45 + i * .16, 1.2, -18.8, m.oak);
  }
  // Freestanding bench; no overhead trellis or support posts.
  box(3.8, .19, .78, -4.6, .47, -14.6, m.oak);
  [-6, -3.2].forEach(x => box(.18, .43, .65, x, .195, -14.6, m.stone));
  // Reflecting pool offset to the right keeps a clear, legible route through the space.
  box(4.7, .14, 8.4, 3.9, .015, -11.1, m.stone);
  // Opaque optical approximation: existing environment-map reflections, no refraction
  // targets, scene copies, transparency sorting, or additional stereo render passes.
  const waterMaterial = new THREE.MeshStandardMaterial({color: '#638f8d', metalness: 0, roughness: .13, envMapIntensity: 1.25});
  waterMaterial.name = 'Courtyard water';
  waterMaterial.extensions = { derivatives: true };
  const time = { value: 0 };
  waterMaterial.customProgramCacheKey = () => 'retreat-water-layered-v2';
  waterMaterial.onBeforeCompile = shader => {
    shader.uniforms.retreatTime = time;
    const varyings = `
      varying vec2 waterPosition;
      varying vec3 waterTangent;
      varying vec3 waterBitangent;
    `;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\n' + varyings);
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      waterPosition = position.xy;
      waterTangent = normalize(normalMatrix * vec3(1.0, 0.0, 0.0));
      waterBitangent = normalize(normalMatrix * vec3(0.0, 1.0, 0.0));
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
      #include <common>
      ${varyings}
      uniform float retreatTime;
      // Analytic wave slopes; filter fine detail as its projected size shrinks.
      vec2 poolWave(vec2 p, vec2 direction, float frequency, float speed, float amplitude) {
        float phase = dot(p, direction) * frequency + retreatTime * speed;
        float filterWeight = 1.0 - smoothstep(0.35, 1.4, fwidth(phase));
        return direction * (amplitude * frequency * cos(phase) * filterWeight);
      }
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      #include <map_fragment>
      vec2 p = waterPosition;
      vec2 waterSlope = poolWave(p, vec2(0.94, 0.34), 4.2, 0.48, 0.011)
                      + poolWave(p, vec2(-0.45, 0.89), 7.1, -0.37, 0.006)
                      + poolWave(p, vec2(0.71, 0.71), 13.0, 0.63, 0.002)
                      + poolWave(p, vec2(-0.8, 0.6), 21.0, -0.51, 0.0007);
      float edgeDistance = min(2.175 - abs(p.x), 4.025 - abs(p.y));
      float depthTint = smoothstep(0.02, 0.8, edgeDistance);
      vec3 basinColor = mix(vec3(0.24, 0.40, 0.34), vec3(0.055, 0.19, 0.18), depthTint);
      // Restrained moving light pattern, suggesting the basin beneath the surface.
      vec2 causticPosition = p + waterSlope * 1.5;
      float causticPhaseA = dot(causticPosition, vec2(4.7, 3.1)) + retreatTime * 0.24;
      float causticPhaseB = dot(causticPosition, vec2(-3.5, 5.3)) - retreatTime * 0.19;
      float caustic = pow(max(0.0, sin(causticPhaseA) * sin(causticPhaseB)), 5.0);
      float causticFilter = 1.0 - smoothstep(0.2, 0.9, max(fwidth(causticPhaseA), fwidth(causticPhaseB)));
      diffuseColor.rgb = basinColor + vec3(0.045, 0.055, 0.04) * caustic * causticFilter;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `
      #include <normal_fragment_maps>
      normal = normalize(normal - waterSlope.x * waterTangent - waterSlope.y * waterBitangent);
    `);
  };
  const water = mesh(new THREE.PlaneGeometry(4.35, 8.05), waterMaterial, 3.9, .10, -11.1);
  water.rotation.x = -Math.PI / 2; water.castShadow = false;
  // A clean row of planted islands adds detail at human scale.
  function planter(x, z, radius = .65) {
    cylinder(radius, radius * .82, .58, x, .28, z, m.stone);
    cylinder(radius * .9, radius * .9, .02, x, .58, z, m.soil);
    const blade = new THREE.PlaneGeometry(.07, 1, 1, 5);
    const positions = blade.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const t = positions.getY(i) + .5;
      positions.setXYZ(i, positions.getX(i) * (1 - t * .9), t, t * t * .35);
    }
    blade.computeVertexNormals();
    const leaves = new THREE.InstancedMesh(blade, m.leaf, 72);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 72; i++) {
      const a = i * 2.39996, r = Math.sqrt(i / 72) * radius * .65;
      dummy.position.set(x + Math.cos(a)*r, .57, z + Math.sin(a)*r);
      dummy.rotation.set(.1, a, Math.sin(i)*.25);
      dummy.scale.set(1, .55 + .5 * (.5 + .5*Math.sin(i*17)), 1);
      dummy.updateMatrix(); leaves.setMatrixAt(i, dummy.matrix);
    }
    leaves.castShadow = true; root.add(leaves);
  }
  planter(3.35, -3.6, .48);
  planter(-6.1, -8.1, .75);
  planter(-6.1, -11.0, .75);
  planter(.15, -16.8, .8);
  if (level >= 2) {
    // Stage 3: sheltered terrace, with walls at human scale and one broad garden opening.
    box(16.5, .16, 10.2, 0, -.09, -24.2, m.stone);
    [-8.1, 8.1].forEach(x => box(.28, 2.5, 10.35, x, 1.25, -24.2));
    // Returns join the wider garden perimeter: no accidental sideways horizon gaps.
    [-7.8, 7.8].forEach(x => box(9.6, 2.5, .32, x, 1.25, -29.2));
    box(5.7, .025, .8, 0, .018, -29.2, m.oak);
    // Low upholstered built-ins frame the view without enclosing it overhead.
    [-6.2, 6.2].forEach(x => {
      box(1.15, .39, 3.5, x, .175, -24.2, m.stone);
      box(1.05, .18, 3.3, x, .46, -24.2, m.linen, .07);
      box(.22, .55, 3.3, x + Math.sign(x)*.49, .73, -24.2, m.linen, .08);
      cylinder(.34, .27, .46, x - Math.sign(x)*1.15, .23, -24.0, m.stone);
    });
    // Stage 4: noticeably broader garden, with a continuous, more distant boundary.
    box(25.2, .16, 24.2, 0, -.09, -41.2, m.stone);
    [-12.5, 12.5].forEach(x => box(.3, 2.2, 24.4, x, 1.1, -41.2));
    if (level < 4) {
      box(25.3, 2.2, .3, 0, 1.1, -53.2);
    } else {
      // Reveal the terrace through a deliberate six-metre opening.
      [-7.9, 7.9].forEach(x => box(9.5, 2.2, .3, x, 1.1, -53.2));
    }
    // Pale path insets establish distance and keep the central route legible and level.
    for (let i = 0; i < 13; i++) box(3.6, .016, 1.55, 0, .003, -30.8 - i*1.7, m.linen, .003);
    box(22.8, .018, 1.8, 0, .004, -43.6, m.linen, .004);
    // Repeat the approved pool treatment beside the path, not under the viewpoint.
    // The same garden must be visible when approaching and looking back.
    koiGarden = buildKoiGarden(root, m, waterMaterial);
    // Stone-edged, softly rounded planting islands replace generic tree silhouettes.
    const beds = [
      [-4.4,-27,1.7,1.0], [4.4,-27,1.7,1.0],
      [-6.5,-35.2,3.4,2.7], [-6.5,-46.7,3.4,3.0],
      [6.2,-47.5,3.5,2.7], [9.5,-33.0,1.4,2.2],
      [-9.8,-40.5,1.1,2.0],
    ];
    beds[2] = [-6.5,-35.2,2.5,2.5];
    if (level >= 4) beds.push(
      [-12,-58,3.8,2.2], [-12,-70,4.6,2.7], [14,-73,3.5,2.2],
    );
    for (const [x,z,rx,rz] of beds) {
      const curb = cylinder(1, 1, .25, x, .105, z, m.stone);
      curb.scale.set(rx, 1, rz);
      const soil = cylinder(1, 1, .018, x, .236, z, m.soil);
      soil.scale.set(rx-.12, 1, rz-.12);
    }
    const blade = new THREE.PlaneGeometry(.08, 1, 1, 4);
    const vertices = blade.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const t = vertices.getY(i)+.5;
      vertices.setXYZ(i, vertices.getX(i)*(1-.92*t), t, .3*t*t);
    }
    blade.computeVertexNormals();
    const grasses = new THREE.InstancedMesh(blade, m.leaf, beds.length*220);
    const dummy = new THREE.Object3D();
    beds.forEach(([x,z,rx,rz], b) => {
      for (let i=0;i<220;i++) {
        const a = i*2.39996, r=Math.sqrt((i+.5)/220)*.88;
        dummy.position.set(x+Math.cos(a)*r*rx, .247, z+Math.sin(a)*r*rz);
        dummy.rotation.set(.08, a, .15*Math.sin(i*3));
        dummy.scale.set(.8, .45+.4*(.5+.5*Math.sin(i*13+b)), 1);
        if (b >= 2 && b < 7) {
          dummy.scale.multiplyScalar(b === 2 ? .35 : b === 5 ? 1.2 : .48);
        }
        dummy.updateMatrix(); grasses.setMatrixAt(b*220+i, dummy.matrix);
      }
    });
    grasses.castShadow = true; grasses.receiveShadow = true; root.add(grasses);
    // A few quiet seating destinations maintain human scale across the larger garden.
    for (const [x,z] of [[-6.4,-41.8], [6.0,-44.0], [0,-50.2]]) {
      box(2.7, .16, .74, x, .48, z, m.oak);
      [-.95,.95].forEach(dx => box(.19, .44, .62, x+dx, .2, z, m.stone));
    }
  }
  if (level >= 4) {
    // Stage 5: low-walled reflecting terrace, joined to the garden with
    // continuous returns. The horizon is intentionally visible above it.
    box(40.4, .16, 25.2, 0, -.09, -65.7, m.stone);
    [-16.3, 16.3].forEach(x => box(7.7, 1.05, .32, x, .525, -53.2));
    [-20, 20].forEach(x => box(.32, 1.05, 25.4, x, .525, -65.7));
    [-11.6, 11.6].forEach(x => box(17, 1.05, .32, x, .525, -78.2));
    box(6.2, .025, 44, 0, .012, -75.2, m.linen, .005);
    box(8.5, .14, 12.5, 10, .015, -64.6, m.stone);
    const reflectingWater = mesh(new THREE.PlaneGeometry(4.35, 8.05), waterMaterial, 10, .1, -64.6);
    reflectingWater.rotation.x = -Math.PI / 2;
    reflectingWater.scale.set(1.86, 1.5, 1);
    reflectingWater.castShadow = false;
    for (const [x,z] of [[-9,-64],[-9,-75]]) {
      box(3.6, .49, .95, x, .225, z, m.stone, .045);
      box(3.4, .12, .82, x, .53, z, m.oak, .045);
    }
    // Stage 6: open outlook with familiar seating and a clear level path.
    const outlook = box(14, .16, 20, 0, -.09, -88.2, m.stone);
    outlook.userData.openVista = true;
    const landscapeMaterial = m.landscape;
    const terrain = new THREE.PlaneGeometry(460, 460, 128, 128);
    terrain.rotateX(-Math.PI / 2);
    const vertices = terrain.attributes.position;
    const colors = new Float32Array(vertices.count * 3);
    // Overlapping broad foothills and narrower distant ridges, leaving the
    // approach and architectural footprint flat. No separate skyline cards.
    const peaks = [
      [-100,-202,18,48,35], [0,-225,24,52,38], [98,-205,20,42,33],
      [-66,-265,32,37,23], [52,-279,39,40,25], [138,-255,27,30,24],
      [-178,-120,22,30,56], [180,-115,26,32,52],
    ];
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i), z = vertices.getZ(i) - 90;
      const distance = Math.hypot(x, z + 86);
      const clearArchitecture = Math.max(
        THREE.MathUtils.smoothstep(Math.abs(x), 22, 40),
        THREE.MathUtils.smoothstep(-z, 99, 130),
      );
      const rise = THREE.MathUtils.smoothstep(distance, 24, 100) * clearArchitecture;
      let mountains = 0;
      for (const [px,pz,h,sx,sz] of peaks) {
        mountains += h * Math.exp(-(((x-px)/sx)**2 + ((z-pz)/sz)**2));
      }
      const height = -.26 + rise * (1.7 + 1.2*Math.sin(x*.023 + z*.012)*Math.cos(z*.025) + mountains);
      vertices.setXYZ(i, x, height, z);
      // Broad meadow variation keeps distant land legible after detail mipmaps
      // fade, without additional texture samples or dense grass geometry.
      const patch = .78 + .14 * Math.sin(x*.057 + Math.sin(z*.031)*2) * Math.cos(z*.043)
        + .08 * Math.cos(x*.117 + z*.079);
      const rocky = THREE.MathUtils.smoothstep(height, 8, 30);
      colors.set([patch, patch*(1-.09*rocky), patch*(.92-.06*rocky)], i*3);
    }
    terrain.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    terrain.computeVertexNormals();
    const landscape = mesh(terrain, landscapeMaterial, 0, 0, 0);
    landscape.castShadow = false;
    landscape.userData.openVista = true;
  }
  // Keep the connected terrace, doorway and garden behind the final viewpoint.
  // The outlook itself has no benches or planters, leaving the vista ahead clear.
  // The old faceted tree asset is not loaded here.
  // Batch static architecture by material: slats are not dozens of draw calls.
  const batches = new Map();
  for (const child of [...root.children]) {
    if (!child.isMesh || child.isInstancedMesh || child.material === waterMaterial) continue;
    child.updateMatrix();
    const geometry = (child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone()).applyMatrix4(child.matrix);
    const list = batches.get(child.material) || [];
    list.push(geometry); batches.set(child.material, list);
    child.geometry.dispose(); root.remove(child);
  }
  for (const [material, geometries] of batches) {
    const geometry = mergeGeometries(geometries, false);
    geometries.forEach(g => g.dispose());
    const batch = new THREE.Mesh(geometry, material);
    batch.castShadow = material !== m.landscape; batch.receiveShadow = true; root.add(batch);
  }
  const wildlife = level > 0 ? await buildWildlife(root, level, koiGarden) : null;
  return { update(t) { time.value = t; koiGarden?.update(t); wildlife?.update(t); } };
}
