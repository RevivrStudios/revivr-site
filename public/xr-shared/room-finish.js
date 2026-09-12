import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const loader = new THREE.TextureLoader();
let ready;
function finishes() {
  return ready ||= Promise.all(['wood_floor_Diffuse.jpg','white_plaster_02_nor_gl.jpg','quiet-horizons.png'].map(name=>loader.loadAsync('/openspace/assets/retreat/'+name))).then(([wood,normal,art])=>{
    wood.colorSpace=art.colorSpace=THREE.SRGBColorSpace;
    for(const t of [wood,normal]) {t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,3);t.anisotropy=4;}
    art.repeat.set(.5,1);
    return {wood,normal,art};
  });
}
export async function finishRoom(room, suite=false) {
  const {wood,normal,art}=await finishes();
  const wall=new THREE.MeshStandardMaterial({color:'#eee9df',normalMap:normal,normalScale:new THREE.Vector2(.055,.055),roughness:.94});
  const oak=new THREE.MeshStandardMaterial({color:'#c4ad89',map:wood,roughness:.75});
  const fabric=new THREE.MeshStandardMaterial({color:'#f3f0e7',normalMap:normal,normalScale:new THREE.Vector2(.16,.16),roughness:1});
  const teal=new THREE.MeshStandardMaterial({color:'#7caaa8',normalMap:normal,normalScale:new THREE.Vector2(.12,.12),roughness:.92});
  room.traverse(o=>{
    if(!o.isMesh)return;
    const n=o.name||'';
    if(/^(Wall|Ceiling|SuiteWall|SuiteCeiling|CtrlBackWall)/.test(n))o.material=wall;
    if(/^PlankFloor/.test(n))o.material=oak;
    if(/^(SuiteFloor|CtrlFloor)/.test(n))o.material=new THREE.MeshStandardMaterial({color:'#b8cccb',normalMap:normal,normalScale:new THREE.Vector2(.035,.035),roughness:.65});
    if(/^SuiteBand/.test(n))o.material=teal;
    if(/^Buddy/.test(n)||/^Buddy/.test(o.parent?.name||'')) {
      const mats=Array.isArray(o.material)?o.material:[o.material];
      o.material=mats.map(m=>{const c=m.clone();c.roughness=1;c.metalness=0;c.normalMap=normal;c.normalScale=new THREE.Vector2(.22,.22);return c;});
      if(o.material.length===1)o.material=o.material[0];
      o.geometry.computeVertexNormals();
    }
  });
  const box=(w,h,d,x,y,z,material,r=.04)=>{
    const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,3,Math.min(r,w/3,h/3,d/3)),material);
    mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;room.add(mesh);return mesh;
  };
  if(!suite) {
    room.traverse(o=>{if(/^Art_/.test(o.name)||/^(Cube\.006|Cube\.009|Cube\.010|Plane\.004|Plane\.005|Plane\.006)$/.test(o.name))o.visible=false;});
    box(2.02,.30,1.02,-.33,.41,.07,oak);
    box(.12,1.12,1.09,-1.32,.83,.07,teal,.05);
    box(1.98,.24,.99,-.30,.68,.07,fabric,.09);
    const duvet=box(1.33,.12,1.02,.02,.84,.07,teal,.05);
    // Slight folds in the broad duvet surface, with smooth normals.
    const pos=duvet.geometry.attributes.position;
    for(let i=0;i<pos.count;i++)if(pos.getY(i)>0)pos.setY(i,pos.getY(i)+.012*Math.sin(pos.getX(i)*17+pos.getZ(i)*8));
    duvet.geometry.computeVertexNormals();
    const pillow=box(.43,.17,.76,-.99,.89,.07,fabric,.075);pillow.rotation.z=.09;
    const frame=box(.06,.88,1.25,2.30,1.83,-.15,oak,.012);frame.name='Art_NewFrame';
    const print=new THREE.Mesh(new THREE.PlaneGeometry(1.12,.75),new THREE.MeshStandardMaterial({map:art,roughness:1}));
    print.rotation.y=-Math.PI/2;print.position.set(2.263,1.83,-.15);print.name='Art_NewPrint';room.add(print);
  } else {
    const glass=room.getObjectByName('CtrlGlass');
    if(glass)glass.material=new THREE.MeshPhysicalMaterial({color:'#d0eceb',transparent:true,opacity:.18,roughness:.08,metalness:.08,side:THREE.DoubleSide,depthWrite:false});
    const solidWall=room.getObjectByName('SuiteWallLeft');if(solidWall)solidWall.visible=false;
    // Actual viewing aperture: the old glass sat in front of an unbroken wall.
    box(.12,1.05,6,-2.86,.525,-.6,wall);
    box(.12,1.14,6,-2.86,2.52,-.6,wall);
    box(.12,.9,3.25,-2.86,1.5,-1.975,wall);
    box(.12,.9,1.05,-2.86,1.5,1.875,wall);
    const body=room.getObjectByName('corpo');if(body)body.visible=false;
    const shell=new THREE.MeshStandardMaterial({color:'#f2f4f0',roughness:.3,metalness:.08});
    const bore=new THREE.MeshStandardMaterial({color:'#c7d8d7',roughness:.45,side:THREE.BackSide});
    const cylinder=(radius,material)=>{
      const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,1.38,96,1,true),material);
      mesh.rotation.x=Math.PI/2;mesh.position.set(0,1.04,.99);mesh.castShadow=mesh.receiveShadow=true;room.add(mesh);
    };
    cylinder(1.02,shell);cylinder(.5,bore);
    for(const z of [.30,1.68]){
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.76,.26,24,96),shell);ring.position.set(0,1.04,z);room.add(ring);
    }
    box(1.78,.38,1.62,0,.19,.99,shell,.12);
    const table=room.getObjectByName('estofado');
    table?.traverse(o=>{if(o.isMesh)o.material=teal;});
  }
}
