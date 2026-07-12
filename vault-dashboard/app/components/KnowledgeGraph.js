'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

export default function KnowledgeGraph() {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [graphData, setGraphData] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/vault/graph')
      .then(res => res.json())
      .then(data => {
        if (data.success) setGraphData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!graphData || !svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 600;

    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    // Zoom layer
    const g = svg.append('g');
    svg.call(
      d3.zoom()
        .scaleExtent([0.2, 4])
        .on('zoom', (event) => g.attr('transform', event.transform))
    );

    // Prep data (deep copy so D3 mutation doesn't break React)
    const nodes = graphData.nodes.map(d => ({ ...d }));
    const links = graphData.links.map(d => ({ ...d }));

    // Color scale based on connectivity
    const maxLinks = Math.max(...nodes.map(n => n.totalLinks), 1);
    const colorScale = d3.scaleLinear()
      .domain([0, maxLinks * 0.3, maxLinks])
      .range(['hsl(0, 70%, 55%)', 'hsl(210, 80%, 60%)', 'hsl(270, 70%, 65%)']);

    // Size scale
    const sizeScale = d3.scaleSqrt()
      .domain([0, maxLinks])
      .range([3, 18]);

    // Force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(80).strength(0.4))
      .force('charge', d3.forceManyBody().strength(-120))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => sizeScale(d.totalLinks) + 4));

    // Draw links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'hsla(240, 10%, 35%, 0.25)')
      .attr('stroke-width', 0.5);

    // Draw nodes
    const node = g.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', d => sizeScale(d.totalLinks))
      .attr('fill', d => d.isOrphan ? 'hsl(0, 80%, 55%)' : colorScale(d.totalLinks))
      .attr('stroke', 'hsla(0, 0%, 100%, 0.08)')
      .attr('stroke-width', 0.5)
      .style('cursor', 'pointer')
      .call(drag(simulation));

    // Glow effect on nodes
    node
      .append('title')
      .text(d => d.id);

    // Labels for high-connectivity nodes
    const label = g.append('g')
      .selectAll('text')
      .data(nodes.filter(n => n.totalLinks >= 2))
      .join('text')
      .text(d => d.id.replace(/_/g, ' '))
      .attr('font-size', d => Math.max(7, Math.min(11, 6 + d.totalLinks * 0.5)))
      .attr('fill', 'hsla(0, 0%, 80%, 0.85)')
      .attr('font-family', "'Inter', sans-serif")
      .attr('font-weight', 400)
      .attr('text-anchor', 'middle')
      .attr('dy', d => -sizeScale(d.totalLinks) - 5)
      .style('pointer-events', 'none')
      .style('user-select', 'none');

    // Hover interactions
    node
      .on('mouseover', function(event, d) {
        // Highlight connected links
        link
          .attr('stroke', l =>
            l.source.id === d.id || l.target.id === d.id
              ? 'hsla(210, 100%, 60%, 0.7)' : 'hsla(240, 10%, 35%, 0.1)'
          )
          .attr('stroke-width', l =>
            l.source.id === d.id || l.target.id === d.id ? 1.5 : 0.3
          );

        // Dim non-connected nodes
        const connected = new Set();
        connected.add(d.id);
        links.forEach(l => {
          const sid = typeof l.source === 'object' ? l.source.id : l.source;
          const tid = typeof l.target === 'object' ? l.target.id : l.target;
          if (sid === d.id) connected.add(tid);
          if (tid === d.id) connected.add(sid);
        });

        node.attr('opacity', n => connected.has(n.id) ? 1 : 0.15);
        label.attr('opacity', n => connected.has(n.id) ? 1 : 0.1);

        d3.select(this)
          .attr('stroke', 'hsla(210, 100%, 70%, 0.8)')
          .attr('stroke-width', 2);

        setHoveredNode(d);
      })
      .on('mouseout', function() {
        link
          .attr('stroke', 'hsla(240, 10%, 35%, 0.25)')
          .attr('stroke-width', 0.5);
        node.attr('opacity', 1);
        label.attr('opacity', 1);
        d3.select(this)
          .attr('stroke', 'hsla(0, 0%, 100%, 0.08)')
          .attr('stroke-width', 0.5);
        setHoveredNode(null);
      });

    // Tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);
      label
        .attr('x', d => d.x)
        .attr('y', d => d.y);
    });

    function drag(simulation) {
      return d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        });
    }

    return () => simulation.stop();
  }, [graphData]);

  if (loading) {
    return (
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-label">Knowledge Graph</div>
        <div className="loading-shimmer" style={{ height: '400px' }} />
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '2rem' }}>
      <div className="section-title"><span className="icon">🕸️</span> Knowledge Graph</div>
      <div className="card" style={{ padding: '0', overflow: 'hidden', position: 'relative' }} ref={containerRef}>
        <svg
          ref={svgRef}
          style={{
            width: '100%',
            height: '600px',
            background: 'hsl(240, 10%, 3%)',
            display: 'block',
          }}
        />
        {/* Tooltip */}
        {hoveredNode && (
          <div style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'hsla(240, 10%, 8%, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid hsla(240, 10%, 25%, 0.4)',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            minWidth: '220px',
            zIndex: 10,
          }}>
            <div style={{ fontSize: '0.7rem', color: 'hsla(0,0%,60%,1)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              {hoveredNode.isOrphan ? '⚠️ Orphan Node' : '📄 Vault Node'}
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginTop: '0.35rem' }}>
              {hoveredNode.id.replace(/_/g, ' ')}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'hsla(0,0%,65%,1)', marginTop: '0.5rem', fontFamily: "'SF Mono', monospace" }}>
              {hoveredNode.path}
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'hsl(210,100%,60%)' }}>{hoveredNode.outgoing}</div>
                <div style={{ fontSize: '0.65rem', color: 'hsla(0,0%,55%,1)', textTransform: 'uppercase' }}>Outgoing</div>
              </div>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'hsl(270,70%,65%)' }}>{hoveredNode.incoming}</div>
                <div style={{ fontSize: '0.65rem', color: 'hsla(0,0%,55%,1)', textTransform: 'uppercase' }}>Incoming</div>
              </div>
            </div>
          </div>
        )}
        {/* Stats bar */}
        {graphData && (
          <div style={{
            position: 'absolute',
            bottom: '0.75rem',
            left: '0.75rem',
            display: 'flex',
            gap: '1.25rem',
            fontSize: '0.7rem',
            fontWeight: 500,
            color: 'hsla(0,0%,50%,1)',
            fontFamily: "'SF Mono', monospace",
          }}>
            <span>Nodes: {graphData.stats.totalNodes}</span>
            <span>Edges: {graphData.stats.totalLinks}</span>
            <span>Orphans: {graphData.stats.orphans}</span>
          </div>
        )}
      </div>
    </div>
  );
}
