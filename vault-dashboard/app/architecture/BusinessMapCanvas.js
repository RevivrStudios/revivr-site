'use client';

import { useEffect, useRef, useState } from 'react';
import { NODES, EDGES } from './data/businessMapData';
import { createScene } from './three/scene';
import { createNodes } from './three/nodes';
import { createEdges } from './three/edges';
import { createInteraction } from './three/interaction';
import SidePanel from './SidePanel';
import FilterBar from './FilterBar';

const NODE_BY_ID = new Map(NODES.map((n) => [n.id, n]));

// chip -> predicate on a node
const FILTER_PREDICATES = {
  quinn: (n) => n.owner === 'quinn',
  quell: (n) => n.owner === 'quell',
  shared: (n) => n.owner === 'shared',
  operations: (n) => n.group === 'operations',
  marketing: (n) => n.group === 'marketing',
  projects: (n) => n.group === 'projects',
  obsidian: (n) => n.group === 'obsidian',
  external: (n) => n.tier === 'external',
};

function buildAdjacency(edges) {
  const adj = new Map();
  const add = (a, b) => { if (!adj.has(a)) adj.set(a, new Set()); adj.get(a).add(b); };
  for (const e of edges) { add(e.from, e.to); add(e.to, e.from); }
  return adj;
}

export default function BusinessMapCanvas() {
  const mountRef = useRef(null);
  const three = useRef(null);       // { S, N, E, I, adjacency }
  const filtersRef = useRef(new Set());
  const selectedRef = useRef(null);

  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [filters, setFilters] = useState(new Set());

  // ---- apply resting/hover/filter emphasis --------------------------------
  function restingSet() {
    const { N } = three.current;
    const f = filtersRef.current;
    if (f.size > 0) {
      const set = new Set();
      for (const n of NODES) if (N.isVisible(n.id) && [...f].some((k) => FILTER_PREDICATES[k](n))) set.add(n.id);
      return set;
    }
    if (selectedRef.current) {
      const adj = three.current.adjacency.get(selectedRef.current) || new Set();
      return new Set([selectedRef.current, ...adj].filter((id) => N.isVisible(id)));
    }
    return null;
  }
  function applyResting() {
    const { N, E } = three.current;
    const set = restingSet();
    if (set) { N.emphasize(set); E.highlight(set); } else { N.reset(); E.reset(); }
  }
  function applyHover(id) {
    const { N, E, adjacency } = three.current;
    if (id) {
      const set = new Set([id, ...(adjacency.get(id) || [])].filter((x) => N.isVisible(x)));
      N.emphasize(set); E.highlight(set);
    } else applyResting();
  }

  function revealChildren(id) {
    const { N, E, adjacency } = three.current;
    let changed = false;
    for (const nb of adjacency.get(id) || []) if (!N.isVisible(nb)) { N.setVisible(nb, true); changed = true; }
    if (changed) E.updateVisibility(N.isVisible);
  }

  // ---- filter changes: reveal matching hidden nodes (additive) + emphasize -
  useEffect(() => {
    filtersRef.current = filters;
    if (!three.current) return;
    const { N, E } = three.current;
    let changed = false;
    for (const n of NODES) {
      if (!N.isVisible(n.id) && [...filters].some((k) => FILTER_PREDICATES[k](n))) { N.setVisible(n.id, true); changed = true; }
    }
    if (changed) E.updateVisibility(N.isVisible);
    applyResting();
  }, [filters]);

  // ---- selection framing (side panel "connected node" clicks) -------------
  function selectNode(id) {
    selectedRef.current = id;
    setSelectedId(id);
    if (three.current) { revealChildren(id); three.current.I.focusNode(id); applyResting(); }
  }
  function closePanel() {
    selectedRef.current = null;
    setSelectedId(null);
    if (three.current) { three.current.I.resetView(); applyResting(); }
  }

  // ---- mount three.js -----------------------------------------------------
  useEffect(() => {
    const container = mountRef.current;
    const S = createScene(container);
    const N = createNodes(S.scene, NODES, EDGES);
    const E = createEdges(S.scene, NODES, EDGES, N.positions);
    E.updateVisibility(N.isVisible);
    const adjacency = buildAdjacency(EDGES);

    const I = createInteraction({
      camera: S.camera, controls: S.controls, domElement: S.renderer.domElement,
      hits: N.hits, positions: N.positions,
      onHover: (id) => { setHoveredId(id); applyHover(id); },
      onSelect: (id) => { selectedRef.current = id; setSelectedId(id); revealChildren(id); applyResting(); },
    });
    three.current = { S, N, E, I, adjacency };

    // Deep-link / test hook: /architecture#node=quinn opens that node; and
    // window.__archSelect(id) selects programmatically.
    const hashId = typeof window !== 'undefined' && window.location.hash.startsWith('#node=')
      ? decodeURIComponent(window.location.hash.slice(6)) : null;
    if (hashId && NODE_BY_ID.has(hashId)) requestAnimationFrame(() => selectNode(hashId));
    if (typeof window !== 'undefined') window.__archSelect = (id) => selectNode(id);

    let raf, last = performance.now();
    const loop = (now) => {
      const dt = now - last; last = now;
      I.update(dt);
      S.render();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const ro = new ResizeObserver(() => S.resize());
    ro.observe(container);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (typeof window !== 'undefined') delete window.__archSelect;
      I.dispose(); E.dispose(); N.dispose(); S.dispose();
      three.current = null;
    };
  }, []);

  const selectedNode = selectedId ? NODE_BY_ID.get(selectedId) : null;
  const connectedNodes = selectedId
    ? [...(three.current?.adjacency.get(selectedId) || [])].map((id) => NODE_BY_ID.get(id)).filter(Boolean)
    : [];

  return (
    <div className="arch-map-root">
      <div ref={mountRef} className="arch-map-canvas" />
      <FilterBar
        active={filters}
        onToggle={(key) => setFilters((prev) => {
          const next = new Set(prev);
          next.has(key) ? next.delete(key) : next.add(key);
          return next;
        })}
      />
      {selectedNode && (
        <SidePanel node={selectedNode} connected={connectedNodes} onSelect={selectNode} onClose={closePanel} />
      )}
      {hoveredId && !selectedId && (
        <div className="arch-map-hovertip">{NODE_BY_ID.get(hoveredId)?.label}</div>
      )}
    </div>
  );
}
