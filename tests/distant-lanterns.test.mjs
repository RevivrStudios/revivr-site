import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import { distantLanterns, distantLanternScale, DISTANT_LANTERN_LIMIT, DISTANT_LANTERN_SOURCES } from '../public/lanternlake/distant-lanterns.js';
import { lanternFlight, MAX_LANTERNS } from '../public/lanternlake/lantern-flight.js';

const html=fs.readFileSync('public/lanternlake/index.html','utf8');
test('All three sources start within 1–2 seconds, staggered; caps hold over repeated flights',()=>{
  for(const random of [()=>0,()=>.999999,Math.random]) {
    const schedule=distantLanterns(random), live=[], releases=[];
    schedule.reset(0);
    for(let frame=0;frame<60*180;frame++) {
      const t=frame/60;
      for(let i=live.length-1;i>=0;i--)if(t-live[i].t>=28)live.splice(i,1);
      const counts=DISTANT_LANTERN_SOURCES.map((_,source)=>live.filter(l=>l.source===source).length);
      const source=schedule.update(t,counts);
      if(source!==null) {
        assert(counts[source]<4);
        if(releases.length)assert(t-releases.at(-1).t>=.25-1e-9,'No simultaneous launches');
        live.push({source,t});releases.push({source,t});
      }
    }
    assert.equal(new Set(releases.slice(0,3).map(l=>l.source)).size,3);
    for(const l of releases.slice(0,3))assert(l.t>=1&&l.t<=2);
    assert(releases.length>30,'Sources continue replenishing');
    schedule.reset(200);
    assert.equal(schedule.update(200,[0,0,0]),null);
    assert.notEqual(schedule.update(201.5,[0,0,0]),null);
    assert.equal(schedule.update(201.5,[0,0,0]),null,'Only one release when a frame is repeated');
  }
});

test('Full locations are skipped and a delayed frame never batches releases',()=>{
  const s=distantLanterns(()=>0);s.reset(0);
  assert.equal(s.update(1,[4,0,0]),null);
  assert.equal(s.update(1.25,[4,0,0]),1);
  assert.equal(s.update(1.5,[4,0,0]),2);
  assert.equal(s.update(100,[4,4,4]),null);
  assert.equal(s.update(100,[0,0,0]),null);
});

test('Actual release function caps distant sources independently and preserves eight player slots',()=>{
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();
  const lanterns=[],clock={elapsedTime:0};
  let playerReleases=0;
  const context=vm.createContext({THREE,scene,camera,lanterns,clock,
    flightPolicy:lanternFlight(),distantLanternScale,MAX_LANTERNS,DISTANT_LANTERN_LIMIT,DISTANT_LANTERN_SOURCES,
    notify(){},playerLanternCount:()=>lanterns.filter(l=>l.sourceIndex===null).length,
    paperGeo:new THREE.CylinderGeometry(),paperTexture:null,capGeo:new THREE.CylinderGeometry(),
    woodDark:new THREE.MeshStandardMaterial(),glowTex:null,rimMaterial:new THREE.MeshStandardMaterial(),
    upperRimGeo:new THREE.TorusGeometry(),lowerRimGeo:new THREE.TorusGeometry(),
    hint:{classList:{remove(){}}},completeRelease:()=>playerReleases++});
  vm.runInContext(html.slice(html.indexOf('  function releaseLantern('),html.indexOf('  function completeRelease(')),context);
  for(let source=0;source<3;source++) {
    for(let i=0;i<4;i++) {
      const entry=context.releaseLantern(undefined,true,source);
      assert.deepEqual(entry.group.position.toArray(),DISTANT_LANTERN_SOURCES[source]);
      assert(entry.vel.y>0);
    }
    assert.equal(context.releaseLantern(undefined,true,source),null);
  }
  assert.equal(playerReleases,0,'Ambient releases do not count as player participation');
  for(let i=0;i<8;i++){clock.elapsedTime=i*2;assert(context.releaseLantern());}
  clock.elapsedTime=20;assert.equal(context.releaseLantern(),null);
  assert.equal(lanterns.length,20);assert.equal(playerReleases,8);
  lanterns.splice(lanterns.findIndex(l=>l.sourceIndex===1),1);
  assert(context.releaseLantern(undefined,true,1),'A freed source slot can refill');
});


test('Far-shore lanterns start smaller and shrink smoothly throughout their flight',()=>{
  for(const duration of [10,16,28]) {
    assert.equal(distantLanternScale(0,duration),1.65);
    let previous=1.65;
    for(let age=.1;age<=duration;age+=.1) {
      const scale=distantLanternScale(age,duration);
      assert(scale<previous);assert(scale>=.55-1e-9);previous=scale;
    }
    assert(Math.abs(distantLanternScale(duration,duration)-.55)<1e-9);
    assert.equal(distantLanternScale(-1,duration),1.65);
  }
});
