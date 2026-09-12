// Unlock once from a real click/pinch; subsequent dwell selections share it.
(() => {
  let context, source, sequence=0;
  const buffers=new Map();
  function unlock() {
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)return Promise.reject(new Error('Web Audio unavailable'));
    context ||= new Audio();
    return context.resume();
  }
  function stop(){sequence++;if(source){source.stop();source.disconnect();source=null;}}
  async function play(url){
    stop();const request=sequence;
    if(!context || context.state!=='running')throw new Error('Pinch Test sound to enable audio');
    if(!buffers.has(url))buffers.set(url,fetch(url).then(r=>{if(!r.ok)throw new Error('Recording unavailable');return r.arrayBuffer();}).then(b=>context.decodeAudioData(b)).catch(e=>{buffers.delete(url);throw e;}));
    const buffer=await buffers.get(url);
    if(request!==sequence)return;
    if(context.state!=='running')throw new Error('Pinch Test sound to resume audio');
    const next=context.createBufferSource();next.buffer=buffer;next.connect(context.destination);source=next;
    next.onended=()=>{next.disconnect();if(source===next)source=null;};next.start();
  }
  window.lookSayVoice={unlock,play,stop};
  window.addEventListener('pointerdown',()=>unlock().catch(()=>{}),{capture:true});
  window.addEventListener('keydown',()=>unlock().catch(()=>{}),{capture:true});
})();
