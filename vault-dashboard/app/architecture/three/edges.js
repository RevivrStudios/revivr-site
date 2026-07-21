import * as THREE from 'three';
import { colorFor } from './nodes.js';

const BASE_OPACITY = 0.16;
const HI_OPACITY = 0.85;
const AMBER = new THREE.Color(0xffb347);
const MAGENTA = new THREE.Color(0xb85cff);
const BLEND = new THREE.Color(0xd98cbf); // amber↔magenta midpoint for shared nodes
const NEUTRAL = new THREE.Color(0x8a8f9c);

// Builds one line per edge between node positions. Shared Quinn/Quell targets
// (a node touched by BOTH agents — derived from co-occurrence, not a special
// edge type) get a gradient line from the agent's colour to a blended colour at
// the shared node. Everything else is a thin neutral/tinted line.
export function createEdges(scene, nodes, edges, positions) {
  const byId = new Map(nodes.map((n) => [n.id, n]));

  // shared targets: nodes with an edge from quinn AND from quell
  const fromQuinn = new Set();
  const fromQuell = new Set();
  for (const e of edges) {
    if (e.from === 'quinn') fromQuinn.add(e.to);
    if (e.to === 'quinn') fromQuinn.add(e.from);
    if (e.from === 'quell') fromQuell.add(e.to);
    if (e.to === 'quell') fromQuell.add(e.from);
  }
  const shared = new Set([...fromQuinn].filter((id) => fromQuell.has(id)));

  const lines = []; // { line, from, to }

  for (const e of edges) {
    const a = positions.get(e.from);
    const b = positions.get(e.to);
    if (!a || !b) continue;

    // Is this a shared agent→sharedTarget edge? give it a gradient.
    const agent = e.from === 'quinn' || e.from === 'quell' ? e.from
      : (e.to === 'quinn' || e.to === 'quell' ? e.to : null);
    const other = e.from === agent ? e.to : e.from;
    const isBlended = agent && shared.has(other);

    let cFrom, cTo;
    if (isBlended) {
      const agentColor = agent === 'quinn' ? AMBER : MAGENTA;
      // colour agent-end = agent colour, target-end = blended
      cFrom = e.from === agent ? agentColor : BLEND;
      cTo = e.from === agent ? BLEND : agentColor;
    } else {
      const src = byId.get(e.from);
      const tint = src ? new THREE.Color(colorFor(src)) : NEUTRAL;
      cFrom = tint.clone().lerp(NEUTRAL, 0.5);
      cTo = cFrom;
    }

    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    geo.setAttribute('color', new THREE.Float32BufferAttribute(
      [cFrom.r, cFrom.g, cFrom.b, cTo.r, cTo.g, cTo.b], 3));
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: BASE_OPACITY,
    });
    const line = new THREE.Line(geo, mat);
    line.userData = { from: e.from, to: e.to, isBlended };
    scene.add(line);
    lines.push({ line, from: e.from, to: e.to });
  }

  // show an edge only when both endpoints are visible
  function updateVisibility(isVisible) {
    for (const { line, from, to } of lines) line.visible = isVisible(from) && isVisible(to);
  }

  // emphasise edges touching a node (or set of nodes); dim the rest
  function highlight(ids) {
    const set = ids instanceof Set ? ids : new Set(ids ? [ids] : []);
    const has = set.size > 0;
    for (const { line, from, to } of lines) {
      if (!line.visible) continue;
      const on = !has || set.has(from) || set.has(to);
      line.material.opacity = on ? (has ? HI_OPACITY : BASE_OPACITY) : 0.04;
    }
  }
  const reset = () => highlight(null);

  function dispose() {
    for (const { line } of lines) { line.geometry.dispose(); line.material.dispose(); scene.remove(line); }
    lines.length = 0;
  }

  return { lines, updateVisibility, highlight, reset, dispose };
}
