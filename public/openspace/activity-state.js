export const activitySpecs = [
  {id:'water',label:'Water the basil',duration:18,phases:[[0,'Watering the basil'],[7,'Watch the droplets settle'],[14,'A little water, a quiet moment']]},
  {id:'ripples',label:'Make a ripple',duration:18,phases:[[0,'Watch the ripples spread'],[11,'The water settles']]},
  {id:'butterfly',label:'Invite a butterfly',duration:24,phases:[[0,'A butterfly is approaching'],[7,'A visitor on the flower'],[18,'The butterfly returns to the garden']]},
  {id:'fish',label:'Feed the koi',duration:26,phases:[[0,'A few pellets for the koi'],[5,'The koi are gathering'],[22,'The koi return to exploring']]},
  {id:'chime',label:'Ring the garden chime',duration:20,phases:[[0,'A soft chime, a spreading ripple'],[10,'Let the sound and water settle']]},
  {id:'bird',label:'Invite a hummingbird',duration:26,phases:[[0,'A hummingbird is approaching'],[7,'A sip of nectar'],[13,'A moment on the bowl’s rim'],[20,'The hummingbird returns to the sky']]},
];
export class ActivityCycle {
  constructor(level){this.spec=activitySpecs[level];this.age=null;this.cooldown=0;this.runs=0;}
  get ready(){return this.age===null&&this.cooldown===0;}
  get status(){return this.age===null?(this.cooldown?'A quiet moment before trying again':this.spec.label):this.spec.phases.filter(([at])=>at<=this.age).at(-1)[1];}
  start(){if(!this.ready)return false;this.age=0;this.runs++;return true;}
  tick(dt,paused=false){
    if(paused||!Number.isFinite(dt)||dt<0||dt>.25)return false;
    if(this.age===null){this.cooldown=Math.max(0,this.cooldown-dt);return false;}
    this.age+=dt;
    if(this.age>=this.spec.duration){this.age=null;this.cooldown=4;return true;}
    return false;
  }
}
export const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function visitWeight(age,arrive=7,leave=18,end=24){return smooth(0,arrive,age)*(1-smooth(leave,end,age));}
// Seeded scatter changes with each feeding, with no circular boundary pattern.
export function feedingPoint(i,run=0){
  const hash=n=>{const v=Math.sin(n*127.1+run*311.7)*43758.5453;return v-Math.floor(v);};
  return {x:3.95+(hash(i*2+1)-.5)*1.05,y:.304,z:-37.65+(hash(i*2+2)-.5)*.85};
}
export const biteTime=i=>5+Math.floor(i/4)*3.4+(i%4)*.46;
export function feedingPose(index,age,run=0){
  const sequence=Array.from({length:18},(_,i)=>i).filter(i=>i%4===index%4);
  const next=sequence.find(i=>age<=biteTime(i)+.6)??sequence.at(-1),at=sequence.indexOf(next);
  const previous=sequence[Math.max(0,at-1)],from=feedingPoint(previous,run),to=feedingPoint(next,run);
  const start=at?biteTime(previous)+.6:0,u=smooth(start,biteTime(next)-.35,age);
  const rise=smooth(biteTime(next)-1,biteTime(next)-.15,age)*(1-smooth(biteTime(next)+.1,biteTime(next)+.6,age));
  const prior=feedingPoint(sequence[Math.max(0,at-2)],run),oldYaw=Math.atan2(from.x-prior.x,from.z-prior.z)||0,targetYaw=Math.atan2(to.x-from.x,to.z-from.z)||0;
  const delta=Math.atan2(Math.sin(targetYaw-oldYaw),Math.cos(targetYaw-oldYaw));
  const yaw=oldYaw+delta*smooth(start,start+.8,age),pitch=-.52*rise,mouth=.13+(index%4)*.008;
  // The mouth is ahead of the body; place it at the pellet at the bite peak.
  return {x:from.x+(to.x-from.x)*u-Math.sin(yaw)*mouth*Math.cos(pitch),z:from.z+(to.z-from.z)*u-Math.cos(yaw)*mouth*Math.cos(pitch),y:.13+(.304-mouth*Math.sin(.52)-.13)*rise,yaw,pitch};
}
