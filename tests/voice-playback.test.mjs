import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
let created=0,started=[],pending={};
class AudioContext {
  constructor(){created++;this.state='suspended';this.destination={};}
  resume(){this.state='running';return Promise.resolve();}
  decodeAudioData(data){return Promise.resolve(data);}
  createBufferSource(){return {connect(){},disconnect(){},stop(){},start(){started.push(this.buffer);}};}
}
const window={AudioContext,addEventListener(){}};
vm.runInNewContext(fs.readFileSync('public/lookandsay/voice-playback.js','utf8'),{window,fetch:url=>new Promise(resolve=>{pending[url]=()=>resolve({ok:true,arrayBuffer:()=>Promise.resolve(url)});})});
const voice=window.lookSayVoice;
await assert.rejects(voice.play('locked'),/enable audio/);
await voice.unlock();await voice.unlock();assert.equal(created,1);
const first=voice.play('first'),second=voice.play('second');
pending.second();await second;pending.first();await first;
assert.deepEqual(started,['second'],'Late download never speaks an older selection');
await voice.play('second');assert.deepEqual(started,['second','second']);
console.log('PASS: gesture unlock, shared context, decoded reuse, stale selection cancellation');
