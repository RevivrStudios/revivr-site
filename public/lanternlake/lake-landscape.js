import * as THREE from 'three';

export function buildLakeLandscape(scene) {
  const root=new THREE.Group();root.name='Natural lake shoreline';scene.add(root);
  // Continuous radial heightfields: rounded saddles, asymmetric ridges, no cones.
  for(let layer=0;layer<2;layer++) {
    const steps=256,bands=18,vertices=[],colors=[],indices=[];
    for(let j=0;j<=bands;j++)for(let i=0;i<=steps;i++) {
      const a=i/steps*Math.PI*2,t=j/bands;
      const shore=95+layer*90+10*Math.sin(a*3+.4)+7*Math.sin(a*7);
      const radius=shore+t*(85+layer*40);
      const ridge=24+layer*13+12*Math.sin(a*3+.7)**2+9*Math.sin(a*5+1.8)**2;
      const envelope=Math.sin(Math.PI*t)**1.3;
      const detail=2.1*Math.sin(a*23+t*12)+1.2*Math.sin(a*41-t*19);
      const y=-1+envelope*(ridge+detail);
      vertices.push(Math.sin(a)*radius,y,Math.cos(a)*radius);
      const c=new THREE.Color().setHSL(.25-layer*.02,.12,.25+layer*.09+.055*Math.sin(a*8+t*11));colors.push(c.r,c.g,c.b);
      if(i<steps&&j<bands){const k=j*(steps+1)+i;indices.push(k,k+steps+1,k+1,k+1,k+steps+1,k+steps+2);}
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();
    const mountain=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}));mountain.name='Continuous mountain ridge '+layer;root.add(mountain);
  }
  const blade=new THREE.PlaneGeometry(1,1,2,8),p=blade.attributes.position;
  for(let i=0;i<p.count;i++){const t=p.getY(i)+.5;p.setXYZ(i,p.getX(i)*.075*(1-t),t,.23*t*t);}
  blade.computeVertexNormals();
  const leaves=new THREE.InstancedMesh(blade,new THREE.MeshStandardMaterial({color:'#739265',roughness:.9,side:THREE.DoubleSide}),900);
  leaves.name='Curved waterside grasses';const dummy=new THREE.Object3D();
  for(let i=0;i<900;i++) {
    const clump=Math.floor(i/30),a=i*2.39996,side=clump%2?1:-1;
    dummy.position.set(side*(2.5+(clump%5)*.63)+Math.cos(a)*.22,-.14,12+(clump%15)*.82+Math.sin(a)*.22);
    dummy.rotation.set(0,a,Math.sin(i)*.14);dummy.scale.setScalar(.65+.55*(.5+.5*Math.sin(i*6.2)));dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);
    leaves.setColorAt(i,new THREE.Color().setHSL(.22+.025*Math.sin(i),.26,.34+.1*Math.sin(i*2)**2));
  }
  leaves.computeBoundingSphere();root.add(leaves);
  // Low wooded foothills soften the waterline, echoing the reference's layers.
  const crownGeo=new THREE.SphereGeometry(1,12,8);
  const cp=crownGeo.attributes.position,foliageColors=[];
  for(let i=0;i<cp.count;i++) {
    const x=cp.getX(i),y=cp.getY(i),z=cp.getZ(i);
    const bulge=1+.09*Math.sin(x*11+y*7)*Math.cos(z*9-y*5);
    cp.setXYZ(i,x*bulge,y*bulge,z*bulge);
    // Baked canopy occlusion: shaded undersides and small leaf-scale variation.
    const light=.42+.48*Math.pow((y+1)*.5,.65)+.07*Math.sin(x*17+z*13+y*9);
    foliageColors.push(light*.91,light,light*.86);
  }
  crownGeo.setAttribute('color',new THREE.Float32BufferAttribute(foliageColors,3));
  crownGeo.computeVertexNormals();
  const crowns=new THREE.InstancedMesh(crownGeo,new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:1,envMapIntensity:.25}),180*9);
  crowns.name='Distant wooded shoreline';
  let seed=731;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.12,.22,1,7),new THREE.MeshStandardMaterial({color:0x4d4838,roughness:1}),180);
  trunks.name='Irregular shoreline trunks';
  const ground=root.getObjectByName('Continuous mountain ridge 0');
  root.updateMatrixWorld(true);
  const groundRay=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
  const treeBases=[];
  // Stratified spacing prevents random coincident trunks within each grove.
  for(let i=0;i<180;i++) {
    const grove=Math.floor(i/9),a=grove/20*Math.PI*2+((i%9+random()*.5)/9-.5)*.26;
    const r=96.5+10*Math.sin(a*3+.4)+7*Math.sin(a*7)+random()*1.5;
    const h=4+random()**2*5,w=1.15+random()*.65;
    const x=Math.sin(a)*r,z=Math.cos(a)*r;
    // Sample the actual triangulated bank, not an unrelated slope estimate.
    // Keep roots slightly buried and trees in a shallow band beside the water.
    groundRay.ray.origin.set(x,100,z);
    const hit=groundRay.intersectObject(ground,false)[0];
    if(!hit)throw new Error('Shoreline tree has no supporting terrain');
    const base=hit.point.y-.15;
    treeBases.push({x,z});
    random(); // Keep the existing deterministic canopy variation sequence.
    dummy.position.set(x,base+h*.3,z);dummy.rotation.set(0,a,0);dummy.scale.set(1,h*.6,1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
    const shade=.24+random()*.1,hue=.26+random()*.055;
    for(let l=0;l<9;l++) {
      const tier=Math.floor(l/3),angle=l*2.39996+a,spread=w*(.72-tier*.18);
      dummy.position.set(x+Math.cos(angle)*spread,base+h*(.44+tier*.17)+(random()-.5)*.25,z+Math.sin(angle)*spread);
      dummy.rotation.set((random()-.5)*.12,random()*6.28,(random()-.5)*.12);
      const radius=w*(.42+random()*.18);
      dummy.scale.set(radius,Math.max(h*.12,radius*(1.1+random()*.45)),radius*(.85+random()*.25));dummy.updateMatrix();crowns.setMatrixAt(i*9+l,dummy.matrix);
      crowns.setColorAt(i*9+l,new THREE.Color().setHSL(hue,.3+random()*.1,shade+(tier-1)*.045+random()*.018));
    }
  }
  crowns.computeBoundingSphere();trunks.computeBoundingSphere();root.add(crowns,trunks);

  // Distant tussocks: five bent, tapered blades (15 triangles) per shared tuft.
  // No alpha cards, textures or per-frame animation needed at this distance.
  const tuftPositions=[],tuftIndices=[];
  for(let b=0;b<5;b++) {
    const a=b*2.39996,dx=Math.cos(a),dz=Math.sin(a),h=.6+(b%3)*.18;
    const sideX=-dz,sideZ=dx,offset=b*.017;
    const points=[[-.1,0,offset],[.1,0,offset],[-.045,h*.55,.14],[.045,h*.55,.14],[0,h,.35]];
    for(const [width,y,bend] of points)tuftPositions.push(sideX*width+dx*bend,y,sideZ*width+dz*bend);
    const k=b*5;tuftIndices.push(k,k+1,k+2,k+1,k+3,k+2,k+2,k+3,k+4);
  }
  const tuftGeo=new THREE.BufferGeometry();tuftGeo.setAttribute('position',new THREE.Float32BufferAttribute(tuftPositions,3));tuftGeo.setIndex(tuftIndices);tuftGeo.computeVertexNormals();
  const shoreCount=3600,rootCount=treeBases.length*12;
  const shoreGrass=new THREE.InstancedMesh(tuftGeo,new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,side:THREE.DoubleSide}),shoreCount+rootCount);
  shoreGrass.name='Distant shoreline and tree-base grass';
  shoreGrass.userData.shoreCount=shoreCount;
  for(let i=0;i<shoreGrass.count;i++) {
    let x,z;
    if(i<shoreCount) {
      const a=(i+random()*.8)/shoreCount*Math.PI*2;
      const r=96.6+10*Math.sin(a*3+.4)+7*Math.sin(a*7)+random()*2.3;
      x=Math.sin(a)*r;z=Math.cos(a)*r;
    }else {
      const tree=treeBases[Math.floor((i-shoreCount)/12)];
      const a=(i%12)/12*Math.PI*2+random()*.3,r=.18+random()*.55;
      x=tree.x+Math.cos(a)*r;z=tree.z+Math.sin(a)*r;
    }
    groundRay.ray.origin.set(x,100,z);
    const hit=groundRay.intersectObject(ground,false)[0];
    if(!hit)throw new Error('Shoreline grass has no supporting terrain');
    dummy.position.set(x,hit.point.y-.09,z);dummy.rotation.set(0,random()*Math.PI*2,0);
    dummy.scale.set(1.6+random()*1.8,.65+random()*.65,1.6+random()*1.8);
    dummy.updateMatrix();shoreGrass.setMatrixAt(i,dummy.matrix);
    shoreGrass.setColorAt(i,new THREE.Color().setHSL(.22+random()*.045,.23+random()*.12,.21+random()*.085));
  }
  shoreGrass.computeBoundingSphere();root.add(shoreGrass);return root;
}
