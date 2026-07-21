import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// Creates the renderer / scene / camera / composer / controls / CSS2D label
// renderer for the business map. Returns handles plus resize()/render()/
// dispose(). Knows nothing about the business — it's pure stage setup.
export function createScene(container) {
  const width = container.clientWidth || 1;
  const height = container.clientHeight || 1;

  const scene = new THREE.Scene();
  scene.background = null; // let the page background show through

  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 2000);
  camera.position.set(0, 4, 48);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  // CSS2D labels overlay — crisp HTML text, not textures.
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(width, height);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.left = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  container.appendChild(labelRenderer.domElement);

  // Lighting — warm key + cool fill, plus a soft ambient so glass reads.
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffd9b0, 1.1);
  key.position.set(12, 18, 24);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x88a0ff, 0.5);
  fill.position.set(-18, -8, 12);
  scene.add(fill);

  // Constrained orbit — no flipping under the map, no free panning, damped.
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.autoRotate = false;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.7;
  controls.minDistance = 18;
  controls.maxDistance = 90;
  controls.minPolarAngle = Math.PI * 0.18;
  controls.maxPolarAngle = Math.PI * 0.62;
  controls.target.set(0, 0, 0);

  // Gentle bloom — a lift, not neon.
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.35, 0.4, 0.85);
  composer.addPass(bloom);

  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    labelRenderer.setSize(w, h);
    composer.setSize(w, h);
    bloom.resolution.set(w, h);
  }

  function render() {
    controls.update();
    composer.render();
    labelRenderer.render(scene, camera);
  }

  function dispose() {
    controls.dispose();
    composer.dispose();
    renderer.dispose();
    renderer.forceContextLoss?.();
    if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    if (labelRenderer.domElement.parentNode) labelRenderer.domElement.parentNode.removeChild(labelRenderer.domElement);
  }

  return { THREE, scene, camera, renderer, labelRenderer, controls, composer, bloom, resize, render, dispose };
}
