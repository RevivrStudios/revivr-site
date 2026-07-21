import * as THREE from 'three';

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Raycaster-driven hover/click. Hover fires onHover(id|null); click fires
// onSelect(id) and tweens the camera to frame the node (manual tween in the RAF
// loop — no tween library). Controls are disabled during a tween so damping
// doesn't fight it. Only nodes flagged active (currently visible) are pickable.
export function createInteraction({ camera, controls, domElement, hits, positions, onHover, onSelect }) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const hitList = Array.from(hits.values());
  const defaultCam = camera.position.clone();
  const defaultTarget = controls.target.clone();

  let hovered = null;
  let tween = null;
  let downX = 0, downY = 0, dragging = false;

  function toPointer(ev) {
    const rect = domElement.getBoundingClientRect();
    pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function pick(ev) {
    toPointer(ev);
    raycaster.setFromCamera(pointer, camera);
    const hitsFound = raycaster.intersectObjects(hitList, false);
    for (const h of hitsFound) if (h.object.userData.active) return h.object.userData.nodeId;
    return null;
  }

  function onMove(ev) {
    const id = pick(ev);
    if (id !== hovered) {
      hovered = id;
      domElement.style.cursor = id ? 'pointer' : 'grab';
      onHover(id);
    }
  }
  function onDown(ev) { downX = ev.clientX; downY = ev.clientY; dragging = false; }
  function onUp(ev) {
    if (Math.hypot(ev.clientX - downX, ev.clientY - downY) > 5) return; // was a drag/orbit
    const id = pick(ev);
    if (id) { onSelect(id); focusNode(id); }
  }

  function startTween(camTo, targetTo, dur = 720) {
    controls.enabled = false;
    tween = {
      t: 0, dur,
      camFrom: camera.position.clone(), camTo: camTo.clone(),
      tgtFrom: controls.target.clone(), tgtTo: targetTo.clone(),
    };
  }

  function focusNode(id) {
    const p = positions.get(id);
    if (!p) return;
    const dir = camera.position.clone().sub(controls.target).normalize();
    const dist = 22; // frame the node
    startTween(p.clone().add(dir.multiplyScalar(dist)), p);
  }

  function resetView() {
    startTween(defaultCam, defaultTarget, 640);
  }

  function update(dtMs) {
    if (!tween) return;
    tween.t = Math.min(1, tween.t + dtMs / tween.dur);
    const k = easeInOutCubic(tween.t);
    camera.position.lerpVectors(tween.camFrom, tween.camTo, k);
    controls.target.lerpVectors(tween.tgtFrom, tween.tgtTo, k);
    camera.lookAt(controls.target);
    if (tween.t >= 1) { tween = null; controls.enabled = true; }
  }

  domElement.addEventListener('pointermove', onMove);
  domElement.addEventListener('pointerdown', onDown);
  domElement.addEventListener('pointerup', onUp);

  function dispose() {
    domElement.removeEventListener('pointermove', onMove);
    domElement.removeEventListener('pointerdown', onDown);
    domElement.removeEventListener('pointerup', onUp);
  }

  return { update, focusNode, resetView, dispose };
}
