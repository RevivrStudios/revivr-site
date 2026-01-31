import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const GRID_RES = 90;
const VERTEX_COUNT = GRID_RES * GRID_RES;
const TARGET_SIZE = 50.0;

let currentShapeIndex = 0;
let nextShapeIndex = 1;
let isMorphing = false;
let morphStartTime = 0;
const MORPH_DURATION = 1.5;

const titleEl = document.getElementById('title');
const descEl = document.getElementById('desc');
const statusEl = document.getElementById('status');
const btnEl = document.getElementById('morph-btn');
const audioBtn = document.getElementById('audio-btn');
const loadingEl = document.getElementById('loading');
const audioValEl = document.getElementById('audio-val');
const micSelect = document.getElementById('mic-select');

// Audio Input
let audioContext, analyser, dataArray;
let isAudioInit = false;
let audioLevel = 0;
let currentStream = null;

// Populate microphone list
async function populateMicrophones() {
    try {
        // Request permission first to get device labels
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tempStream.getTracks().forEach(track => track.stop());

        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(d => d.kind === 'audioinput');

        micSelect.innerHTML = '<option value="">Select Microphone...</option>';
        audioInputs.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label || `Microphone ${device.deviceId.substr(0, 5)}`;
            micSelect.appendChild(option);
        });

        console.log('📋 Found microphones:', audioInputs.map(d => d.label));
    } catch (err) {
        console.error('Error enumerating devices:', err);
    }
}

// Call on page load
populateMicrophones();

async function initAudio() {
    if (isAudioInit) {
        // Stop current stream and reinitialize
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }
        isAudioInit = false;
        analyser = null;
    }

    audioBtn.textContent = "Requesting...";

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        audioBtn.textContent = "Not Supported";
        audioBtn.style.color = "#ff0000";
        audioBtn.style.borderColor = "#ff0000";
        return;
    }

    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        // Get selected device or use default
        const selectedDeviceId = micSelect.value;
        const constraints = selectedDeviceId
            ? { audio: { deviceId: { exact: selectedDeviceId } } }
            : { audio: true };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        currentStream = stream;
        const track = stream.getAudioTracks()[0];
        console.log('✅ Microphone access granted:', track.label);

        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.3;
        dataArray = new Uint8Array(analyser.frequencyBinCount);

        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        console.log('✅ Analyser connected, fftSize:', analyser.fftSize, 'bins:', analyser.frequencyBinCount);

        isAudioInit = true;
        audioBtn.textContent = "Audio Active";
        audioBtn.style.borderColor = "#00ff88";
        audioBtn.style.color = "#00ff88";

    } catch (err) {
        console.error('Audio init failed:', err);
        audioBtn.textContent = "Error / Denied";
        audioBtn.style.borderColor = "#ff0000";
        audioBtn.style.color = "#ff0000";

        // Show detailed error
        const existingErr = document.getElementById('audio-error');
        if (existingErr) existingErr.remove();

        const errorMsg = document.createElement('div');
        errorMsg.id = 'audio-error';
        errorMsg.style.color = '#ff0000';
        errorMsg.style.position = 'absolute';
        errorMsg.style.bottom = '-25px';
        errorMsg.style.left = '0';
        errorMsg.style.fontSize = '10px';
        errorMsg.style.whiteSpace = 'nowrap';
        errorMsg.textContent = err.name || "Unknown Error";
        audioBtn.parentNode.style.position = 'relative';
        audioBtn.parentNode.appendChild(errorMsg);
    }
}

audioBtn.addEventListener('click', () => {
    initAudio();
});

// Allow re-initialization when mic selection changes
micSelect.addEventListener('change', () => {
    if (isAudioInit) {
        initAudio(); // Re-initialize with new device
    }
});

function getUV(i) {
    const u = (i % GRID_RES) / (GRID_RES - 1);
    const v = Math.floor(i / GRID_RES) / (GRID_RES - 1);
    return { u, v };
}

const SHAPES = [
    {
        name: "Breather Surface",
        desc: "A rhythmic standing wave surface derived from the sine-Gordon equation.",
        gen: (i) => {
            const { u: rawU, v: rawV } = getUV(i);
            const u = (rawU - 0.5) * 14;
            const v = (rawV - 0.5) * 30;

            const aa = 0.4;
            const w = Math.sqrt(1 - aa * aa);

            const cosh_au = Math.cosh(aa * u);
            const sinh_au = Math.sinh(aa * u);
            const sin_wv = Math.sin(w * v);
            const cos_wv = Math.cos(w * v);
            const den = aa * ((1 - aa * aa) * cosh_au * cosh_au + aa * aa * sin_wv * sin_wv);

            if (Math.abs(den) < 0.001) return new THREE.Vector3(0, 0, 0);

            const x = -u + (2 * (1 - aa * aa) * cosh_au * sinh_au) / den;
            const y = (2 * w * cosh_au * (-w * Math.cos(v) * cos_wv - Math.sin(v) * sin_wv)) / den;
            const z = (2 * w * cosh_au * (-w * Math.sin(v) * cos_wv + Math.cos(v) * sin_wv)) / den;

            return new THREE.Vector3(x, z, y);
        }
    },
    {
        name: "Klein Bottle",
        desc: "A non-orientable surface where inside and outside are indistinguishable.",
        gen: (i) => {
            const { u: rawU, v: rawV } = getUV(i);
            const u = rawU * Math.PI * 2;
            const v = rawV * Math.PI * 2;
            const r = 3;

            const cosU = Math.cos(u), sinU = Math.sin(u);
            const cosU2 = Math.cos(u / 2), sinU2 = Math.sin(u / 2);
            const cosV = Math.cos(v), sinV = Math.sin(v);
            const sin2V = Math.sin(2 * v);

            const x = (r + cosU2 * sinV - sinU2 * sin2V) * cosU;
            const y = (r + cosU2 * sinV - sinU2 * sin2V) * sinU;
            const z = sinU2 * sinV + cosU2 * sin2V;

            return new THREE.Vector3(x, y, z * 3.0);
        }
    },
    {
        name: "Super-Torus",
        desc: "A toroidal topology deformed by 'superformula' parameters.",
        gen: (i) => {
            const { u: rawU, v: rawV } = getUV(i);
            const u = rawU * Math.PI * 2;
            const v = rawV * Math.PI * 2;

            const sf = (ang, m, n1, n2, n3) => {
                const a = 1, b = 1;
                const t1 = Math.abs(Math.cos(m * ang / 4) / a);
                const t2 = Math.abs(Math.sin(m * ang / 4) / b);
                return Math.pow(Math.pow(t1, n2) + Math.pow(t2, n3), -1 / n1);
            };

            const R = 8;
            const rBase = 3;
            const rMod = sf(v, 6, 20, 10, 10);
            const r = rBase * rMod;

            const x = (R + r * Math.cos(v)) * Math.cos(u);
            const y = (R + r * Math.cos(v)) * Math.sin(u);
            const z = r * Math.sin(v);

            return new THREE.Vector3(x, z, y);
        }
    },
    {
        name: "Dini's Surface",
        desc: "A surface of constant negative curvature, obtained by twisting a pseudosphere.",
        gen: (i) => {
            const { u: rawU, v: rawV } = getUV(i);
            const u = rawU * 4 * Math.PI;
            const v = 0.01 + rawV * 2.0;

            const a = 1.0;
            const b = 0.2;

            const x = a * Math.cos(u) * Math.sin(v);
            const y = a * Math.sin(u) * Math.sin(v);
            const z = a * (Math.cos(v) + Math.log(Math.tan(v / 2))) + b * u;

            return new THREE.Vector3(x * 3.0, z * 2.0 - 10.0, y * 3.0);
        }
    }
];

const CACHE = [];

function generateData() {
    SHAPES.forEach((shape) => {
        const arr = new Float32Array(VERTEX_COUNT * 3);

        let min = new THREE.Vector3(Infinity, Infinity, Infinity);
        let max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

        for (let i = 0; i < VERTEX_COUNT; i++) {
            const vec = shape.gen(i);
            arr[i * 3] = vec.x;
            arr[i * 3 + 1] = vec.y;
            arr[i * 3 + 2] = vec.z;
            min.min(vec);
            max.max(vec);
        }

        const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
        const sizeVec = new THREE.Vector3().subVectors(max, min);
        const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
        const scale = TARGET_SIZE / maxDim;

        for (let i = 0; i < VERTEX_COUNT; i++) {
            arr[i * 3] = (arr[i * 3] - center.x) * scale;
            arr[i * 3 + 1] = (arr[i * 3 + 1] - center.y) * scale;
            arr[i * 3 + 2] = (arr[i * 3 + 2] - center.z) * scale;
        }
        CACHE.push(arr);
    });
}

generateData();
loadingEl.style.opacity = 0;

const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050508);
scene.fog = new THREE.Fog(0x050508, 50, 150);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 15, 55);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 2.0;

const geometry = new THREE.BufferGeometry();

const indices = [];
for (let j = 0; j < GRID_RES; j++) {
    for (let i = 0; i < GRID_RES; i++) {
        const a = j * GRID_RES + i;
        if (i < GRID_RES - 1) {
            indices.push(a, a + 1);
        }
        if (j < GRID_RES - 1) {
            indices.push(a, a + GRID_RES);
        }
    }
}
geometry.setIndex(indices);

const startDataA = new Float32Array(CACHE[0]);
const startDataB = new Float32Array(CACHE[0]);

geometry.setAttribute('positionA', new THREE.BufferAttribute(startDataA, 3));
geometry.setAttribute('positionB', new THREE.BufferAttribute(startDataB, 3));
geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(CACHE[0]), 3));

const material = new THREE.ShaderMaterial({
    uniforms: {
        time: { value: 0 },
        morphFactor: { value: 0 },
        audioLevel: { value: 0 }
    },
    vertexShader: document.getElementById('vertexShader').textContent,
    fragmentShader: document.getElementById('fragmentShader').textContent,
    transparent: true,
    depthTest: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    linewidth: 2
});

const mesh = new THREE.LineSegments(geometry, material);
scene.add(mesh);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = 0.2;
bloomPass.strength = 1.0;
bloomPass.radius = 0.3;
composer.addPass(bloomPass);

function triggerMorph() {
    if (isMorphing) return;
    isMorphing = true;
    morphStartTime = performance.now();
    btnEl.disabled = true;
    statusEl.innerText = "Reconfiguring Lattice...";

    const prevB = geometry.attributes.positionB.array;
    geometry.attributes.positionA.array.set(prevB);

    nextShapeIndex = (currentShapeIndex + 1) % SHAPES.length;
    geometry.attributes.positionB.array.set(CACHE[nextShapeIndex]);

    geometry.attributes.positionA.needsUpdate = true;
    geometry.attributes.positionB.needsUpdate = true;

    material.uniforms.morphFactor.value = 0;

    titleEl.innerText = `${SHAPES[currentShapeIndex].name} >> ${SHAPES[nextShapeIndex].name}`;
}

btnEl.addEventListener('click', triggerMorph);

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const time = clock.getElapsedTime();
    material.uniforms.time.value = time;

    // Audio Process
    if (isAudioInit && analyser) {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        const bassRange = 20;
        for (let i = 0; i < bassRange; i++) {
            sum += dataArray[i];
        }
        const avg = sum / bassRange;
        const maxVal = Math.max(...dataArray.slice(0, bassRange));
        audioLevel = THREE.MathUtils.lerp(audioLevel, avg / 255.0, 0.2);
        audioValEl.textContent = `${Math.round(audioLevel * 100)}% (max: ${maxVal})`;
    }

    material.uniforms.audioLevel.value = audioLevel;

    controls.update();

    if (isMorphing) {
        const elapsed = (performance.now() - morphStartTime) / 1000;
        let progress = Math.min(elapsed / MORPH_DURATION, 1.0);

        const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

        material.uniforms.morphFactor.value = ease;

        if (progress >= 1.0) {
            isMorphing = false;
            currentShapeIndex = nextShapeIndex;
            titleEl.innerText = SHAPES[currentShapeIndex].name;
            descEl.innerText = SHAPES[currentShapeIndex].desc;
            statusEl.innerText = "Structure: Stable";
            btnEl.disabled = false;
        }
    }

    composer.render();
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

animate();
