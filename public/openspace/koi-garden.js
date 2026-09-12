import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function buildKoiGarden(root, materials, sourceWater) {
  const group = new THREE.Group();
  group.name = 'Open Garden / koi and tree';
  root.add(group);
  const add = (geometry, material, x, y, z) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x,y,z); mesh.receiveShadow = true;
    group.add(mesh); return mesh;
  };
  const pond = new THREE.Vector3(5.2, 0, -39);
  // A closed stone rim with a real basin, not an opaque disc hiding the fish.
  // Reverse the cross-section winding so the outside faces outward, the top
  // faces up, and the basin wall faces inward. Back-face culling otherwise
  // makes a complete ring appear split open when viewed from above.
  const profile = [[3,-.22],[3,.33],[3.04,.38],[3.23,.38],[3.28,.33],[3.28,-.22],[3,-.22]].reverse();
  const rim = add(new THREE.LatheGeometry(profile.map(([x,y])=>new THREE.Vector2(x,y)),96,0,Math.PI*2),materials.stone,pond.x,0,pond.z);
  rim.name = 'Closed circular pond rim';
  const basin = add(new THREE.CircleGeometry(3,96), new THREE.MeshStandardMaterial({color:'#536f62',roughness:1}),pond.x,-.20,pond.z);
  basin.rotation.x = -Math.PI/2;
  const waterMaterial = sourceWater.clone();
  waterMaterial.name = 'Round koi pond water';
  waterMaterial.transparent = true; waterMaterial.opacity = .36;
  waterMaterial.depthWrite = false;
  waterMaterial.envMapIntensity = .6;
  waterMaterial.onBeforeCompile = shader => {
    sourceWater.onBeforeCompile(shader);
    shader.fragmentShader = shader.fragmentShader.replace(
      'min(2.175 - abs(p.x), 4.025 - abs(p.y))', '3.0 - length(p)');
  };
  waterMaterial.customProgramCacheKey = () => 'round-koi-water-v1';
  const water = add(new THREE.CircleGeometry(3,96),waterMaterial,pond.x,.29,pond.z);
  water.rotation.x=-Math.PI/2; water.renderOrder=2;
  const fishMaterial = new THREE.MeshStandardMaterial({vertexColors:true,roughness:.46});
  const bodyGeometry = new THREE.SphereGeometry(1,24,12);
  bodyGeometry.scale(.115,.075,.38);
  const colors=[]; const p=bodyGeometry.attributes.position;
  const orange=new THREE.Color('#d95a24'), ivory=new THREE.Color('#fff2d9'), dark=new THREE.Color('#202a25');
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    let color=Math.sin(z*26+x*32)+Math.cos(y*48-z*14)>.2?orange:ivory;
    if(z>.22&&z<.3&&Math.abs(x)>.065&&y>.005) color=dark;
    colors.push(color.r,color.g,color.b);
  }
  bodyGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const bodies=new THREE.InstancedMesh(bodyGeometry,fishMaterial,4);
  bodies.name='Four koi'; group.add(bodies);
  const finMaterial=new THREE.MeshStandardMaterial({color:'#ecd4aa',roughness:.55});
  const finParts=[-1,1].map(side=>{
    const g=new THREE.SphereGeometry(1,12,6); g.scale(.10,.012,.14);
    g.rotateY(side*.6); g.translate(side*.06,0,-.09); return g;
  });
  const tails=new THREE.InstancedMesh(mergeGeometries(finParts),finMaterial,4);
  finParts.forEach(g=>g.dispose()); group.add(tails);
  const dummy=new THREE.Object3D();
  function update(t) {
    for(let i=0;i<4;i++) {
      const angle=t*(.10+i*.012)+i*1.57, radius=1.0+i*.38;
      const x=pond.x+Math.cos(angle)*radius,z=pond.z+Math.sin(angle)*radius*.78;
      const yaw=Math.atan2(-Math.sin(angle),.78*Math.cos(angle));
      dummy.position.set(x,.15+.018*Math.sin(t*.7+i),z);
      dummy.rotation.set(0,yaw,0); dummy.scale.setScalar(.9+i*.08); dummy.updateMatrix();
      bodies.setMatrixAt(i,dummy.matrix);
      dummy.translateZ(-.34);
      dummy.rotation.y+=Math.sin(t*3+i)*.32; dummy.updateMatrix(); tails.setMatrixAt(i,dummy.matrix);
    }
    bodies.instanceMatrix.needsUpdate=true; tails.instanceMatrix.needsUpdate=true;
    bodies.computeBoundingSphere(); tails.computeBoundingSphere();
  }
  update(0);
  // Fine curved leaves in a single instanced draw, with a branched woody trunk.
  const branches=[];
  function branch(a,b,r1,r2) {
    const delta=b.clone().sub(a);
    const g=new THREE.CylinderGeometry(r2,r1,delta.length(),12);
    const matrix=new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(.5),
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()),new THREE.Vector3(1,1,1));
    g.applyMatrix4(matrix); branches.push(g);
  }
  const base=new THREE.Vector3(-6.5,.24,-35.2);
  const crown=base.clone().add(new THREE.Vector3(.2,2.25,.1));
  branch(base,crown,.14,.055);
  const clusters=[];
  for(let i=0;i<9;i++) {
    const a=i*2.39996;
    const tip=base.clone().add(new THREE.Vector3(Math.cos(a)*(1.0+i*.06),2.45+Math.sin(i*2)*.4,Math.sin(a)*(1.0+i*.06)));
    branch(base.clone().lerp(crown,.55+(i%3)*.12),tip,.055,.012);
    clusters.push([tip.x,tip.y+.25,tip.z,.85,.55]);
  }
  const wood=add(mergeGeometries(branches),materials.oak,0,0,0);wood.castShadow=true;
  branches.forEach(g=>g.dispose());
  // Low rounded shrubs contrast with the taller grasses and tree canopy.
  clusters.push([-6.7,.75,-46.7,1.8,.6],[6.2,.7,-47.5,1.7,.5],[-9.8,.65,-40.5,.9,.45]);
  const leafGeometry=new THREE.PlaneGeometry(1,1,4,2);
  const lp=leafGeometry.attributes.position;
  for(let i=0;i<lp.count;i++) {
    const t=lp.getY(i)+.5;
    lp.setXYZ(i,lp.getX(i)*Math.sin(Math.PI*t)*.13,(t-.5)*.28,.045*Math.sin(Math.PI*t));
  }
  leafGeometry.computeVertexNormals();
  const foliageMaterial=new THREE.MeshStandardMaterial({color:'#668255',roughness:.9,side:THREE.DoubleSide});
  const leaves=new THREE.InstancedMesh(leafGeometry,foliageMaterial,clusters.length*180);
  leaves.name='Tree canopy and broadleaf shrubs';
  clusters.forEach(([x,y,z,r,h],c)=>{
    for(let i=0;i<180;i++) {
      const a=i*2.39996, v=1-2*(i+.5)/180, ring=Math.sqrt(1-v*v);
      dummy.position.set(x+Math.cos(a)*ring*r,y+v*h,z+Math.sin(a)*ring*r);
      dummy.rotation.set(.5*Math.sin(i),a,.5*Math.cos(i*3));
      dummy.scale.setScalar(1+(c>=9?.6:0));dummy.updateMatrix();leaves.setMatrixAt(c*180+i,dummy.matrix);
      leaves.setColorAt(c*180+i,new THREE.Color().setHSL(.23+(c%3)*.015,.22,.26+.12*(.5+.5*Math.sin(i*7))));
    }
  });
  leaves.castShadow=true;group.add(leaves);
  const flowers=new THREE.InstancedMesh(new THREE.SphereGeometry(1,8,6),
    new THREE.MeshStandardMaterial({color:'#9982af',roughness:1}),100);
  const stems=new THREE.InstancedMesh(new THREE.CylinderGeometry(.007,.009,1,5),foliageMaterial,100);
  flowers.name='Soft violet flower spikes';
  for(let i=0;i<100;i++) {
    const a=i*2.39996,r=Math.sqrt((i%50+.5)/50)*1.4;
    const x=i<50?-6.7:6.2,z=i<50?-46.7:-47.5;
    dummy.position.set(x+Math.cos(a)*r,.85+.18*Math.sin(i*1.7),z+Math.sin(a)*r);
    dummy.rotation.set(0,a,.12*Math.sin(i));dummy.scale.set(.035,.1,.035);
    dummy.updateMatrix();flowers.setMatrixAt(i,dummy.matrix);
    const height=dummy.position.y-.247;
    dummy.position.y=.247+height/2;
    dummy.rotation.set(0,0,0);dummy.scale.set(1,height,1);
    dummy.updateMatrix();stems.setMatrixAt(i,dummy.matrix);
  }
  group.add(flowers,stems);
  return {update,group,water,bodies,setDetailedFish(visible) { bodies.visible=!visible; tails.visible=!visible; }};
}
