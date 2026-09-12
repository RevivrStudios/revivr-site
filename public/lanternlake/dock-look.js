export function doubleActivation(action,interval=500) {
  let last=null;
  return {reset(){last=null;},tap(time,key='pointer',position=null,payload=null){
    const close=!position||!last?.position||Math.hypot(position.x-last.position.x,position.y-last.position.y)<24;
    if(last&&time-last.time>=0&&time-last.time<=interval&&last.key===key&&close){last=null;action(payload);}
    else last={time,key,position};
  }};
}
export function dockLook(camera,canvas,isXR,onTap) {
  const activation=doubleActivation(onTap);
  let drag=null,yaw=0,pitch=-.12;
  camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);
  canvas.style.touchAction='none';
  canvas.addEventListener('pointerdown',e=>{
    if(isXR()||e.button!==0)return;
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,total:0};canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId||isXR())return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    drag.total+=Math.abs(dx)+Math.abs(dy);drag.x=e.clientX;drag.y=e.clientY;
    if(drag.total>=7)activation.reset();
    yaw-=dx*.003;pitch=Math.max(-1.25,Math.min(1.1,pitch-dy*.003));camera.rotation.set(pitch,yaw,0);
  });
  canvas.addEventListener('pointerup',e=>{
    if(!drag||drag.id!==e.pointerId)return;
    const tap=drag.total<7,position={x:drag.x,y:drag.y};drag=null;
    if(tap&&!isXR())activation.tap(e.timeStamp??performance.now(),'pointer',position);
    if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
  });
  for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{if(drag||event==='pointercancel')activation.reset();drag=null;});
  return {reset(){activation.reset();drag=null;},restore(){activation.reset();camera.position.set(0,1.65,0);camera.rotation.set(pitch,yaw,0);}};
}
