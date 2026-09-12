import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { replaceRoomProps } from './room-props.js';

export async function refineBedroom(room) {
  // This refinement is Look & Say only; the MRI room keeps its own furniture.
  const floorTask=Promise.all(['Diffuse','nor_gl','Rough'].map(channel=>
    new THREE.TextureLoader().loadAsync(`/openspace/assets/retreat/wood_floor_${channel}.jpg`))).then(([map,normalMap,roughnessMap])=>{
    map.colorSpace=THREE.SRGBColorSpace;
    for(const texture of [map,normalMap,roughnessMap]) {
      texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
      texture.repeat.set(2,2);texture.anisotropy=4;
    }
    // A single closed slab eliminates the source model's open plank joints.
    // Preserve its top elevation so furniture remains in contact with the floor.
    const floor=new THREE.Mesh(new THREE.BoxGeometry(4.04,.17,4.028),
      new THREE.MeshStandardMaterial({map,normalMap,roughnessMap,color:'#e1d2b9',roughness:.85,normalScale:new THREE.Vector2(.10,.10)}));
    floor.name='Continuous oak floor';floor.position.set(.45,.185,.006);floor.receiveShadow=true;
    const obsolete=[];room.traverse(object=>{if(/^PlankFloor/.test(object.name))obsolete.push(object);});
    obsolete.forEach(object=>object.removeFromParent());room.add(floor);
  });
  const artTask = new THREE.TextureLoader().loadAsync('./assets/garden-photograph.jpg').then(texture=>{
    texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
    const print=room.getObjectByName('Art_NewPrint');
    if(print) {print.material.map=texture;print.material.needsUpdate=true;}
    // Right-hand window when facing the foot of the bed: its left wall bay.
    const frame=new THREE.Mesh(new THREE.BoxGeometry(.88,.68,.035),new THREE.MeshStandardMaterial({color:'#b59c7c',roughness:.8}));
    frame.name='Right window artwork frame';frame.position.set(.9,1.72,1.87);room.add(frame);
    const extra=new THREE.Mesh(new THREE.PlaneGeometry(.78,.58),new THREE.MeshStandardMaterial({map:texture,roughness:1}));
    extra.name='Right window artwork print';extra.rotation.y=Math.PI;extra.position.set(.9,1.72,1.849);room.add(extra);
  });
  const bedTask = (async () => {
    const asset=await new GLTFLoader().loadAsync('./assets/local-bed/single-bed.glb');
    const bed=asset.scene;
    // Source bed length is Z in glTF; the room's bed length is X.
    bed.rotation.y=Math.PI/2;
    bed.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(bed,true);
    const size=bounds.getSize(new THREE.Vector3());
    const center=bounds.getCenter(new THREE.Vector3());
    const scale=2.10/size.x;
    const placed=new THREE.Group();placed.name='Detailed single bed';
    placed.scale.setScalar(scale);
    bed.position.set(-center.x,-bounds.min.y,-center.z);
    placed.add(bed);placed.position.set(-.3,.27,.07);
    // Remove source furniture while the room is still staged off-screen.
    const originalNames=new Set(['Cube.006','Cube.009','Cube.010','Plane.004','Plane.005','Plane.006'].flatMap(name=>[name,THREE.PropertyBinding.sanitizeNodeName(name)]));
    const obsolete=[];
    room.traverse(object=>{if(originalNames.has(object.name))obsolete.push(object);});
    for(const object of room.children)if(object.isMesh && !object.name)obsolete.push(object);
    for(const object of obsolete)object.removeFromParent();
    bed.traverse(object=>{
      if(!object.isMesh)return;
      object.castShadow=object.receiveShadow=true;
      const mats=Array.isArray(object.material)?object.material:[object.material];
      for(const material of mats) {
        material.metalness=0;
        material.roughness=Math.max(.65,material.roughness);
        for(const map of [material.map,material.normalMap,material.roughnessMap])if(map)map.anisotropy=4;
      }
    });
    room.add(placed);
  })();
  await Promise.all([artTask,floorTask,bedTask,replaceRoomProps(room)]);
}
