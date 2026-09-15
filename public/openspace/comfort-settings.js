export const comfortOptions = {
  dwellSeconds: [[1,'1 second'],[1.5,'1.5 seconds'],[2,'2 seconds'],[2.5,'2.5 seconds'],[3,'3 seconds']],
  targetSize: [['normal','Standard'],['large','Large']],
  motion: [['system','Device setting'],['reduced','Reduced'],['full','Full']],
  volume: [[0,'Muted'],[.2,'Quiet'],[.5,'Medium'],[.8,'Loud']],
};
export const comfortLabels={dwellSeconds:'Dwell time',targetSize:'Marker size',motion:'Motion',volume:'Sound volume'};
export const comfortDefaults={dwellSeconds:2,targetSize:'normal',motion:'system',volume:.5};
export function sanitizeComfort(value={}) {
  return Object.fromEntries(Object.entries(comfortOptions).map(([key,options])=>[key,options.some(([v])=>v===value?.[key])?value[key]:comfortDefaults[key]]));
}
export function readComfort(storage) {
  try{return sanitizeComfort(JSON.parse(storage.getItem('open-space-comfort')||'{}'));}catch{return {...comfortDefaults};}
}
export function saveComfort(storage,value) {try{storage.setItem('open-space-comfort',JSON.stringify(sanitizeComfort(value)));}catch{/* Preferences still apply when storage is unavailable. */}}
export function reducedMotion(settings,systemReduced) {return settings.motion==='reduced'||settings.motion==='system'&&systemReduced;}
export function nextComfort(settings,key) {
  const options=comfortOptions[key],index=options.findIndex(([v])=>v===settings[key]);
  return options[(index+1)%options.length][0];
}
