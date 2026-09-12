export const MAX_LANTERNS=8;
export function lanternFlight(random=Math.random) {
  let flights=[],lastLaunch=-Infinity;
  return {
    canLaunch(count,time,silent=false) {
      if(count>=MAX_LANTERNS||(!silent&&time-lastLaunch<1))return false;
      if(!silent)lastLaunch=time;
      return true;
    },
    next() {
      // Two high flights in every five; shuffled rather than left to chance.
      if(!flights.length){flights=[true,true,false,false,false];for(let i=4;i>0;i--){const j=Math.floor(random()*(i+1));[flights[i],flights[j]]=[flights[j],flights[i]];}}
      const high=flights.pop();
      return {high,rise:high?8+random()*3:3.5+random()*2,stillTime:high?28+random()*8:16+random()*6};
    }
  };
}
