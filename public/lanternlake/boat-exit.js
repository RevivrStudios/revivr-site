import * as THREE from 'three';

export function buildBoatExit() {
  const control=new THREE.Group();control.name='Exit VR over boat';
  // World-fixed above the middle of the moored boat, separate from dock actions.
  control.position.set(-2.25,.85,18.2);
  control.lookAt(new THREE.Vector3(0,2.11,18));
  const background=new THREE.Mesh(new THREE.CircleGeometry(.32,48),new THREE.MeshBasicMaterial({color:0x101827,transparent:true,opacity:.88,side:THREE.DoubleSide}));
  control.add(background);
  const white=new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false,side:THREE.DoubleSide});
  function stroke(x1,y1,x2,y2) {
    const line=new THREE.Mesh(new THREE.PlaneGeometry(Math.hypot(x2-x1,y2-y1),.025),white);
    line.position.set((x1+x2)/2,(y1+y2)/2,.01);line.rotation.z=Math.atan2(y2-y1,x2-x1);control.add(line);
  }
  // An open doorway and outward arrow: a familiar exit symbol in crisp geometry.
  stroke(-.02,.17,-.15,.17);stroke(-.15,.17,-.15,-.17);stroke(-.15,-.17,-.02,-.17);
  stroke(-.04,0,.18,0);stroke(.10,.08,.18,0);stroke(.10,-.08,.18,0);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.335,.36,64),new THREE.MeshBasicMaterial({color:0xffd58a,toneMapped:false,side:THREE.DoubleSide}));
  ring.name='Exit dwell progress';ring.rotation.z=Math.PI/2;ring.geometry.setDrawRange(0,0);control.add(ring);
  control.visible=false;
  return control;
}
