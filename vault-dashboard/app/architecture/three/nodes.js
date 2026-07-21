import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

// ---- color + size derived from tier/owner (never per-node hardcoded) -------
const AMBER = 0xffb347;   // Quinn
const MAGENTA = 0xb85cff; // Quell
const ORANGE = 0xff7a3d;  // shared (Quinn+Quell)
const PINK = 0xff4f8b;    // accessibility mission
const STEEL = 0x7aa2d8;   // external tools
const CYAN = 0x43d9c8;    // project
const WARM = 0xffd0a0;    // core, unowned (the studio)

export function colorFor(node) {
  if (node.owner === 'quinn') return AMBER;
  if (node.owner === 'quell') return MAGENTA;
  if (node.owner === 'shared') return ORANGE;
  if (node.tier === 'accessibility') return PINK;
  if (node.tier === 'external') return STEEL;
  if (node.tier === 'project') return CYAN;
  return WARM;
}

function radiusFor(tier) {
  return { core: 1.7, agent: 1.4, domain: 0.85, project: 1.0, accessibility: 0.82, external: 0.6 }[tier] || 0.9;
}

// ---- layout: fixed concentric rings, children clustered near their anchor --
const RING_RADIUS = [0, 11, 20, 28];
const RING_DEPTH = [2, 0, -3, -6];
const HUB_ANGLES_DEG = {
  accessibility: 90, quinn: 150, operations: 190, 'operations-website': 230,
  'obsidian-vault': 270, projects: 310, marketing: 350, quell: 30,
};
const ANCHOR_PREF = ['operations', 'marketing', 'projects', 'accessibility', 'quinn', 'quell', 'operations-website', 'obsidian-vault'];

function ringLevel(node) {
  if (node.id === 'revivr-studios') return 0;
  if (node.visibleInitially) return 1;
  if (node.tier === 'external') return 3;
  return 2;
}

export function computeLayout(nodes, edges) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const adj = new Map(nodes.map((n) => [n.id, []]));
  for (const e of edges) {
    if (adj.has(e.from)) adj.get(e.from).push(e.to);
    if (adj.has(e.to)) adj.get(e.to).push(e.from);
  }

  const angleDeg = new Map(); // id -> degrees
  const pos = new Map();      // id -> THREE.Vector3
  const place = (id, deg, level) => {
    const r = RING_RADIUS[level];
    const a = (deg * Math.PI) / 180;
    const jitter = (id.charCodeAt(0) % 5) * 0.25;
    pos.set(id, new THREE.Vector3(r * Math.cos(a), r * Math.sin(a), RING_DEPTH[level] + jitter));
    angleDeg.set(id, deg);
  };

  place('revivr-studios', 0, 0);
  for (const [id, deg] of Object.entries(HUB_ANGLES_DEG)) place(id, deg, 1);

  const anchorFor = (node) => {
    const neigh = adj.get(node.id) || [];
    for (const pref of ANCHOR_PREF) if (neigh.includes(pref) && angleDeg.has(pref)) return pref;
    return neigh.find((n) => angleDeg.has(n)) || 'revivr-studios';
  };

  const placeCluster = (candidates, level) => {
    const groups = new Map();
    for (const n of candidates) {
      const a = anchorFor(n);
      if (!groups.has(a)) groups.set(a, []);
      groups.get(a).push(n);
    }
    for (const [anchor, group] of groups) {
      const base = angleDeg.get(anchor) ?? 0;
      const spread = Math.min(64, 12 * group.length);
      const step = group.length > 1 ? spread / (group.length - 1) : 0;
      group.forEach((n, i) => place(n.id, base - spread / 2 + i * step, level));
    }
  };

  placeCluster(nodes.filter((n) => ringLevel(n) === 2), 2);
  placeCluster(nodes.filter((n) => ringLevel(n) === 3), 3);

  // any strays
  for (const n of nodes) if (!pos.has(n.id)) place(n.id, (n.id.charCodeAt(0) * 37) % 360, 2);
  return pos;
}

// ---- mesh + label construction --------------------------------------------
export function createNodes(scene, nodes, edges) {
  const positions = computeLayout(nodes, edges);
  const meshes = new Map();   // id -> mesh
  const hits = new Map();     // id -> invisible larger sphere for raycasting
  const labels = new Map();   // id -> CSS2DObject
  const state = new Map();    // id -> { visible }

  for (const node of nodes) {
    const p = positions.get(node.id);
    const color = colorFor(node);
    const r = radiusFor(node.tier);

    const geo = new THREE.IcosahedronGeometry(r, node.tier === 'external' ? 1 : 2);
    const mat = new THREE.MeshPhysicalMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.22,
      metalness: 0.1,
      roughness: 0.28,
      transmission: 0.35,
      thickness: 1.2,
      transparent: true,
      opacity: 0.92,
      clearcoat: 0.4,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(p);
    mesh.userData.nodeId = node.id;
    scene.add(mesh);
    meshes.set(node.id, mesh);

    const hitGeo = new THREE.SphereGeometry(r + 1.1, 8, 8);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hit = new THREE.Mesh(hitGeo, hitMat);
    hit.position.copy(p);
    hit.userData.nodeId = node.id;
    scene.add(hit);
    hits.set(node.id, hit);

    const el = document.createElement('div');
    el.className = `arch-map-label tier-${node.tier}` + (node.owner ? ` owner-${node.owner}` : '');
    el.textContent = node.label;
    const label = new CSS2DObject(el);
    label.position.set(p.x, p.y + r + 0.9, p.z);
    scene.add(label);
    labels.set(node.id, label);

    const vis = !!node.visibleInitially;
    state.set(node.id, { visible: vis });
    setVisible(node.id, vis);
  }

  function setVisible(id, v) {
    const m = meshes.get(id), h = hits.get(id), l = labels.get(id);
    if (!m) return;
    m.visible = v; h.visible = false; // hit stays invisible always; toggle raycast eligibility via .layers/visible of mesh
    h.userData.active = v;
    l.visible = v;
    l.element.style.opacity = v ? '1' : '0';
    state.get(id).visible = v;
  }
  const isVisible = (id) => state.get(id)?.visible;

  // hover/filter emphasis: highlight a set, dim the rest (visible nodes only)
  function emphasize(highlightIds) {
    const hasSel = highlightIds && highlightIds.size > 0;
    for (const [id, mesh] of meshes) {
      if (!state.get(id).visible) continue;
      const on = !hasSel || highlightIds.has(id);
      mesh.material.opacity = on ? 0.95 : 0.12;
      mesh.material.emissiveIntensity = on ? (hasSel ? 0.5 : 0.22) : 0.05;
      const lbl = labels.get(id).element;
      lbl.style.opacity = on ? '1' : '0.18';
      lbl.classList.toggle('dim', !on);
    }
  }
  const reset = () => emphasize(null);

  function dispose() {
    for (const m of meshes.values()) { m.geometry.dispose(); m.material.dispose(); scene.remove(m); }
    for (const h of hits.values()) { h.geometry.dispose(); h.material.dispose(); scene.remove(h); }
    for (const l of labels.values()) { l.element.remove(); scene.remove(l); }
    meshes.clear(); hits.clear(); labels.clear();
  }

  return { positions, meshes, hits, labels, setVisible, isVisible, emphasize, reset, dispose };
}
