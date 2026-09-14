export const MAX_LANTERNS=8;
export function lanternFlight(random=Math.random) {
  let flights=[],playerFlights=[],lastLaunch=-Infinity;
  return {
    canLaunch(count,time,silent=false) {
      if(count>=MAX_LANTERNS||(!silent&&time-lastLaunch<1))return false;
      if(!silent)lastLaunch=time;
      return true;
    },
    nextPlayer() {
      if(!playerFlights.length) {
        playerFlights=[0,1,2];
        for(let i=2;i>0;i--){const j=Math.floor(random()*(i+1));[playerFlights[i],playerFlights[j]]=[playerFlights[j],playerFlights[i]];}
      }
      const band=playerFlights.pop();
      const ranges=[[10,14,24,30],[18,23,34,42],[28,34,44,52]];
      const [low,high,soon,late]=ranges[band];
      return {high:band===2,rise:low+random()*(high-low),burstTime:soon+random()*(late-soon)};
    },
    next() {
      // Four quick blooms and one longer flight per five, shuffled to vary the rhythm.
      if(!flights.length){flights=[true,false,false,false,false];for(let i=4;i>0;i--){const j=Math.floor(random()*(i+1));[flights[i],flights[j]]=[flights[j],flights[i]];}}
      const high=flights.pop();
      return {high,rise:high?8+random()*3:3.5+random()*2,burstTime:high?20+random()*8:10+random()*6};
    }
  };
}


// Reach the chosen height before the timed burst, regardless of calming drift.
export function playerLanternHeight(flight, burstHeight, age) {
  const progress=Math.max(0,Math.min(1,age/flight.burstTime));
  return burstHeight-flight.rise+flight.rise*progress;
}
