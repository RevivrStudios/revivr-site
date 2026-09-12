import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dockAudio } from '../public/lanternlake/dock-audio.js';
test('Music unlocks, loops, stops, and reports failed downloads', async () => {
  const oldWindow=globalThis.window, oldFetch=globalThis.fetch;
  let starts=0,stops=0,fetches=0;
  class Context {
    state='suspended'; destination={};
    async resume(){this.state='running';}
    async decodeAudioData(){return {};}
    createGain(){return {gain:{value:0},connect(){},disconnect(){}};}
    createBufferSource(){return {connect(){},disconnect(){},start(){assert.equal(this.loop,true);starts++;},stop(){stops++;this.onended?.();}};}
  }
  globalThis.window={AudioContext:Context};
  globalThis.fetch=async()=>{fetches++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(0)};};
  try {
    const audio=dockAudio('test.mp3');await audio.unlock();
    assert.equal(await audio.play(),true);audio.stop();
    assert.equal(await audio.play(),true);audio.stop();
    assert.equal(starts,2);assert.equal(stops,2);assert.equal(fetches,1);
    globalThis.fetch=async()=>({ok:false});
    await assert.rejects(dockAudio('missing.mp3').play(),/could not load/);
  } finally {globalThis.window=oldWindow;globalThis.fetch=oldFetch;}
});
