import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

// These bounds match the actual water surfaces in retreat.js and koi-garden.js.
export function poolsForLevel(level) {
  const pools=[{x:3.9,y:.1,z:-11.1,width:4.35,depth:8.05}];
  if(level>=2)pools.push({x:5.2,y:.29,z:-39,radius:3});
  if(level>=4)pools.push({x:10,y:.1,z:-64.6,width:4.35*1.86,depth:8.05*1.5});
  return pools;
}
let dragonflyAsset, lilyMaterial;
function loadDragonfly() {
  return dragonflyAsset ||= new GLTFLoader().loadAsync('/lanternlake/assets/wildlife/dragonfly.glb').catch(e=>{dragonflyAsset=null;throw e;});
}
async function loadLilies() {
  return lilyMaterial ||= new GLTFLoader().loadAsync('./assets/activities/lily-pad.glb').catch(e=>{lilyMaterial=null;throw e;});
}

export async function buildWaterLife(root,level) {
  const group=new THREE.Group();group.name='Pool grasses, lilies and dragonflies';root.add(group);
  const pools=poolsForLevel(level), insects=[], wingTime={value:0};
  let seed=81371;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  // Same tapered, curved blade construction as Lantern Lake, kept to low edge clumps.
  const blade=new THREE.PlaneGeometry(1,1,2,8),pos=blade.attributes.position;
  for(let i=0;i<pos.count;i++){const t=pos.getY(i)+.5;pos.setXYZ(i,pos.getX(i)*.08*(1-t)*(.8+.2*Math.sin(t*Math.PI)),t,.48*t*t);}
  blade.computeVertexNormals();
  const grassMat=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.9,side:THREE.DoubleSide});
  const grasses=new THREE.InstancedMesh(blade,grassMat,pools.length*8*18);
  grasses.name='Curved pool water grass';group.add(grasses);
  const dummy=new THREE.Object3D();let index=0;
  for(const pool of pools)for(let clump=0;clump<8;clump++)for(let leaf=0;leaf<18;leaf++) {
    const a=clump*Math.PI/4+.22,b=leaf*2.39996;
    let x,z;
    if(pool.radius){x=Math.cos(a)*(pool.radius-.4);z=Math.sin(a)*(pool.radius-.4);}
    else{x=(clump%2?1:-1)*(pool.width/2-.32);z=(-.37+Math.floor(clump/2)*.245)*pool.depth;}
    dummy.position.set(pool.x+x+Math.cos(b)*.09,pool.y-.04,pool.z+z+Math.sin(b)*.09);
    dummy.rotation.set((random()-.5)*.32,b+(random()-.5)*.6,(random()-.5)*.32);
    const height=.26+random()*.3;dummy.scale.set(.5+random()*.5,height,.3+random()*.5);
    grasses.setColorAt(index,new THREE.Color().setHSL(.24+random()*.05,.23+random()*.16,.24+random()*.16));
    dummy.updateMatrix();grasses.setMatrixAt(index++,dummy.matrix);
  }
  grasses.computeBoundingSphere();
  // Decorations cannot prevent entering an environment if one asset fails.
  const [lilies,dragonfly]=await Promise.allSettled([loadLilies(),loadDragonfly()]);
  const pads=[];
  if(lilies.status==='fulfilled')for(const pool of pools.filter(p=>!p.radius)){
    // Whole modeled leaves, inset from every pool edge; no clipping masks or tiled patches.
    const source=lilies.value.scene;source.updateMatrixWorld(true);
    const positions=[];
    // Preserve the population, but sample a broad shore band instead of rows.
    let population=0;
    for(let band=0;band<2;band++){
      const inset=.38+band*.47,hx=pool.width/2-inset,hz=pool.depth/2-inset;
      population+=2*(Math.floor(hz*2/.55)+1+Math.floor((hx*2-.7)/.55));
    }
    for(let i=0;i<population;i++){
      const diameter=[.18,.27,.37,.49][Math.floor(random()*4)]*(.9+random()*.2);
      const margin=diameter*.72+.07,hx=pool.width/2-margin,hz=pool.depth/2-margin;
      let x,z;
      for(let attempt=0;attempt<2000;attempt++){
        x=(random()*2-1)*hx;z=(random()*2-1)*hz;
        if(Math.abs(x)<pool.width/2-1.2&&Math.abs(z)<pool.depth/2-1.2)continue;
        if(positions.every(p=>Math.hypot(x-p[0],z-p[1])>(diameter+p[2])*.43+.02))break;
      }
      positions.push([x,z,diameter]);
    }
    const count=positions.length;
    for(let i=0;i<count;i++){
      const pad=source.clone(true),diameter=positions[i][2];
      const bounds=new THREE.Box3().setFromObject(pad),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
      const holder=new THREE.Group(),normalized=new THREE.Group();normalized.scale.setScalar(diameter/Math.max(size.x,size.z));
      pad.position.sub(new THREE.Vector3(center.x,bounds.min.y,center.z));normalized.add(pad);holder.add(normalized);
      holder.position.set(pool.x+positions[i][0],pool.y+.008,pool.z+positions[i][1]);
      holder.rotation.y=random()*Math.PI*2;holder.name='Whole lily pad';group.add(holder);
      const tint=new THREE.Color().setHSL(.25+random()*.05,.2+random()*.15,.42+random()*.2);
      pad.traverse(o=>{if(o.isMesh){o.geometry.userData.shared=true;const adapt=original=>{const m=original.clone();m.color.multiply(tint);m.roughness=.92;m.side=THREE.DoubleSide;m.userData.shared=false;m.userData.sharedMaps=true;return m;};o.material=Array.isArray(o.material)?o.material.map(adapt):adapt(o.material);}});
      pads.push({holder,y:holder.position.y,phase:i*.8});
    }
  }
  if(dragonfly.status==='fulfilled')for(const [poolIndex,pool] of pools.entries())for(let i=0;i<3;i++){
    const model=clone(dragonfly.value.scene);
    model.updateMatrixWorld(true);model.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
    const bounds=new THREE.Box3().setFromObject(model,true),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
    const holder=new THREE.Group(),normalized=new THREE.Group(),centered=new THREE.Group();
    normalized.scale.setScalar(.15/Math.max(size.x,size.y,size.z));normalized.rotation.y=Math.PI;
    centered.position.copy(center).negate();centered.add(model);normalized.add(centered);holder.add(normalized);group.add(holder);
    model.traverse(o=>{
      if(!o.isMesh)return;
      o.geometry.userData.shared=true;
      const adapt=original=>{
        const material=original.clone();material.userData.shared=false;material.userData.sharedMaps=true;material.side=THREE.DoubleSide;
        material.onBeforeCompile=shader=>{
          shader.uniforms.wingTime=wingTime;
          shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float wingTime;');
          shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\nfloat wingWeight=smoothstep(.018,.045,abs(position.x));\nfloat flap=sin(wingTime*48.0+${i.toFixed(1)})*.45;\ntransformed.y+=abs(position.x)*sin(flap)*wingWeight;\ntransformed.x*=mix(1.0,cos(flap),wingWeight);`);
        };
        material.customProgramCacheKey=()=>`pool-dragonfly-${i}`;return material;
      };
      o.material=Array.isArray(o.material)?o.material.map(adapt):adapt(o.material);o.castShadow=false;
    });
    const mixer=new THREE.AnimationMixer(model);dragonfly.value.animations.forEach(clip=>mixer.clipAction(clip).play());
    insects.push({holder,mixer,pool,phase:poolIndex*2.1+i*2.399,speed:.8+i*.17});
  }
  for(const result of [lilies,dragonfly])if(result.status==='rejected')console.warn('Pool detail unavailable',result.reason);
  // Independent, incommensurate curves vary heading, speed and height instead of orbiting.
  function flight(t,pool,phase,speed,out){
    const u=t*speed,rx=pool.radius?pool.radius*.72:pool.width*.38,rz=pool.radius?pool.radius*.72:pool.depth*.38;
    out.set(pool.x+rx*(.62*Math.sin(u*.31+phase)+.25*Math.sin(u*.73+phase*2.3)),
      pool.y+.42+.10*Math.sin(u*.81+phase)+.045*Math.sin(u*1.37+phase*1.7),
      pool.z+rz*(.58*Math.sin(u*.23+phase*1.4)+.29*Math.sin(u*.61+phase*.7)));
  }
  const ahead=new THREE.Vector3();
  function update(t){wingTime.value=t;for(const {holder,mixer,pool,phase,speed} of insects){
    flight(t,pool,phase,speed,holder.position);flight(t+.02,pool,phase,speed,ahead);
    holder.rotation.y=Math.atan2(ahead.x-holder.position.x,ahead.z-holder.position.z);mixer.setTime(t);
  }}
  update(0);return {update,group,ripple(age,reduced){
    for(const {holder,y,phase} of pads) {
      holder.position.y=y+(age!==null&&!reduced?Math.sin(age*1.4+phase)*.003*Math.exp(-age*.12):0);
    }
  }};
}
