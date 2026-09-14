import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

test('Look & Say reveals only the completed room and gates VR entry', () => {
  const html = fs.readFileSync('public/lookandsay/index.html', 'utf8');
  const load = html.slice(html.indexOf("import('three/addons/loaders/GLTFLoader.js')"), html.indexOf('/* ── Motion'));
  const reveal = load.indexOf('scene.add(room)');
  for (const step of ['await finishRoom(room)', 'await refineBedroom(room)', 'await addWindowGarden(room,staging)']) {
    assert(load.indexOf(step) >= 0 && load.indexOf(step) < reveal, `${step} precedes reveal`);
  }
  assert(load.indexOf('roomReady = true') > reveal);
  assert(load.includes('.catch(roomLoadFailed)'));
  assert(html.includes('button.disabled = !roomReady'));
  assert(html.includes('if (!roomReady) return;'));
  for (const file of ['bedroom-refinement.js', 'room-props.js', 'window-garden.js']) {
    const source = fs.readFileSync(`public/lookandsay/${file}`, 'utf8');
    assert(!source.includes('catch('), `${file} must propagate missing required assets`);
  }
});

test('Loading stages report progress and timeout gives a usable retry action', async()=>{
  const vm=await import('node:vm');
  const html=fs.readFileSync('public/lookandsay/index.html','utf8');
  const elements=new Map();
  const element=()=>({textContent:'',disabled:false,isConnected:true,attributes:{},setAttribute(k,v){this.attributes[k]=v;}});
  for(const id of ['vrbtn','exploreRoom','exploreRoomLabel'])elements.set(id,element());
  const manager={},events={};let timeout,delay,cleared=false;
  const context=vm.createContext({
    scene:{},THREE:{Color:class{},DefaultLoadingManager:manager},
    console:{error(){}},renderer:{domElement:{addEventListener:(name,fn)=>events[name]=fn}},
    document:{createElement:element,getElementById:id=>elements.get(id),querySelector:()=>({after(){}})},
    setTimeout:(fn,ms)=>{timeout=fn;delay=ms;return 1;},clearTimeout:()=>cleared=true,
  });
  vm.runInContext(html.slice(html.indexOf('    scene.background = new THREE.Color(0xeef3f2);'),html.indexOf('    let windowSky=null;'))+'\nglobalThis.statusElement=roomStatus;',context);
  assert.equal(elements.get('exploreRoom').disabled,true);
  context.reportRoomProgress('Preparing furniture');manager.onProgress('chair.glb',7);
  assert.match(context.statusElement.textContent,/Preparing furniture · 7 files loaded/);
  assert.equal(delay,90000);timeout();
  assert.equal(elements.get('exploreRoom').disabled,false);
  assert.equal(elements.get('exploreRoomLabel').textContent,'Retry room');
  assert.equal(elements.get('exploreRoom').attributes['aria-busy'],'false');
  assert(cleared);
  manager.onProgress('late.glb',8);
  assert.match(context.statusElement.textContent,/could not finish loading/,'Late downloads cannot erase the failure message');
  assert(html.includes('if(roomFailed)return;'),'Late completion cannot reveal a timed-out room');
});
