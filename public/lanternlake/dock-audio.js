export function dockAudio(url) {
  let context, bufferTask, source, sequence = 0;
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
    const gain = context.createGain(); gain.gain.value = .5; gain.connect(context.destination);
    source = context.createBufferSource(); source.buffer = buffer; source.loop = true;
    source.connect(gain); source.onended = () => gain.disconnect(); source.start();
    return true;
  }
  return { unlock, play, stop };
}
