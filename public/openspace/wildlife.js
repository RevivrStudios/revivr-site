import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

const loader = new GLTFLoader();
const cache = new Map();
function load(name) {
  if (!cache.has(name)) cache.set(name, loader.loadAsync(`./assets/wildlife/${name}.glb`).catch(error => {
    cache.delete(name); throw error;
  }));
  return cache.get(name);
}

// Small, fixed populations. Cached model data is shared; poses belong to each animal.
export async function buildWildlife(root, level, koiGarden) {
  const group = new THREE.Group();
  group.name = 'Garden wildlife';
  const animals = [];
  async function animal(name, length) {
    const asset = await load(name);
    const model = clone(asset.scene);
    model.updateMatrixWorld(true);
    model.traverse(object => { if(object.isSkinnedMesh) object.skeleton.update(); });
    const bounds = new THREE.Box3().setFromObject(model, true);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = length / Math.max(size.x, size.y, size.z);
    const holder = new THREE.Group();
    const normalized = new THREE.Group();
    normalized.scale.setScalar(scale);
    const centered = new THREE.Group();
    centered.position.copy(center).negate();
    centered.add(model);
    normalized.add(centered); holder.add(normalized); group.add(holder);
    model.traverse(object => {
      if (!object.isMesh) return;
      object.castShadow = false;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach(material => { material.userData.shared = true; });
      object.geometry.userData.shared = true;
    });
    const mixer = new THREE.AnimationMixer(model);
    asset.animations.forEach(clip => mixer.clipAction(clip).play());
    return {holder, model, mixer};
  }
  try {
    if (koiGarden) {
      for (let i=0;i<4;i++) {
        const item=await animal(i%2 ? 'showa' : 'kohaku', .30+i*.02);
        animals.push({...item,kind:'fish',index:i});
      }
      koiGarden?.setDetailedFish(true);
    }
    if (level > 0 && level < 5) {
      for (let i=0;i<4;i++) {
        const item=await animal(i%2 ? 'blue' : 'brimstone', .11);
        const wings=[];
        item.model.traverse(o => {if (/wing/i.test(o.name) && o.isMesh) wings.push({object:o,rest:o.quaternion.clone(),side:/wingL/i.test(o.name)?-1:1});});
        animals.push({...item,kind:'butterfly',index:i,wings});
      }
    }
  } catch(error) {
    console.warn('Some local wildlife assets are unavailable; the environment remains usable.', error);
  }
  root.add(group);
  const axis=new THREE.Vector3(0,0,1), rotation=new THREE.Quaternion();
  function update(t) {
    for(const item of animals) {
      const i=item.index, p=item.holder;
      item.mixer.setTime(t*(item.kind==='fish'?.7:1)+i*.31);
      if(item.kind==='fish') {
        const a=t*(.10+i*.012)+i*Math.PI/2, r=1+i*.38;
        p.position.set(5.2+Math.cos(a)*r,.09+.014*Math.sin(t*.7+i),-39+Math.sin(a)*r*.78);
        p.rotation.y=Math.atan2(-Math.sin(a),.78*Math.cos(a));
      } else if(item.kind==='butterfly') {
        const z=[0,-16,-25,-46,-70][level];
        p.position.set(-3.5+Math.sin(t*.31+i*1.9)*1.3,1.1+Math.sin(t*.7+i)*.22,z+Math.cos(t*.26+i)*1.2);
        p.rotation.y=t*.26+i;
        for(const wing of item.wings) wing.object.quaternion.copy(wing.rest).multiply(rotation.setFromAxisAngle(axis,wing.side*Math.sin(t*25+i)*.65));
      }
    }
  }
  update(0);
  return {update};
}
