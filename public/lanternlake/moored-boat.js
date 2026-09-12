import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export async function buildMooredBoat(scene) {
  const {scene:model}=await new GLTFLoader().loadAsync('./assets/boat/wooden-boat.glb');
  const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
  const scale=2.8/Math.max(size.x,size.z);
  const center=bounds.getCenter(new THREE.Vector3());
  model.scale.multiplyScalar(scale);
  model.position.set(-center.x*scale,-bounds.min.y*scale-.24,-center.z*scale);
  const boat=new THREE.Group();boat.name='Moored wooden boat';boat.add(model);
  boat.position.set(-2.25,0,18.2);scene.add(boat);
  // Fixed dock end, moving boat end: the rope follows the hull without stretching off it.
  const anchor=new THREE.Vector3(-.9,.3,19.8),bow=new THREE.Vector3(-.05,.24,1.05);
  const rope=new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(anchor,anchor.clone().add(new THREE.Vector3(1,0,0))),16,.012,6,false),new THREE.MeshStandardMaterial({color:0xa99a76,roughness:1}));
  rope.name='Boat mooring rope';scene.add(rope);
  const end=new THREE.Vector3(),mid=new THREE.Vector3(),point=new THREE.Vector3(),tangent=new THREE.Vector3(),side=new THREE.Vector3(),up=new THREE.Vector3(),normal=new THREE.Vector3();
  function update(t) {
    boat.position.y=Math.sin(t*.72)*.022;
    boat.rotation.set(Math.sin(t*.63)*.012,Math.sin(t*.23)*.018,Math.sin(t*.8)*.018);
    boat.updateMatrixWorld(true);
    boat.localToWorld(end.copy(bow));mid.copy(anchor).lerp(end,.5);mid.y-=.24;
    side.set(end.z-anchor.z,0,anchor.x-end.x).normalize();
    const positions=rope.geometry.attributes.position,normals=rope.geometry.attributes.normal;
    // Reuse buffers: no geometry creation or GPU-buffer churn in the XR frame loop.
    for(let i=0;i<=16;i++) {
      const u=i/16,v=1-u;
      point.copy(anchor).multiplyScalar(v*v).addScaledVector(mid,2*v*u).addScaledVector(end,u*u);
      tangent.copy(mid).sub(anchor).multiplyScalar(v).addScaledVector(end,u).addScaledVector(mid,-u).normalize();
      up.crossVectors(tangent,side).normalize();
      for(let j=0;j<=6;j++) {
        const a=j/6*Math.PI*2,k=i*7+j;
        normal.copy(side).multiplyScalar(Math.cos(a)).addScaledVector(up,Math.sin(a));
        positions.setXYZ(k,point.x+normal.x*.012,point.y+normal.y*.012,point.z+normal.z*.012);
        normals.setXYZ(k,normal.x,normal.y,normal.z);
      }
    }
    positions.needsUpdate=normals.needsUpdate=true;rope.geometry.computeBoundingSphere();
  }
  update(0);return {update};
}
