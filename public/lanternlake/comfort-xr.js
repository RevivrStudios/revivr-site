import * as THREE from 'three';

export function comfortXR(scene) {
  const panel=new THREE.Group();panel.name='Comfort controls';panel.visible=false;scene.add(panel);
  let buttons=[],title=null,messageUntil=0;
  function tile(label,width=1.08,height=.26) {
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=192;
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));
    mesh.renderOrder=15;mesh.userData.canvas=canvas;
    mesh.userData.write=text=>{
      const g=canvas.getContext('2d');g.clearRect(0,0,768,192);g.fillStyle='#15232ef5';g.beginPath();g.roundRect(2,2,764,188,28);g.fill();
      g.strokeStyle='#9baeb9';g.lineWidth=3;g.stroke();g.fillStyle='#ffffff';g.font='600 42px system-ui';g.textAlign='center';g.textBaseline='middle';g.fillText(text,384,96,720);texture.needsUpdate=true;
    };
    mesh.userData.write(label);return mesh;
  }
  const dockButton=tile('Comfort & help',1.9,.3);dockButton.position.set(0,1.75,12.4);dockButton.userData.key='menu';dockButton.visible=false;scene.add(dockButton);
  function addProgress(mesh) {
    const fill=new THREE.Mesh(new THREE.PlaneGeometry(1,.018),new THREE.MeshBasicMaterial({color:0xffd58a,depthTest:false,depthWrite:false,toneMapped:false}));
    fill.position.set(0,-.108,.008);fill.renderOrder=16;fill.visible=false;mesh.add(fill);mesh.userData.fill=fill;
  }
  addProgress(dockButton);
  const message=tile('',1.3,.22);message.visible=false;scene.add(message);
  const dot=new THREE.Mesh(new THREE.SphereGeometry(.0045,12,8),new THREE.MeshBasicMaterial({color:0xffffff,depthTest:false,depthWrite:false,toneMapped:false}));dot.renderOrder=20;dot.visible=false;scene.add(dot);
  function dispose(mesh) {mesh.geometry.dispose();mesh.material.map?.dispose();mesh.material.dispose();}
  return {
    panel,dockButton,
    set(items,heading='Comfort controls') {
      panel.traverse(o=>{if(o.isMesh)dispose(o);});panel.clear();buttons=[];
      const rows=Math.ceil(items.length/2),top=(rows-1)*.16;
      title=tile(heading,2.28,.24);title.position.y=top+.34;panel.add(title);
      items.forEach(([key,label],i)=>{
        const mesh=tile(label);mesh.userData.key=key;mesh.position.set(i%2?.59:-.59,top-Math.floor(i/2)*.32,0);addProgress(mesh);panel.add(mesh);buttons.push(mesh);
      });
    },
    place(origin,direction) {
      panel.position.copy(origin).addScaledVector(direction,2.6);
      panel.lookAt(origin);panel.updateMatrixWorld(true);
    },
    pick(ray) {
      const objects=panel.visible?buttons:dockButton.visible?[dockButton]:[];
      const hit=ray.intersectObjects(objects,false)[0];return hit?hit.object.userData.key:null;
    },
    progress(key,value) {
      for(const button of [dockButton,...buttons]) {
        const fill=button.userData.fill;fill.visible=button.userData.key===key&&value>0;
        fill.scale.x=value;fill.position.x=-(1-value)/2;
      }
    },
    message(text,position,time) {message.userData.write(text);message.position.copy(position);message.position.y+=.58;messageUntil=time+4;message.visible=true;},
    update(origin,direction,time,showAim) {
      dot.visible=showAim;dot.position.copy(origin).addScaledVector(direction,.8);
      message.visible=time<messageUntil;message.lookAt(origin);
    },
    hide() {panel.visible=false;dockButton.visible=false;dot.visible=false;message.visible=false;messageUntil=0;this.progress(null,0);},
  };
}
