export function dockDwell(seconds = 1.5) {
  let target = null, elapsed = 0, fired = false;
  return {
    reset() { target = null; elapsed = 0; fired = false; },
    consume(next) { target = next; elapsed = 0; fired = true; },
    update(next, dt) {
      if (next !== target || dt > .25) { target = next; elapsed = 0; fired = false; }
      if (!target || fired || dt > .25) return { progress: 0, activate: null };
      elapsed += Math.max(0, dt);
      const progress = Math.min(1, elapsed / seconds);
      if (progress === 1) { fired = true; return { progress, activate: target }; }
      return { progress, activate: null };
    }
  };
}
