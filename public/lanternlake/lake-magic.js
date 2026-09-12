import * as THREE from 'three';

export function lakeMagic(scene,reduceMotion) {
  const ripples=[];
  const bursts=[];
  const palette=[['red',0xff3030],['yellow',0xffe629],['blue',0x3980ff],['green',0x39ff69],['purple',0xba48ff],['orange',0xff8a24],['white',0xffffff]];
  let colorBag=[],lastColor=null;
  function nextColor() {
    if(!colorBag.length) {
      colorBag=palette.slice();
      for(let i=colorBag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[colorBag[i],colorBag[j]]=[colorBag[j],colorBag[i]];}
      // Draw from the end; prevent a repeat across shuffled-cycle boundaries.
      if(colorBag[colorBag.length-1][0]===lastColor)[colorBag[0],colorBag[colorBag.length-1]]=[colorBag[colorBag.length-1],colorBag[0]];
    }
    const color=colorBag.pop();lastColor=color[0];return color;
  }
  function burst(position,t) {
    if(bursts.length>=4){const old=bursts.shift();scene.remove(old.points);old.points.geometry.dispose();old.points.material.dispose();}
    const count=reduceMotion?24:96,positions=new Float32Array(count*3),velocities=new Float32Array(count*3),colors=new Float32Array(count*3);
    const [colorName,colorHex]=nextColor(),burstColor=new THREE.Color(colorHex);
    for(let i=0;i<count;i++) {
      const y=1-2*(i+.5)/count,a=i*2.39996,r=Math.sqrt(1-y*y),speed=.65+Math.random()*.6;
      velocities.set([Math.cos(a)*r*speed,y*speed,Math.sin(a)*r*speed],i*3);
      if(reduceMotion)positions.set([Math.cos(a)*r*.3,y*.3,Math.sin(a)*r*.3],i*3);
      burstColor.toArray(colors,i*3);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
    const material=new THREE.PointsMaterial({size:.075,vertexColors:true,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
    material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat r=length(gl_PointCoord-vec2(0.5))*2.0; if(r>=1.0) discard; diffuseColor.a*=exp(-r*r*4.0)*(1.0-smoothstep(0.7,1.0,r));');};
    const points=new THREE.Points(geometry,material);points.name='Lantern firework';points.position.copy(position);points.frustumCulled=false;scene.add(points);
    points.userData.burstColor=colorName;
    bursts.push({points,velocities,born:t});
  }
  const ringGeo=new THREE.RingGeometry(.96,1,64);
  const star=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xffe6c3,transparent:true,opacity:0,depthWrite:false}));
  star.name='Occasional shooting star';star.visible=false;scene.add(star);
  const starPositions=new Float32Array(6);star.geometry.setAttribute('position',new THREE.BufferAttribute(starPositions,3));star.frustumCulled=false;
  let nextStar=45+Math.random()*40,starStart=-100,ctx,master,waterGain,enabled=false,nextCreak=0,lastRelease=-100,count=0;
  const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
  function tone(frequency,volume,duration,pan=0,type='sine') {
    if(!enabled||!ctx||ctx.state!=='running')return;
    const osc=ctx.createOscillator(),gain=ctx.createGain(),panner=ctx.createStereoPanner();
    osc.type=type;osc.frequency.setValueAtTime(frequency,ctx.currentTime);osc.frequency.exponentialRampToValueAtTime(frequency*.96,ctx.currentTime+duration);
    gain.gain.setValueAtTime(0,ctx.currentTime);gain.gain.linearRampToValueAtTime(volume,ctx.currentTime+.08);gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+duration);
    panner.pan.value=pan;osc.connect(gain).connect(panner).connect(master);osc.start();osc.stop(ctx.currentTime+duration+.1);osc.onended=()=>{osc.disconnect();gain.disconnect();panner.disconnect();};
  }
  async function sound(on) {
    enabled=on;
    if(on&&!ctx) {
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
      ctx=new Audio();master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);
      const buffer=ctx.createBuffer(1,ctx.sampleRate*4,ctx.sampleRate),data=buffer.getChannelData(0);
      let low=0;for(let i=0;i<data.length;i++){low=low*.985+(Math.random()*2-1)*.015;data[i]=low;}
      const noise=ctx.createBufferSource();noise.buffer=buffer;noise.loop=true;
      const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=850;
      waterGain=ctx.createGain();waterGain.gain.value=.16;noise.connect(filter).connect(waterGain).connect(master);noise.start();
    }
    if(ctx){if(on)await ctx.resume();master.gain.setTargetAtTime(on?.4:0,ctx.currentTime,.3);}
  }
  function release(position,t) {
    lastRelease=t;count++;
    tone(660,.06,3,-.15);tone(990,.025,4,.2);
    if(reduceMotion)return;
    if(ripples.length>=8){const old=ripples.shift();scene.remove(old.mesh);old.mesh.material.dispose();}
    const mesh=new THREE.Mesh(ringGeo,new THREE.MeshBasicMaterial({color:0xffd4a1,transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide}));
    mesh.rotation.x=-Math.PI/2;mesh.position.set(position.x,.025,position.z);mesh.scale.setScalar(.18);scene.add(mesh);ripples.push({mesh,born:t});
  }
  function update(t) {
    for(let i=bursts.length-1;i>=0;i--) {
      const b=bursts[i],age=t-b.born;
      if(age>=4){scene.remove(b.points);b.points.geometry.dispose();b.points.material.dispose();bursts.splice(i,1);continue;}
      b.points.material.opacity=.65*smooth(age/.25)*(1-smooth(age/4));
      if(!reduceMotion){const p=b.points.geometry.attributes.position;
        for(let j=0;j<p.count;j++)p.setXYZ(j,b.velocities[j*3]*age,b.velocities[j*3+1]*age-.1*age*age,b.velocities[j*3+2]*age);
        p.needsUpdate=true;
      }
    }
    const calm=count>=3?smooth((t-lastRelease-5)/12):0;
    if(waterGain&&enabled){waterGain.gain.value=(.16+.035*Math.sin(t*.7)+.025*Math.sin(t*1.1))*(1-calm*.3);if(t>nextCreak){tone(130,.018,1.8,-.65,'triangle');nextCreak=t+18+Math.random()*22;}}
    for(let i=ripples.length-1;i>=0;i--){const r=ripples[i],age=t-r.born;r.mesh.scale.setScalar(.18+age*.32);r.mesh.material.opacity=.2*(1-smooth(age/7));if(age>=7){scene.remove(r.mesh);r.mesh.material.dispose();ripples.splice(i,1);}}
    if(!reduceMotion&&t>nextStar){starStart=t;nextStar=t+70+Math.random()*60;}
    const age=t-starStart;star.visible=!reduceMotion&&age>=0&&age<3;
    if(star.visible){const u=age/3;starPositions.set([-65+u*32,65-u*12,-180,-65+u*32-3,65-u*12+1.1,-180]);star.geometry.attributes.position.needsUpdate=true;star.material.opacity=.35*Math.sin(Math.PI*u);}
    return calm;
  }
  document.addEventListener('visibilitychange',()=>{if(ctx){if(document.hidden)ctx.suspend();else if(enabled)ctx.resume().catch(()=>{});}});
  return {release,update,sound,burst};
}
