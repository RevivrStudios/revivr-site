import * as THREE from 'three';

export function buildDockMusic(lanternPosition) {
  const control = new THREE.Group();
  control.name = 'Dock music control';
  control.position.copy(lanternPosition);
  control.position.x *= -1;
  const background = new THREE.Mesh(new THREE.CircleGeometry(.29, 48),
    new THREE.MeshBasicMaterial({color:0x101827, transparent:true, opacity:.8, side:THREE.DoubleSide}));
  control.add(background);
  const white = new THREE.MeshBasicMaterial({color:0xffffff, toneMapped:false, side:THREE.DoubleSide});
  const note = new THREE.Shape();
  note.absellipse(-.055,-.105,.085,.055,.2,.2+Math.PI*2,false);
  const head = new THREE.Mesh(new THREE.ShapeGeometry(note),white);
  head.position.z=.01;
  const stem = new THREE.Mesh(new THREE.PlaneGeometry(.035,.29),white);
  stem.position.set(.01,.035,.01);
  const flagShape = new THREE.Shape();
  flagShape.moveTo(.0275,.18);
  flagShape.bezierCurveTo(.06,.12,.19,.12,.12,.015);
  flagShape.bezierCurveTo(.15,.10,.055,.075,.0275,.105);
  flagShape.closePath();
  const flag = new THREE.Mesh(new THREE.ShapeGeometry(flagShape),white);
  flag.position.z=.01;
  control.add(head,stem,flag);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.305,.325,64),
    new THREE.MeshBasicMaterial({color:0xe09a4a,toneMapped:false,side:THREE.DoubleSide}));
  ring.name='Music dwell progress';
  ring.rotation.z=Math.PI/2;
  ring.geometry.setDrawRange(0,0);
  control.add(ring);
  return control;
}
