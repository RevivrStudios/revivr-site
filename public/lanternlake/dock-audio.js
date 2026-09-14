export function dockAudio(url) {
  let context, bufferTask, source, activeGain, volume = .5, sequence = 0;
  function unlock() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return Promise.reject(new Error('Audio unavailable'));
    context ||= new Audio();
    return context.resume();
  }
  function stop() {
    sequence++;
    if (source) { source.stop(); source.disconnect(); source = null; }
  }
  async function play() {
    const request = ++sequence;
    await unlock();
    if (context.state !== 'running') throw new Error('Pinch sound to enable audio');
    bufferTask ||= fetch(url).then(r => {
      if (!r.ok) throw new Error('Music could not load');
      return r.arrayBuffer();
    }).then(b => context.decodeAudioData(b)).catch(e => { bufferTask = null; throw e; });
    const buffer = await bufferTask;
    if (request !== sequence) return false;
    if (context.state !== 'running') throw new Error('Pinch sound to resume audio');
    const gain = context.createGain(); gain.gain.value = volume; activeGain=gain; gain.connect(context.destination);
    source = context.createBufferSource(); source.buffer = buffer; source.loop = true;
    source.connect(gain); source.onended = () => gain.disconnect(); source.start();
    return true;
  }
  return { unlock, play, stop,
    cue(){
      if(context?.state!=='running')return;
      const oscillator=context.createOscillator(),gain=context.createGain();
      oscillator.frequency.value=660;gain.gain.setValueAtTime(.035,context.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,context.currentTime+.18);
      oscillator.connect(gain);gain.connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+.2);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
    },
    setVolume(value){volume=Math.max(0,Math.min(1,value));if(activeGain)activeGain.gain.value=volume;} };
}
