import * as THREE from 'three';
import { softenTerrainTiling } from '/openspace/terrain-material.js';

export function gardenHeight(x,z) {
  const outside=THREE.MathUtils.smoothstep(Math.abs(z),3,12);
  return .08+outside*(.2+.16*Math.sin(x*.31)*Math.cos(z*.22)
    +1.15*Math.exp(-(((Math.abs(z)-17)/7)**2)));
}

export async function addGardenTerrain(room,outdoor,leaf,foliage) {
  const maps=await Promise.all(['Diffuse','nor_gl'].map(channel=>
    new THREE.TextureLoader().loadAsync(`/openspace/assets/retreat/grass_path_2_${channel}.jpg`)));
  maps[0].colorSpace=THREE.SRGBColorSpace;
  maps.forEach(map=>{map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(20,20);map.anisotropy=4;});
  const material=new THREE.MeshStandardMaterial({color:'#a2b681',map:maps[0],normalMap:maps[1],normalScale:new THREE.Vector2(.12,.12),roughness:1,vertexColors:true});
  softenTerrainTiling(material);
  const geometry=new THREE.PlaneGeometry(120,120,80,80);geometry.rotateX(-Math.PI/2);
  const positions=geometry.attributes.position,colors=[];
  for(let i=0;i<positions.count;i++) {
    const x=positions.getX(i),z=positions.getZ(i);
    positions.setY(i,gardenHeight(x,z));
    const variation=.88+.1*Math.sin(x*.37+Math.cos(z*.21))*Math.cos(z*.32);
    colors.push(variation,variation,.94*variation);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
  const lawn=new THREE.Mesh(geometry,material);lawn.name='Textured rolling lawn';lawn.receiveShadow=true;outdoor.add(lawn);
  const old=[];room.traverse(o=>{if(o.name==='GardenGround')old.push(o);});old.forEach(o=>o.removeFromParent());
  // An irregular evergreen border on both sides conceals the flat skyline.
  // Shared leaf geometry, two instanced draws, and no per-leaf animation/shadows.
  const dummy=new THREE.Object3D();
  for(const side of [-1,1]) {
    const count=27,perShrub=220;
    const shrubs=new THREE.InstancedMesh(leaf,foliage,count*perShrub);shrubs.name=`Window shrub border ${side}`;
    for(let c=0;c<count;c++) {
      const x=(c-13)*1.55,z=side*(10.5+1.3*Math.sin(c*2.4)),radius=1.1+.24*Math.sin(c*3.1),height=.85+.28*Math.cos(c*1.7);
      const ground=gardenHeight(x,z);
      for(let i=0;i<perShrub;i++) {
        const a=i*2.39996,v=1-2*(i+.5)/perShrub,r=Math.sqrt(1-v*v);
        dummy.position.set(x+Math.cos(a)*r*radius,ground+height+v*height,z+Math.sin(a)*r*radius);
        dummy.rotation.set(.5*Math.sin(i),a,.5*Math.cos(i*3));dummy.scale.setScalar(1.8);dummy.updateMatrix();
        shrubs.setMatrixAt(c*perShrub+i,dummy.matrix);
        shrubs.setColorAt(c*perShrub+i,new THREE.Color().setHSL(.23+(c%3)*.018,.24,.28+.1*(.5+.5*Math.sin(i*7))));
      }
    }
    shrubs.computeBoundingSphere();outdoor.add(shrubs);
  }
}
