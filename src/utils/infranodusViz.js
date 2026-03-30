/**
 * InfraNodus Viz Renderer
 * Implements the viz-playground design system for InfraNodus graph data.
 * Generates self-contained HTML with D3.js constellation visualizations.
 *
 * Design system: https://viz-playground.pages.dev/skill-guide/
 */

// ── Sacred 7-Color Palette ────────────────────────────────────────────────────
const PALETTE = [
  '#6366f1', // 0 indigo   (primary)
  '#10b981', // 1 emerald
  '#f59e0b', // 2 amber
  '#f43f5e', // 3 rose
  '#06b6d4', // 4 cyan
  '#8b5cf6', // 5 violet
  '#ec4899', // 6 pink
];

// ── fromInfraNodus Adapter ────────────────────────────────────────────────────

/**
 * Converts an InfraNodus API response (any common format) to GraphData.
 * Handles both /api/v1/graphAndStatements and graph export formats.
 *
 * @param {string|object} raw  — raw API response (string or parsed JSON)
 * @returns {{ nodes: object[], edges: object[], meta: object } | null}
 */
export function fromInfraNodus(raw) {
  let data;
  try {
    data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }

  // Find nodes array in common response locations
  const rawNodes =
    data?.graph?.nodes ||
    data?.nodes ||
    data?.data?.nodes ||
    null;

  const rawEdges =
    data?.graph?.edges ||
    data?.edges ||
    data?.data?.edges ||
    data?.graph?.links ||
    null;

  if (!rawNodes || !Array.isArray(rawNodes) || rawNodes.length === 0) return null;

  // Compute betweenness and degree percentile thresholds for role classification
  const betweennessVals = rawNodes.map(n => Number(n.betweenness || n.betw || 0));
  const degreeVals      = rawNodes.map(n => Number(n.degree || n.deg  || 0));

  const p85Betweenness = percentile(betweennessVals, 85);
  const p90Degree      = percentile(degreeVals, 90);
  const maxValue       = Math.max(1, ...rawNodes.map(n => Number(n.frequency || n.freq || n.value || 1)));

  // Normalize edge weights to 0.04-0.15 opacity band
  const rawWeights  = (rawEdges || []).map(e => Number(e.weight || e.w || 1));
  const maxWeight   = Math.max(1, ...rawWeights);

  const nodes = rawNodes.map(n => {
    const betweenness = Number(n.betweenness || n.betw || 0);
    const degree      = Number(n.degree || n.deg  || 0);
    const value       = Number(n.frequency || n.freq || n.value || n.weight || 1);
    const cluster     = Number(n.modularity_class ?? n.cluster ?? n.community ?? 0) % PALETTE.length;

    let role = 'normal';
    if (betweenness >= p85Betweenness && degree >= p90Degree) role = 'hub';
    else if (betweenness >= p85Betweenness && degree < p90Degree) role = 'bridge'; // gap candidate
    else if (degree >= p90Degree) role = 'hub';

    return {
      id:          String(n.id || n.label || n.name),
      label:       String(n.label || n.id || n.name || ''),
      cluster,
      value:       (value / maxValue) * 20 + 3, // scale to 3-23 range
      betweenness,
      degree,
      role,
    };
  });

  const edges = (rawEdges || []).map((e, i) => {
    const weight = Number(e.weight || e.w || 1);
    return {
      source: String(e.source || e.from || e.src || ''),
      target: String(e.target || e.to  || e.dst || ''),
      weight: 0.04 + (weight / maxWeight) * 0.11, // normalize to 0.04-0.15 band
      type:   e.type || 'solid',
      id:     i,
    };
  }).filter(e => e.source && e.target);

  const gapNodes   = nodes.filter(n => n.role === 'bridge');
  const hubNodes   = nodes.filter(n => n.role === 'hub');
  const topConcepts = [...hubNodes].sort((a, b) => b.betweenness - a.betweenness).slice(0, 8);

  return {
    nodes,
    edges,
    meta: {
      nodeCount:    nodes.length,
      edgeCount:    edges.length,
      gapCount:     gapNodes.length,
      hubCount:     hubNodes.length,
      topConcepts:  topConcepts.map(n => n.label),
      gaps:         gapNodes.map(n => n.label),
      title:        data?.title || data?.context || 'Knowledge Graph',
    },
  };
}

/** Returns true if the string looks like InfraNodus graph data. */
export function canVisualize(outputStr) {
  if (!outputStr || typeof outputStr !== 'string') return false;
  if (!outputStr.trim().startsWith('{') && !outputStr.trim().startsWith('[')) return false;
  try {
    const d = JSON.parse(outputStr);
    const hasNodes =
      d?.graph?.nodes?.length > 0 ||
      d?.nodes?.length > 0 ||
      d?.data?.nodes?.length > 0;
    return hasNodes;
  } catch {
    return false;
  }
}

// ── HTML Generator ────────────────────────────────────────────────────────────

/**
 * Generate a fully self-contained D3.js constellation visualization HTML file.
 *
 * @param {{ nodes, edges, meta }} graphData  — output of fromInfraNodus()
 * @param {object} options
 * @param {string} options.title     — panel title
 * @param {boolean} options.showGaps — highlight gap/bridge nodes (default: true)
 * @param {string} options.theme     — 'dark' | 'editorial'  (default: 'dark')
 * @returns {string} complete HTML document
 */
export function generateVizHTML(graphData, options = {}) {
  const {
    title    = graphData.meta?.title || 'Knowledge Graph',
    showGaps = true,
    theme    = 'dark',
  } = options;

  const isDark     = theme !== 'editorial';
  const bg         = isDark ? '#0a0a0a' : '#FAF8F5';
  const textColor  = isDark ? '#e8e8e8' : '#1a1a1a';
  const fontFamily = isDark
    ? "'Outfit', 'JetBrains Mono', system-ui, sans-serif"
    : "'Playfair Display', 'Source Sans 3', Georgia, serif";

  // Safe-serialize graph data for embedding
  const nodesJson = JSON.stringify(graphData.nodes);
  const edgesJson = JSON.stringify(graphData.edges);
  const metaJson  = JSON.stringify(graphData.meta);
  const palette   = JSON.stringify(PALETTE);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escHtml(title)}</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"></script>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: ${bg};
    color: ${textColor};
    font-family: ${fontFamily};
    overflow: hidden;
    width: 100vw; height: 100vh;
  }
  #canvas { width: 100%; height: 100%; }
  #overlay {
    position: absolute; top: 14px; left: 14px;
    background: rgba(0,0,0,0.55);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    padding: 12px 16px;
    max-width: 280px;
    pointer-events: none;
  }
  ${isDark ? '' : '#overlay { background: rgba(250,248,245,0.85); border-color: rgba(0,0,0,0.1); }'}
  #overlay h2 {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: ${PALETTE[0]};
    margin-bottom: 8px;
  }
  .stat-row { display: flex; gap: 16px; margin-bottom: 8px; }
  .stat { display: flex; flex-direction: column; gap: 2px; }
  .stat-val { font-size: 18px; font-weight: 700; color: ${textColor}; }
  .stat-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.5; }
  .tag-list { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
  .tag {
    font-size: 9px;
    padding: 2px 7px;
    border-radius: 10px;
    background: rgba(99,102,241,0.15);
    border: 1px solid rgba(99,102,241,0.3);
    color: ${PALETTE[0]};
    white-space: nowrap;
  }
  .gap-tag {
    background: rgba(245,158,11,0.12);
    border-color: rgba(245,158,11,0.3);
    color: ${PALETTE[2]};
  }
  #legend {
    position: absolute; bottom: 14px; right: 14px;
    background: rgba(0,0,0,0.55);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 10px;
    display: flex; flex-direction: column; gap: 5px;
    pointer-events: none;
  }
  .legend-row { display: flex; align-items: center; gap: 7px; opacity: 0.75; }
  .legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .tooltip {
    position: absolute;
    background: rgba(0,0,0,0.85);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 11px;
    color: #e8e8e8;
    pointer-events: none;
    display: none;
  }
</style>
</head>
<body>
<svg id="canvas"></svg>
<div id="overlay">
  <h2>${escHtml(title)}</h2>
  <div id="stats" class="stat-row"></div>
  <div id="top-concepts" class="tag-list"></div>
  ${showGaps ? '<div id="gaps" class="tag-list" style="margin-top:6px"></div>' : ''}
</div>
<div id="legend">
  <div class="legend-row"><div class="legend-dot" style="background:#6366f1;box-shadow:0 0 6px #6366f1"></div>Hub node</div>
  ${showGaps ? '<div class="legend-row"><div class="legend-dot" style="background:#f59e0b;box-shadow:0 0 6px #f59e0b"></div>Gap / bridge</div>' : ''}
  <div class="legend-row"><div class="legend-dot" style="background:rgba(255,255,255,0.3)"></div>Normal node</div>
</div>
<div id="tooltip" class="tooltip"></div>

<script>
// ── Data ─────────────────────────────────────────────────────────────────────
const NODES   = ${nodesJson};
const EDGES   = ${edgesJson};
const META    = ${metaJson};
const PALETTE = ${palette};
const SHOW_GAPS = ${showGaps};

// ── Overlay ───────────────────────────────────────────────────────────────────
const statsEl = document.getElementById('stats');
statsEl.innerHTML =
  stat(META.nodeCount, 'Concepts') +
  stat(META.edgeCount, 'Links') +
  stat(META.gapCount,  'Gaps') +
  stat(META.hubCount,  'Hubs');

function stat(v, l) {
  return '<div class="stat"><span class="stat-val">' + v + '</span><span class="stat-label">' + l + '</span></div>';
}

const topEl = document.getElementById('top-concepts');
if (topEl && META.topConcepts) {
  topEl.innerHTML = META.topConcepts.slice(0,8).map(c =>
    '<span class="tag">' + esc(c) + '</span>'
  ).join('');
}

const gapsEl = document.getElementById('gaps');
if (gapsEl && META.gaps && META.gaps.length) {
  const gapLabel = document.createElement('div');
  gapLabel.style.cssText = 'font-size:9px;text-transform:uppercase;letter-spacing:.5px;opacity:.4;margin-top:4px;';
  gapLabel.textContent = 'Content gaps';
  document.getElementById('overlay').appendChild(gapLabel);
  gapsEl.innerHTML = META.gaps.slice(0,6).map(c =>
    '<span class="tag gap-tag">' + esc(c) + '</span>'
  ).join('');
}

function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ── SVG Setup ─────────────────────────────────────────────────────────────────
const W = window.innerWidth;
const H = window.innerHeight;

const svg = d3.select('#canvas')
  .attr('width', W).attr('height', H);

// ── Three-Tier Glow Filters ───────────────────────────────────────────────────
const defs = svg.append('defs');

function addGlowFilter(id, devs, opacities) {
  const f = defs.append('filter')
    .attr('id', id)
    .attr('x', '-80%').attr('y', '-80%')
    .attr('width', '260%').attr('height', '260%');
  const results = devs.map((dev, i) => {
    const res = 'blur' + i;
    f.append('feGaussianBlur').attr('in','SourceGraphic').attr('stdDeviation', dev).attr('result', res);
    const cres = 'c' + res;
    f.append('feColorMatrix').attr('in', res)
      .attr('type','matrix')
      .attr('values', '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ' + opacities[i] + ' 0')
      .attr('result', cres);
    return cres;
  });
  const merge = f.append('feMerge');
  results.forEach(r => merge.append('feMergeNode').attr('in', r));
  merge.append('feMergeNode').attr('in', 'SourceGraphic');
}

addGlowFilter('glow-hub',    [14, 6, 2], [0.25, 0.55, 0.85]);
addGlowFilter('glow-bridge', [10, 4, 1.5], [0.20, 0.45, 0.75]);
addGlowFilter('glow-normal', [4,  2, 1], [0.10, 0.25, 0.60]);

// ── Build node/edge maps ───────────────────────────────────────────────────────
const nodeById = Object.fromEntries(NODES.map(n => [n.id, n]));

const links = EDGES.map(e => ({
  source: nodeById[e.source] || e.source,
  target: nodeById[e.target] || e.target,
  weight: e.weight,
  type:   e.type,
}));

// ── Force Simulation ──────────────────────────────────────────────────────────
const sim = d3.forceSimulation(NODES)
  .force('link', d3.forceLink(links)
    .id(d => d.id)
    .distance(d => 60 + (1 - d.weight) * 60)
    .strength(0.4))
  .force('charge', d3.forceManyBody().strength(d => -80 - d.value * 4))
  .force('center', d3.forceCenter(W / 2, H / 2).strength(0.05))
  .force('collision', d3.forceCollide(d => Math.sqrt(d.value) * 2.2 + 8))
  .alphaDecay(0.015);

// Cluster gravity — pull same-cluster nodes together
sim.force('cluster', alpha => {
  const centers = {};
  NODES.forEach(n => {
    if (!centers[n.cluster]) centers[n.cluster] = { x: 0, y: 0, count: 0 };
    centers[n.cluster].x += n.x || 0;
    centers[n.cluster].y += n.y || 0;
    centers[n.cluster].count++;
  });
  Object.values(centers).forEach(c => {
    c.x /= c.count; c.y /= c.count;
  });
  NODES.forEach(n => {
    const c = centers[n.cluster];
    if (c) {
      n.vx += (c.x - (n.x || 0)) * alpha * 0.12;
      n.vy += (c.y - (n.y || 0)) * alpha * 0.12;
    }
  });
});

// ── Zoom & Pan ────────────────────────────────────────────────────────────────
const g = svg.append('g');
svg.call(d3.zoom().scaleExtent([0.2, 4]).on('zoom', e => g.attr('transform', e.transform)));

// ── Edges ─────────────────────────────────────────────────────────────────────
const linkSel = g.append('g').attr('class', 'links')
  .selectAll('line')
  .data(links)
  .join('line')
  .attr('stroke', '#ffffff')
  .attr('stroke-opacity', d => d.weight)
  .attr('stroke-width', 0.6)
  .attr('stroke-dasharray', d => d.type === 'dashed' ? '4 3' : null);

// ── Nodes ─────────────────────────────────────────────────────────────────────
const tooltip = document.getElementById('tooltip');

const nodeSel = g.append('g').attr('class', 'nodes')
  .selectAll('circle')
  .data(NODES)
  .join('circle')
  .attr('r', d => Math.sqrt(d.value) * 2.2)
  .attr('fill', d => PALETTE[d.cluster % PALETTE.length])
  .attr('fill-opacity', 0.85)
  .attr('stroke', d => {
    if (d.role === 'hub')    return '#ffffff';
    if (d.role === 'bridge' && SHOW_GAPS) return '#f59e0b';
    return PALETTE[d.cluster % PALETTE.length];
  })
  .attr('stroke-width', d => d.role === 'hub' ? 1.5 : d.role === 'bridge' ? 1.2 : 0.4)
  .attr('filter', d => {
    if (d.role === 'hub')    return 'url(#glow-hub)';
    if (d.role === 'bridge' && SHOW_GAPS) return 'url(#glow-bridge)';
    return 'url(#glow-normal)';
  })
  .style('cursor', 'pointer')
  .on('mouseover', (e, d) => {
    tooltip.style.display = 'block';
    tooltip.innerHTML =
      '<strong>' + esc(d.label) + '</strong>' +
      '<br>Type: ' + d.role +
      '<br>Betweenness: ' + d.betweenness.toFixed(3) +
      '<br>Degree: ' + d.degree +
      '<br>Cluster: ' + d.cluster;
  })
  .on('mousemove', e => {
    tooltip.style.left = (e.clientX + 14) + 'px';
    tooltip.style.top  = (e.clientY - 10) + 'px';
  })
  .on('mouseout', () => { tooltip.style.display = 'none'; })
  .call(d3.drag()
    .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
    .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y; })
    .on('end',   (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));

// ── Hub Labels ────────────────────────────────────────────────────────────────
const labelSel = g.append('g').attr('class', 'labels')
  .selectAll('text')
  .data(NODES.filter(n => n.role === 'hub' || n.role === 'bridge'))
  .join('text')
  .attr('dy', d => -Math.sqrt(d.value) * 2.2 - 5)
  .attr('text-anchor', 'middle')
  .attr('fill', d => d.role === 'bridge' && SHOW_GAPS ? '#f59e0b' : '#e8e8e8')
  .attr('font-size', d => d.role === 'hub' ? 11 : 9)
  .attr('font-weight', d => d.role === 'hub' ? 700 : 500)
  .attr('font-family', "Outfit, system-ui, sans-serif")
  .attr('paint-order', 'stroke')
  .attr('stroke', '${bg}')
  .attr('stroke-width', 3)
  .attr('stroke-linejoin', 'round')
  .text(d => d.label);

// ── Tick ──────────────────────────────────────────────────────────────────────
sim.on('tick', () => {
  linkSel
    .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
    .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
  nodeSel
    .attr('cx', d => d.x).attr('cy', d => d.y);
  labelSel
    .attr('x', d => d.x).attr('y', d => d.y);
});

// ── Resize ────────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  const W2 = window.innerWidth, H2 = window.innerHeight;
  svg.attr('width', W2).attr('height', H2);
  sim.force('center', d3.forceCenter(W2/2, H2/2).strength(0.05)).alpha(0.3).restart();
});
</script>
</body>
</html>`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * sorted.length);
  return sorted[Math.min(idx, sorted.length - 1)];
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
