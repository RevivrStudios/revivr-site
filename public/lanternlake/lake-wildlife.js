import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

export async function buildLakeWildlife(scene) {
  const root=new THREE.Group();root.name='Lake wildlife';scene.add(root);
  const loader=new GLTFLoader(),animals=[];
  const time={value:0};
  async function add(url,length,kind,count) {
    const asset=await loader.loadAsync(url);
    for(let i=0;i<count;i++) {
      const model=clone(asset.scene);model.updateMatrixWorld(true);
      model.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
      const box=new THREE.Box3().setFromObject(model,true),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
      const normalize=new THREE.Group();normalize.scale.setScalar(length/Math.max(size.x,size.y,size.z));
      model.position.copy(center).negate();normalize.add(model);
      // The imported insect faces -Z; path steering below uses +Z as forward.
      if(kind==='dragonfly')normalize.rotation.y=Math.PI;
      const holder=new THREE.Group();holder.add(normalize);root.add(holder);
      if(kind==='dragonfly')model.traverse(o=>{
        if(!o.isMesh)return;
        o.material=o.material.clone();o.material.side=THREE.DoubleSide;
        o.material.onBeforeCompile=shader=>{
          shader.uniforms.wingTime=time;
          shader.vertexShader='uniform float wingTime;\n'+shader.vertexShader;
          shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
            float wingWeight=smoothstep(0.018,0.045,abs(position.x));
            float flap=sin(wingTime*48.0+${i.toFixed(1)})*0.45;
            transformed.y += abs(position.x)*sin(flap)*wingWeight;
            transformed.x *= mix(1.0,cos(flap),wingWeight);
          `);
        };
        o.material.customProgramCacheKey=()=>`dragonfly-wing-${i}`;
      });
      const mixer=new THREE.AnimationMixer(model);asset.animations.forEach(clip=>mixer.clipAction(clip).play());
      animals.push({holder,mixer,kind,index:animals.filter(a=>a.kind===kind).length});
    }
  }
  await Promise.all([
    add('./assets/wildlife/kohaku.glb',.32,'fish',2),
    add('./assets/wildlife/showa.glb',.35,'fish',2),
    add('./assets/wildlife/dragonfly.glb',.15,'dragonfly',3),
  ].map(task=>task.catch(error=>console.warn('Lake wildlife asset unavailable',error))));
  const forward=new THREE.Vector3(0,0,1),velocity=new THREE.Vector3();
  const curiosity=new THREE.Vector3(1.9,-.2,16);let attractedAt=-100;
  function attract(position,t) {
    curiosity.set(Math.sign(position.x||1)*Math.max(1.7,Math.min(2.5,Math.abs(position.x))),-.2,Math.max(14,Math.min(19,position.z)));
    attractedAt=t;
  }
  function update(t) {
    time.value=t;
    for(const {holder,mixer,kind,index:i} of animals) {
      if(kind==='fish'){
        const a=t*.17+i*1.57;holder.position.set((i%2?1:-1)*(1.8+.45*Math.cos(a)),-.20,16.2+Math.sin(a)*1.3);
        holder.rotation.y=Math.atan2(-(i%2?1:-1)*.45*Math.sin(a),1.3*Math.cos(a));mixer.setTime(t*.7+i*.3);
        if((i%2?1:-1)===Math.sign(curiosity.x)) {
          const age=t-attractedAt;
          if(age>=0&&age<24) {
            const weight=Math.sin(Math.PI*age/24)**2*.65;
            const derivative=.65*Math.PI/24*Math.sin(2*Math.PI*age/24);
            const vx=-(i%2?1:-1)*.45*.17*Math.sin(a)*(1-weight)+(curiosity.x-holder.position.x)*derivative;
            const vz=1.3*.17*Math.cos(a)*(1-weight)+(curiosity.z-holder.position.z)*derivative;
            holder.position.lerp(curiosity,weight);
            holder.rotation.y=Math.atan2(vx,vz);
          }
        }
      }else{
        const a=t*.35+i*2.1;holder.position.set(2.1+Math.sin(a)*1.2,.65+.15*Math.sin(t*1.8+i),14+Math.cos(a)*1.5);
        // Different ellipse radii and vertical motion require the actual tangent.
        velocity.set(1.2*.35*Math.cos(a),.15*1.8*Math.cos(t*1.8+i),-1.5*.35*Math.sin(a)).normalize();
        holder.quaternion.setFromUnitVectors(forward,velocity);
      }
    }
  }
  update(0);return {update,attract};
}
