import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { createDriftingSky } from '/openspace/drifting-sky.js';
import { addGardenTerrain } from './garden-terrain.js';

export async function addWindowGarden(room,scene) {
  const outdoor=new THREE.Group();outdoor.name='Window garden';room.add(outdoor);
  // The same curved, instanced leaf construction used in Open Space's koi garden.
  const leaf=new THREE.PlaneGeometry(1,1,4,2),positions=leaf.attributes.position;
  for(let i=0;i<positions.count;i++) {
    const t=positions.getY(i)+.5;
    positions.setXYZ(i,positions.getX(i)*Math.sin(Math.PI*t)*.13,(t-.5)*.28,.045*Math.sin(Math.PI*t));
  }
  leaf.computeVertexNormals();
  const foliage=new THREE.MeshStandardMaterial({color:'#668255',roughness:.9,side:THREE.DoubleSide});
  const bark=new THREE.MeshStandardMaterial({color:'#75604b',roughness:1});
  const dummy=new THREE.Object3D();
  for(const side of [-1,1])for(let tree=0;tree<3;tree++) {
    const base=new THREE.Vector3(-2.5+tree*2.7,.1,side*(5+tree*.7));
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.045,.12,2.5,12),bark);
    trunk.position.copy(base).add(new THREE.Vector3(0,1.25,0));outdoor.add(trunk);
    const leaves=new THREE.InstancedMesh(leaf,foliage,9*180);
    for(let cluster=0;cluster<9;cluster++) {
      const angle=cluster*2.39996;
      const tip=base.clone().add(new THREE.Vector3(Math.cos(angle)*(1+cluster*.06),2.45+Math.sin(cluster*2)*.4,Math.sin(angle)*(1+cluster*.06)));
      const start=base.clone().add(new THREE.Vector3(0,1.7,0)),delta=tip.clone().sub(start);
      const branch=new THREE.Mesh(new THREE.CylinderGeometry(.012,.045,delta.length(),8),bark);
      branch.position.copy(start).add(tip).multiplyScalar(.5);
      branch.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());outdoor.add(branch);
      for(let i=0;i<180;i++) {
        const a=i*2.39996,v=1-2*(i+.5)/180,ring=Math.sqrt(1-v*v);
        dummy.position.set(tip.x+Math.cos(a)*ring*.85,tip.y+.25+v*.55,tip.z+Math.sin(a)*ring*.85);
        dummy.rotation.set(.5*Math.sin(i),a,.5*Math.cos(i*3));dummy.updateMatrix();
        leaves.setMatrixAt(cluster*180+i,dummy.matrix);
        leaves.setColorAt(cluster*180+i,new THREE.Color().setHSL(.23+(cluster%3)*.015,.22,.26+.12*(.5+.5*Math.sin(i*7))));
      }
    }
    outdoor.add(leaves);
  }
  const old=[];room.traverse(o=>{if(/^GardenPine|^SkyCloud/.test(o.name))old.push(o);});
  old.forEach(o=>o.removeFromParent());
  await addGardenTerrain(room,outdoor,leaf,foliage);
  const texture=await new RGBELoader().loadAsync('/openspace/assets/retreat/cloud-sky-4k.hdr');
  texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;texture.wrapS=THREE.RepeatWrapping;
  const sky=createDriftingSky(texture);sky.mesh.visible=true;scene.add(sky.mesh);
  return sky;
}
