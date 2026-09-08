import * as THREE from 'three';

// One locally served panorama supplies both square prints; no glass/reflection pass.
let ready;
export function loadWallArt() {
  return ready ||= new THREE.TextureLoader().loadAsync('./assets/retreat/quiet-horizons.png').then(texture => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return [0, 1].map(index => {
      const panel = texture.clone();
      panel.repeat.set(.5, 1);
      panel.offset.set(index * .5, 0);
      panel.needsUpdate = true;
      const material = new THREE.MeshStandardMaterial({map: panel, roughness: 1, metalness: 0});
      material.name = `Quiet Horizons ${index + 1}`;
      material.userData.shared = true;
      return material;
    });
  });
}
