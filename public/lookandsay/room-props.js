import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export async function replaceRoomProps(room) {
  const loader=new GLTFLoader();
  const originalObjects=[];room.traverse(object=>originalObjects.push(object));
  const group=new THREE.Group();group.name='Detailed room furnishings';
  room.add(group);
  const hide=names=>{
    const targets=new Set(names.flatMap(name=>[name,THREE.PropertyBinding.sanitizeNodeName(name)]));
    const obsolete=[];
    for(const object of originalObjects)if(targets.has(object.name))obsolete.push(object);
    for(const object of obsolete)object.removeFromParent();
  };
  function fit(model,name,rotation,dimensions,position) {
    model.rotation.set(...rotation);model.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(model,true);
    const size=bounds.getSize(new THREE.Vector3());
    const center=bounds.getCenter(new THREE.Vector3());
    const fitted=new THREE.Group();fitted.name=name;
    fitted.scale.set(dimensions[0]/size.x,dimensions[1]/size.y,dimensions[2]/size.z);
    model.position.set(-center.x,-bounds.min.y,-center.z);
    fitted.add(model);fitted.position.set(...position);group.add(fitted);
    model.traverse(o=>{
      if(!o.isMesh)return;
      o.castShadow=o.receiveShadow=true;
      for(const m of Array.isArray(o.material)?o.material:[o.material]) {
        for(const map of [m.map,m.normalMap,m.roughnessMap])if(map)map.anisotropy=4;
      }
    });
    return fitted;
  }
  // Each successful download swaps only its corresponding originals.
  await Promise.all([
    loader.loadAsync('./assets/local-props/curtains.glb').then(asset=>{
      // The source's sheer shader exports opaque; omit that central panel so
      // daylight and the view remain visible between the modeled outer folds.
      const sheer=asset.scene.getObjectByName('Plane01');
      if(sheer)sheer.removeFromParent();
      for(const side of [-1,1]) fit(asset.scene.clone(true),`Linen curtains ${side}`,[0,Math.PI/2,0],[1.3,1.62,.12],[side<0?.60:-.60,.67,side*1.78]);
      hide(['Plane.007','Plane.007_mirror']);
    }),
    loader.loadAsync('./assets/local-props/clock.glb').then(asset=>{
      fit(asset.scene,'Detailed wall clock',[Math.PI/2,0,0],[.53,.53,.045],[-.643,1.811,-1.82]);
      hide(['Circle.001']);
    }),
    loader.loadAsync('./assets/local-props/plant.glb').then(asset=>{
      fit(asset.scene.clone(true),'Bedside thyme plant',[0,0,0],[.18,.26,.18],[-1.037,1.074,1.152]);
      hide(['Circle']);
      fit(asset.scene,'Textured thyme plant',[0,0,0],[.58,.72,.58],[2,.27,-1.45]);
      hide(['PlantPot','PlantLeaves']);
    }),
    loader.loadAsync('./assets/local-props/compact-chair.glb').then(asset=>{
      fit(asset.scene,'Compact visitor chair',[0,0,0],[.46,.78,.46],[.35,.265,-1.50]);
      hide(['Cube.008']);
    }),
    loader.loadAsync('./assets/local-props/books.glb').then(asset=>{
      fit(asset.scene,'Detailed bedside books',[0,0,0],[.30,.085,.24],[-1.01,1.075,.87]);
      hide(['Cube.012','Cube.013']);
    }),
    loader.loadAsync('./assets/local-props/table.glb').then(asset=>{
      for(const [name,x,z,depth] of [['Cube.005',-1.026,1.022,.691],['Cube.007',-1.081,-1.437,.76]]) {
        fit(asset.scene.clone(true),`Oak bedside cabinet ${name}`,[0,0,0],[.615,.809,depth],[x,.265,z]);
        hide([name]);
      }
    }),
  ]);
  // The old unreflective mirror reads as a dark, unexplained wall panel.
  hide(['Plane.003']);
  const drink=new THREE.Group();drink.name='Bedside glass of water';drink.position.set(-1.08,1.074,-1.43);group.add(drink);
  const coaster=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.004,48),new THREE.MeshStandardMaterial({color:'#c9b797',roughness:.95}));
  coaster.position.y=.002;drink.add(coaster);
  const profile=[[0,.004],[.032,.004],[.035,.009],[.041,.126],[.039,.129],[.037,.126],[.031,.014],[0,.014]].map(([x,y])=>new THREE.Vector2(x,y));
  const glass=new THREE.Mesh(new THREE.LatheGeometry(profile,64),new THREE.MeshPhysicalMaterial({color:'#e5f2f2',transparent:true,opacity:.24,roughness:.08,metalness:.05,side:THREE.DoubleSide,depthWrite:false}));
  drink.add(glass);
  const water=new THREE.Mesh(new THREE.CylinderGeometry(.0355,.031,.077,48),new THREE.MeshPhysicalMaterial({color:'#bdd9dc',transparent:true,opacity:.3,roughness:.08,depthWrite:false}));
  water.position.y=.0525;drink.add(water);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.0385,.0012,8,64),new THREE.MeshStandardMaterial({color:'#e7f3f4',roughness:.18}));
  rim.rotation.x=Math.PI/2;rim.position.y=.128;drink.add(rim);
  // Replace the jagged window inserts with straight joinery and a thin pane.
  const timber=new THREE.MeshStandardMaterial({color:'#b59c7c',roughness:.72});
  const windowGlass=new THREE.MeshPhysicalMaterial({color:'#e7f3f1',transparent:true,opacity:.08,roughness:.12,metalness:.05,depthWrite:false,side:THREE.DoubleSide});
  for(const side of [-1,1]) {
    const x=side<0?.597:-.597,z=side*1.90;
    const add=(w,h,d,px,py,pz,material)=>{
      const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,2,.008),material);
      mesh.position.set(px,py,pz);mesh.castShadow=material!==windowGlass;mesh.receiveShadow=true;group.add(mesh);
    };
    for(const dx of [-.487,.487])add(.045,1.147,.065,x+dx,1.568,z,timber);
    for(const y of [1.018,1.568,2.119])add(.975,.045,.065,x,y,z,timber);
    const pane=new THREE.Mesh(new THREE.PlaneGeometry(.92,1.05),windowGlass);pane.position.set(x,1.568,z);group.add(pane);
  }
  hide(['Plane.001','Plane.001_mirror']);
}
