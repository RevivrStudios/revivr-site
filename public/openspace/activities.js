import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {dockDwell} from '../lanternlake/dock-dwell.js';
import {ActivityCycle,activitySpecs,smooth,visitWeight,feedingPoint,biteTime,feedingPose} from './activity-state.js';

const models=new Map();
async function model(name,size,axis='y'){
  if(!models.has(name))models.set(name,new GLTFLoader().loadAsync(`./assets/activities/${name}.glb`).catch(error=>{models.delete(name);throw error;}));
  const asset=await models.get(name),object=clone(asset.scene);
  object.updateMatrixWorld(true);object.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
  const bounds=new THREE.Box3().setFromObject(object,true),extent=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  const base=new THREE.Group(),scaled=new THREE.Group(),centered=new THREE.Group();
  centered.position.set(-center.x,-bounds.min.y,-center.z);centered.add(object);
  scaled.scale.setScalar(size/(axis==='max'?Math.max(extent.x,extent.y,extent.z):extent[axis]));scaled.add(centered);base.add(scaled);
  object.traverse(o=>{if(o.isMesh){o.geometry.userData.shared=true;for(const m of(Array.isArray(o.material)?o.material:[o.material]))m.userData.shared=true;o.castShadow=false;}});
  const mixer=new THREE.AnimationMixer(object);asset.animations.forEach(clip=>mixer.clipAction(clip).play());
  return {base,object,mixer,clips:asset.animations};
}
function material(color){return new THREE.MeshStandardMaterial({color,roughness:.8});}
function addMesh(parent,geometry,mat,position){const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(...position);parent.add(mesh);return mesh;}
function stand(parent,x,z,height=.65,width=.65){
  const mat=material('#b5a38b');
  addMesh(parent,new THREE.CylinderGeometry(width/2,width/2,.07,32),mat,[x,height-.035,z]);
  addMesh(parent,new THREE.CylinderGeometry(.12,.19,height-.07,24),mat,[x,(height-.07)/2,z]);
}
function spatialLabel(parent,position){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=160;
  const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const mesh=addMesh(parent,new THREE.PlaneGeometry(1.12,.233),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthTest:false}),position);mesh.renderOrder=35;
  let previous='';
  return {mesh,set(title,sub){const key=title+'|'+sub;if(key===previous)return;previous=key;ctx.clearRect(0,0,768,160);ctx.fillStyle='rgba(244,248,240,.94)';ctx.beginPath();ctx.roundRect(0,0,768,160,32);ctx.fill();ctx.fillStyle='#284d46';ctx.font='600 36px system-ui';ctx.textAlign='center';ctx.fillText(title,384,66);ctx.font='26px system-ui';ctx.fillStyle='#53716a';ctx.fillText(sub,384,115);texture.needsUpdate=true;}};
}
function createRipples(parent,center,radius){
  const rings=[];
  for(let i=0;i<4;i++){const m=addMesh(parent,new THREE.RingGeometry(.96,1,80),new THREE.MeshBasicMaterial({color:'#48796e',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}),center);m.rotation.x=-Math.PI/2;rings.push(m);}
  return {update(age,reduced){for(let i=0;i<rings.length;i++){const a=age===null?-1:age-i*1.7,life=12;const visible=a>=0&&a<life;
    rings[i].visible=visible;const u=reduced?.35+i*.12:Math.max(0,a/life);rings[i].scale.setScalar(.08+u*radius);rings[i].material.opacity=visible?(reduced?.18:.38*Math.sin(Math.PI*Math.min(1,a/life))):0;
  }}};
}


// Each level owns its activity, effects and sound; no timers survive a scene change.
export async function buildActivities(root,level,{wildlife,waterLife,koiGarden}={}){
  const group=new THREE.Group();group.name='Optional garden activity';root.add(group);
  const cycle=new ActivityCycle(level),spec=activitySpecs[level],dwell=dockDwell(2);
  let reducedMode=false;
  const stillStatuses=['Fresh droplets on the basil','A quiet ripple on the water','A butterfly rests on the flower','Koi gathered near the food','A quiet moment with the chime','A visitor at the feeder'];
  const status=()=>reducedMode&&cycle.age!==null?stillStatuses[level]:cycle.status;
  let configuredSeconds=2,focused=false,disposed=false,settings={dwellSeconds:2,targetSize:'normal',volume:.5},audioContext=null;
  let targetPoint,can,plant,food,chime,bird,landing,ripples,waterDrops,beads,foodDrops;
  let secondaryRipples=[];
  let home,mallet,malletRotation,malletHome,lid,flowerModel,soundPlayed=false;
  const scratch=new THREE.Object3D(),fishRestore=new Map(),travel=new Map();
  function faceTravel(item){
    const old=travel.get(item);
    let yaw=item.holder.rotation.y;
    if(old){const dx=item.holder.position.x-old.position.x,dz=item.holder.position.z-old.position.z;yaw=dx*dx+dz*dz>1e-10?Math.atan2(dx,dz):old.yaw;}
    item.holder.rotation.y=yaw;travel.set(item,{position:item.holder.position.clone(),yaw});
  }
  const movers=wildlife?.animals||[];
  if(level===0){
    [can,plant]=await Promise.all([model('watering-can',.43,'x'),model('potted-plant',.52)]);
    stand(group,1.62,-2,.65,1.3);can.base.position.set(1.25,.65,-2);plant.base.position.set(1.98,.65,-2);group.add(can.base,plant.base);
    home=can.base.position.clone();targetPoint=new THREE.Vector3(1.32,.79,-2);
    waterDrops=new THREE.InstancedMesh(new THREE.SphereGeometry(.007,8,6),new THREE.MeshStandardMaterial({color:'#b3e2df',roughness:.15,metalness:.1}),32);group.add(waterDrops);waterDrops.visible=false;
    beads=new THREE.InstancedMesh(new THREE.SphereGeometry(.008,8,6),new THREE.MeshStandardMaterial({color:'#d4f0df',roughness:.12,transparent:true}),16);beads.name="Settled watering droplets";group.add(beads);beads.visible=false;
    // Place droplets on the actual leaf surfaces rather than around a bounding box.
    root.updateMatrixWorld(true);let count=0;const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
    for(let i=0;i<60&&count<16;i++){
      const a=i*2.4,r=.07+.14*(i%7)/7,origin=root.localToWorld(new THREE.Vector3(1.98+Math.cos(a)*r,1.5,-2+Math.sin(a)*r));
      ray.set(origin,down);const hit=ray.intersectObject(plant.base,true).find(h=>/basil/i.test(h.object.name));
      if(!hit)continue;scratch.position.copy(root.worldToLocal(hit.point)).add(new THREE.Vector3(0,.005,0));scratch.scale.setScalar(1);scratch.rotation.set(0,0,0);scratch.updateMatrix();beads.setMatrixAt(count++,scratch.matrix);
    }beads.count=count;beads.computeBoundingSphere();
  } else if(level===1){
    targetPoint=new THREE.Vector3(3.8,.18,-10.4);ripples=createRipples(group,[3.8,.116,-10.4],1.7);
    secondaryRipples=[[2.9,-13.65,.55,.8],[4.85,-8.35,.65,2.2],[4.9,-12.4,.4,4.1]].map(([x,z,r,delay])=>({effect:createRipples(group,[x,.117,z],r),delay}));
  } else if(level===2){
    stand(group,2.25,-25.5,.55,.65);flowerModel=await model('butterfly-flower',.48);flowerModel.base.name='Butterfly flower arrangement';flowerModel.base.position.set(2.25,.55,-25.5);group.add(flowerModel.base);
    // Find an exposed upper surface of the supplied plant, then keep the visitor above it.
    root.updateMatrixWorld(true);landing=new THREE.Vector3(2.25,.55,-25.5);
    const vertex=new THREE.Vector3();flowerModel.base.traverse(o=>{if(o.isMesh){for(let i=0;i<o.geometry.attributes.position.count;i++){vertex.fromBufferAttribute(o.geometry.attributes.position,i).applyMatrix4(o.matrixWorld);root.worldToLocal(vertex);if(vertex.y>landing.y)landing.copy(vertex);}}});
    const visitor=movers.find(a=>a.kind==='butterfly');let contactOffset=.012;
    if(visitor){for(const wing of visitor.wings)wing.object.quaternion.copy(wing.rest);root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(visitor.holder,true);if(!box.isEmpty())contactOffset=visitor.holder.getWorldPosition(new THREE.Vector3()).y-box.min.y;}
    landing.y+=contactOffset+.002;
    targetPoint=new THREE.Box3().setFromObject(flowerModel.base,true).getCenter(new THREE.Vector3());root.worldToLocal(targetPoint);
    targetPoint.z+=.06;
  } else if(level===3){
    food=await model('fish-food',.25);stand(group,2.1,-37.2,.72,.5);food.base.position.set(2.1,.72,-37.2);group.add(food.base);home=food.base.position.clone();targetPoint=new THREE.Vector3(2.1,.86,-37.2);
    lid=food.object.getObjectByName('cover_mesh');
    foodDrops=new THREE.InstancedMesh(new THREE.SphereGeometry(.014,8,6),material('#b58b54'),18);group.add(foodDrops);foodDrops.visible=false;
  } else if(level===4){
    chime=await model('garden-chime',.6);stand(group,2.35,-62.7,.65,.8);chime.base.position.set(2.35,.65,-62.7);group.add(chime.base);targetPoint=new THREE.Vector3(2.35,1,-62.7);
    mallet=chime.object.getObjectByName('Hummer');if(mallet){malletRotation=mallet.rotation.clone();malletHome=mallet.position.clone();}
    ripples=createRipples(group,[10,.116,-64.6],1.8);
    secondaryRipples=[[7.5,-67.7,.7,1],[12.3,-61.1,.85,2.5],[12.6,-66.2,.5,4]].map(([x,z,r,delay])=>({effect:createRipples(group,[x,.117,z],r),delay}));
  } else {
    bird=await model('hummingbird',.26,'max');group.add(bird.base);bird.base.visible=false;
    const wood=material('#806c54');
    addMesh(group,new THREE.CylinderGeometry(.045,.065,1.05,16),wood,[2.35,.525,-88.5]);
    addMesh(group,new THREE.CylinderGeometry(.18,.14,.07,32),material('#b05b4b'),[2.35,1.09,-88.5]);
    addMesh(group,new THREE.CircleGeometry(.14,32),material('#e9ce9c'),[2.35,1.128,-88.5]).rotation.x=-Math.PI/2;
    landing=new THREE.Vector3(2.35,1.055,-88.285);targetPoint=new THREE.Vector3(2.35,1.13,-88.5);
    // Find a compact pose from the supplied animation for the quiet perch interval.
    let width=Infinity;bird.restTime=0;
    const duration=bird.clips[0]?.duration||0;
    for(let t=0;t<duration;t+=.3){bird.mixer.setTime(t);bird.base.updateMatrixWorld(true);bird.object.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});const size=new THREE.Box3().setFromObject(bird.base,true).getSize(new THREE.Vector3());if(size.x<width){width=size.x;bird.restTime=t;}}
    bird.mixer.setTime(0);
  }
  const halo=new THREE.Group();halo.position.copy(targetPoint);group.add(halo);
  const track=addMesh(halo,new THREE.RingGeometry(.245,.258,64),new THREE.MeshBasicMaterial({color:'#36675c',transparent:true,opacity:.7,depthTest:false,side:THREE.DoubleSide}),[0,0,0]);track.renderOrder=33;
  const fill=addMesh(halo,new THREE.RingGeometry(.24,.26,64,1,Math.PI/2,-Math.PI*2),new THREE.MeshBasicMaterial({color:'#f4cf43',toneMapped:false,depthTest:false,side:THREE.DoubleSide}),[0,0,.002]);fill.geometry.setDrawRange(0,0);fill.renderOrder=34;
  const hit=addMesh(group,new THREE.SphereGeometry(.34,16,12),new THREE.MeshBasicMaterial({visible:false}),targetPoint.toArray());hit.name='Activity dwell target';
  const label=spatialLabel(group,[targetPoint.x,level===0?1.95:targetPoint.y+.52,targetPoint.z]);
  // The approaching bird is physically nearer than its sign and must occlude it.
  if(level===5){label.mesh.material.depthTest=true;label.mesh.material.depthWrite=false;}
  const sound={nodes:[],gain:null,stop(){for(const node of this.nodes){try{node.stop();}catch{}node.disconnect();}this.nodes=[];this.gain?.disconnect();this.gain=null;},play(){
    this.stop();if(!audioContext||!settings.volume)return;
    audioContext.resume().catch(()=>{});const t=audioContext.currentTime;this.gain=audioContext.createGain();this.gain.gain.value=settings.volume*.2;this.gain.connect(audioContext.destination);
    for(const [i,f] of [196,397,563,823].entries()){const osc=audioContext.createOscillator(),envelope=audioContext.createGain();osc.frequency.value=f;osc.connect(envelope);envelope.connect(this.gain);envelope.gain.setValueAtTime(0,t);envelope.gain.linearRampToValueAtTime(.15/(i+1),t+.035);envelope.gain.exponentialRampToValueAtTime(.0001,t+7-i);osc.start(t);osc.stop(t+8);osc.onended=()=>envelope.disconnect();this.nodes.push(osc);}
  }};
  function restoreWildlife(){for(const [item,pose] of fishRestore){item.holder.position.copy(pose.position);item.holder.quaternion.copy(pose.quaternion);}fishRestore.clear();}
  function activate(){
    if(disposed||!cycle.start())return false;
    dwell.requireLookAway();travel.clear();
    for(const item of movers)fishRestore.set(item,{position:item.holder.position.clone(),quaternion:item.holder.quaternion.clone()});
    soundPlayed=false;return true;
  }
  const startPoint=new THREE.Vector3(),endPoint=new THREE.Vector3();
  function effects(age,reduced){
    const running=age!==null;
    if(can){
      const lift=running?(smooth(0,2,age)*(1-smooth(6,8,age))):0;
      can.base.position.copy(home);can.base.rotation.z=0;
      if(!reduced){can.base.position.x+=lift*.25;can.base.position.y+=lift*.66;can.base.rotation.z=-lift*.6;}
      waterDrops.visible=running&&!reduced&&age>2&&age<6;
      if(waterDrops.visible){
        can.base.updateMatrixWorld(true);startPoint.copy(root.worldToLocal(can.base.localToWorld(new THREE.Vector3(.21,.21,0))));
        for(let i=0;i<32;i++){
          const seed=n=>{const v=Math.sin(i*73.17+n*31.31)*43758.54;return v-Math.floor(v);};
          const lifetime=.42+seed(1)*.2,u=(age/lifetime+seed(2))%1;
          // Independent drops fan out from the rose and accelerate downward.
          const spread=Math.sqrt(seed(3))*.13,a=seed(4)*Math.PI*2;
          endPoint.set(1.98+Math.cos(a)*spread,1.10,-2+Math.sin(a)*spread);
          scratch.position.copy(startPoint).lerp(endPoint,u);scratch.position.y+=.22*u*(1-u);
          scratch.position.z+=(seed(5)-.5)*.035*(1-u);
          scratch.scale.setScalar(.55+seed(6)*.55);scratch.rotation.set(0,0,0);scratch.updateMatrix();waterDrops.setMatrixAt(i,scratch.matrix);
        }waterDrops.instanceMatrix.needsUpdate=true;waterDrops.computeBoundingSphere();
      }
      beads.visible=running&&age<11&&(reduced||age>5);beads.material.opacity=running?1-smooth(8,11,age):0;
    }
    ripples?.update(age,reduced);for(const {effect,delay} of secondaryRipples)effect.update(age===null||age<delay?null:age-delay,reduced);if((level===1||level===4)&&waterLife?.ripple)waterLife.ripple(age,reduced);
    if(level===2){const item=movers.find(a=>a.kind==='butterfly');if(item&&running){
      const weight=reduced?1:visitWeight(age);item.holder.position.lerp(landing,weight);if(!reduced)faceTravel(item);
      if(age>=7&&age<18||reduced){item.holder.position.copy(landing);item.holder.rotation.y=.4;for(const wing of item.wings)wing.object.quaternion.copy(wing.rest);}
    }}
    if(food){
      food.base.position.copy(home);food.base.rotation.z=0;
      if(running&&!reduced){const lift=smooth(0,1.5,age)*(1-smooth(4,6,age));food.base.position.y+=lift*.23;food.base.rotation.z=-lift*.8;}
      if(lid)lid.visible=!running||age>5;
      foodDrops.visible=running&&age<22;
      if(foodDrops.visible){for(let i=0;i<18;i++){const p=feedingPoint(i,cycle.runs),u=reduced?1:smooth(i*.055,2+i*.055,age);scratch.position.set(2.15,.98,-37.2).lerp(endPoint.set(p.x,.304,p.z),u);scratch.position.y+=reduced?0:Math.sin(u*Math.PI)*.16;scratch.scale.setScalar(1-smooth(biteTime(i),biteTime(i)+.15,age));scratch.rotation.set(0,0,0);scratch.updateMatrix();foodDrops.setMatrixAt(i,scratch.matrix);}foodDrops.instanceMatrix.needsUpdate=true;foodDrops.computeBoundingSphere();}
      if(running){for(const item of movers.filter(a=>a.kind==='fish')){const p=feedingPose(item.index,reduced?biteTime(item.index):age,cycle.runs),weight=reduced?1:visitWeight(age,4,22,26);item.holder.position.lerp(endPoint.set(p.x,p.y,p.z),weight);item.holder.rotation.set(reduced?0:p.pitch,p.yaw,0,'YXZ');}
        koiGarden?.feed(age,reduced,cycle.runs);
      }
    }
    if(mallet){
      mallet.rotation.copy(malletRotation);mallet.position.copy(malletHome);
      if(running){
        if(!soundPlayed&&age>=2.5){sound.play();soundPlayed=true;}
        if(!reduced){
          // Source gong face is +Z. Lift from its hook, clear the frame, align,
          // strike straight into the face, recoil, then reverse the return path.
          const points=[[0,0,0,0],[.6,0,.025,.035],[1.7,-.0858568,.0572,.065],[2.15,-.0858568,.0572,.065],[2.5,-.0858568,.0572,.020924],[2.8,-.0858568,.0572,.065],[3.6,-.0858568,.0572,.065],[4.5,0,.025,.035],[5.2,0,0,0]];
          const k=Math.max(1,points.findIndex(p=>p[0]>=age)),a=points[k-1],b=points[k];
          if(age<=5.2){const u=smooth(a[0],b[0],age);mallet.position.add(new THREE.Vector3(a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u,a[3]+(b[3]-a[3])*u));}
        }
      }
    }
    if(bird){bird.base.visible=running;if(running){
      // Stay outside the bowl on approach; descend onto its near rim only from above.
      const above=landing.clone().add(new THREE.Vector3(0,.42,.14));
      bird.base.position.set(5.2,3.8,-85).lerp(above,smooth(0,5,age));
      if(age>=5)bird.base.position.copy(above).lerp(landing,smooth(5,7,age));
      if(age>=20)bird.base.position.copy(landing).lerp(above,smooth(20,22,age));
      if(age>=22)bird.base.position.copy(above).lerp(new THREE.Vector3(5.2,3.8,-85),smooth(22,26,age));
      if(reduced)bird.base.position.copy(landing);
      bird.base.rotation.y=Math.PI;
      const perched=age>=7&&age<20||reduced;
      bird.mixer.setTime(perched?bird.restTime:age*1.7);


    }}
  }
  effects(null,false);
  label.set(spec.label,'Optional · look here, pinch, or tap');
  return {
    spec,cycle,hit,group,get focused(){return focused;},get status(){return status();},get ready(){return cycle.ready;},activate,
    pick(ray){return ray.intersectObject(hit,false).length>0;},
    pause(){this.resetGaze();if(sound.gain)sound.gain.gain.setTargetAtTime(0,audioContext.currentTime,.04);},
    resetGaze(){focused=false;dwell.reset();fill.geometry.setDrawRange(0,0);},
    configure(value,context){settings=value;audioContext=context;if(configuredSeconds!==value.dwellSeconds){configuredSeconds=value.dwellSeconds;dwell.configure(configuredSeconds);}const scale=value.targetSize==='large'?1.4:1;hit.scale.setScalar(scale);halo.scale.setScalar(scale);if(sound.gain)sound.gain.gain.setTargetAtTime(value.volume*.2,audioContext.currentTime,.04);},
    gaze(ray,dt){focused=this.pick(ray);const result=dwell.update(focused?'activity':null,dt);fill.geometry.setDrawRange(0,cycle.age!==null?384:Math.floor(result.progress*64)*6);track.material.opacity=focused?1:.7;if(result.activate&&cycle.ready)activate();return focused;},
    update(dt,{active,reduced,viewer}){
      reducedMode=reduced;
      halo.visible=active&&cycle.ready;
      const labelTarget=cycle.age===null?1:0;
      label.mesh.material.opacity=reduced?labelTarget:THREE.MathUtils.lerp(label.mesh.material.opacity,labelTarget,Math.min(1,dt*7));
      label.mesh.visible=active&&label.mesh.material.opacity>.01;
      if(viewer){halo.lookAt(viewer);label.mesh.lookAt(viewer);}
      if(sound.gain)sound.gain.gain.setTargetAtTime(active?settings.volume*.2:0,audioContext.currentTime,.04);
      if(cycle.tick(dt,!active)){if(reduced)restoreWildlife();else fishRestore.clear();dwell.requireLookAway();}
      if(active)effects(cycle.age,reduced);
      label.set(status(),cycle.ready?`Look here for ${settings.dwellSeconds}s · pinch or tap`:'You can keep exploring at any time');
    },
    dispose(){disposed=true;sound.stop();restoreWildlife();dwell.reset();},
  };
}
