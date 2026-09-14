export function dockDwell(seconds = 1.5, grace = .2, rearm = .35) {
  let target = null, elapsed = 0, fired = false, away = 0, requireBlank = false;
  const empty=()=>({progress:0,activate:null});
  const api = {
    reset() { target = null; elapsed = 0; fired = false; away = 0; requireBlank = false; },
    requireLookAway() {target=null;elapsed=0;fired=true;away=0;requireBlank=true;},
    configure(value) {seconds=Math.max(.5,Number(value)||1.5);api.reset();},
    consume(next) { target = next; elapsed = 0; fired = true; away = 0; requireBlank=false; },
    update(next, dt) {
      if(!Number.isFinite(dt)||dt>.25){api.reset();return empty();}
      dt=Math.max(0,dt);
      if(fired) {
        away=(requireBlank?next!==null:next===target)?0:away+dt;
        if(away<rearm)return empty();
        api.reset();
      }
      if(!next) {
        away+=dt;
        if(away>grace){target=null;elapsed=0;return empty();}
        return {progress:Math.min(1,elapsed/seconds),activate:null,focus:target};
      }
      if(next!==target){target=next;elapsed=0;}
      away=0;elapsed+=dt;
      const progress=Math.min(1,elapsed/seconds);
      if(progress===1){fired=true;return {progress,activate:target};}
      return {progress,activate:null};
    }
  };
  return api;
}
