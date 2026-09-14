export const comfortOptions = {
  dwellSeconds: [[1,'1 second'],[1.5,'1.5 seconds'],[2.5,'2.5 seconds'],[3,'3 seconds']],
  targetSize: [['normal','Standard'],['large','Large']],
  placement: [['dock','Dock controls'],['nearby','Nearby panel']],
  aimDot: [[false,'Hidden'],[true,'Visible']],
  motion: [['system','Device setting'],['reduced','Reduced'],['full','Full']],
  fireworks: [['gentle','Gentle'],['standard','Standard'],['vivid','Vivid'],['off','Off']],
  background: [['normal','Regular'],['quiet','Occasional'],['off','Off']],
  feedbackSound: [[false,'Off'],[true,'On']],
  volume: [[.2,'Quiet'],[.5,'Medium'],[.8,'Loud']],
};
export const comfortDefaults={dwellSeconds:1.5,targetSize:'normal',placement:'dock',aimDot:false,motion:'system',fireworks:'vivid',background:'normal',feedbackSound:false,volume:.5};
export function sanitizeComfort(value={}) {
  return Object.fromEntries(Object.entries(comfortOptions).map(([key,options])=>[key,options.some(([v])=>v===value?.[key])?value[key]:comfortDefaults[key]]));
}
export function readComfort(storage) {
  try{return sanitizeComfort(JSON.parse(storage.getItem('lantern-lake-comfort')||'{}'));}catch{return {...comfortDefaults};}
}
export function saveComfort(storage,value) {try{storage.setItem('lantern-lake-comfort',JSON.stringify(sanitizeComfort(value)));}catch{/* Private browsing may disallow persistence. */}}
export function reducedMotion(settings,systemReduced) {return settings.motion==='reduced'||settings.motion==='system'&&systemReduced;}
export function nextComfort(settings,key) {
  const options=comfortOptions[key],index=options.findIndex(([v])=>v===settings[key]);
  return options[(index+1)%options.length][0];
}
