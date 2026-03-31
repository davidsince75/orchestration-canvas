import { SNAP, NODE_W, NODE_H } from '../data/nodeStyles.js';

const CANVAS_W = 2400;
const CANVAS_H = 1600;

/**
 * Returns a new nodes array where the bounding-box centre aligns with the
 * canvas centre (1200, 800), snapped to the grid.
 */
export function centerNodesInCanvas(nodes) {
  if (!nodes || nodes.length === 0) return nodes;
  const minX = Math.min(...nodes.map(n => n.position.x));
  const maxX = Math.max(...nodes.map(n => n.position.x)) + NODE_W;
  const minY = Math.min(...nodes.map(n => n.position.y));
  const maxY = Math.max(...nodes.map(n => n.position.y)) + NODE_H;
  const dx = Math.round((CANVAS_W / 2 - (minX + maxX) / 2) / SNAP) * SNAP;
  const dy = Math.round((CANVAS_H / 2 - (minY + maxY) / 2) / SNAP) * SNAP;
  if (dx === 0 && dy === 0) return nodes;
  return nodes.map(n => ({
    ...n,
    position: { x: n.position.x + dx, y: n.position.y + dy },
  }));
}

export const snapToGrid = (x, y) => ({
  x: Math.round(x / SNAP) * SNAP,
  y: Math.round(y / SNAP) * SNAP,
});

export function isNearLine(px, py, x1, y1, x2, y2, threshold = 7) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1) < threshold;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy)) < threshold;
}

export function findCriticalPath(graph) {
  const { nodes, edges } = graph;
  const start = nodes.find(n => n.type === 'orchestrator') || nodes[0];
  if (!start) return [];
  const visited = new Set();
  const path = [];
  const dfs = (id) => {
    if (visited.has(id)) return;
    visited.add(id);
    path.push(id);
    edges.filter(e => e.from === id).forEach(e => dfs(e.to));
  };
  dfs(start.id);
  return path;
}

export function isInputFocused() {
  const tag = document.activeElement?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function validateGraph(graph) {
  const issues = [];
  const { nodes = [], edges = [] } = graph;
  if (nodes.length === 0) return issues;

  const nodeIds = new Set(nodes.map(n => n.id));

  // Self-loops (error)
  edges.forEach(edge => {
    if (edge.from === edge.to) {
      const node = nodes.find(n => n.id === edge.from);
      issues.push({ severity: 'error', message: `Self-loop on "${node?.name || edge.from}"`, nodeIds: [edge.from] });
    }
  });

  // Cycles (error) — Kahn's algorithm
  {
    const inDegree = Object.fromEntries(nodes.map(n => [n.id, 0]));
    const adj = Object.fromEntries(nodes.map(n => [n.id, []]));
    edges.forEach(e => {
      if (e.from !== e.to && inDegree[e.from] !== undefined && inDegree[e.to] !== undefined) {
        inDegree[e.to] += 1;
        adj[e.from].push(e.to);
      }
    });
    const queue = nodes.filter(n => inDegree[n.id] === 0).map(n => n.id);
    let visited = 0;
    while (queue.length) {
      const id = queue.shift();
      visited++;
      adj[id].forEach(nb => { if (--inDegree[nb] === 0) queue.push(nb); });
    }
    if (visited < nodes.length) {
      issues.push({ severity: 'error', message: 'Graph contains a cycle — remove back-edges before running', nodeIds: [] });
    }
  }

  // Duplicate edges (warning)
  const edgePairs = new Set();
  edges.forEach(edge => {
    const key = `${edge.from}→${edge.to}`;
    if (edgePairs.has(key)) {
      issues.push({ severity: 'warning', message: `Duplicate edge between two nodes`, nodeIds: [edge.from, edge.to] });
    } else {
      edgePairs.add(key);
    }
  });

  // Orphaned nodes (warning)
  nodes.forEach(node => {
    const connected = edges.some(e => e.from === node.id || e.to === node.id);
    if (!connected) {
      issues.push({ severity: 'warning', message: `"${node.name || node.id}" has no connections`, nodeIds: [node.id] });
    }
  });

  // Orchestrator count (warning)
  const orchCount = nodes.filter(n => n.type === 'orchestrator').length;
  if (orchCount === 0) {
    issues.push({ severity: 'warning', message: 'No orchestrator node — add one to anchor the flow', nodeIds: [] });
  }

  // Agents without system prompts (warning)
  nodes.filter(n => n.type === 'agent' || n.type === 'orchestrator').forEach(n => {
    if (!n.systemPrompt || !n.systemPrompt.trim()) {
      issues.push({ severity: 'warning', message: `"${n.name || n.id}" has no system prompt`, nodeIds: [n.id] });
    }
  });

  // Tool nodes with no output schema (warning)
  nodes.filter(n => n.type === 'tool').forEach(n => {
    if (!n.outputSchema || Object.keys(n.outputSchema).length === 0) {
      issues.push({ severity: 'warning', message: `Tool "${n.name || n.id}" has no output schema`, nodeIds: [n.id] });
    }
  });

  // Router nodes with no routes defined (warning)
  nodes.filter(n => n.type === 'router').forEach(n => {
    const routes = n.routes || {};
    if (Object.keys(routes).length === 0) {
      issues.push({ severity: 'warning', message: `Router "${n.name || n.id}" has no routes defined`, nodeIds: [n.id] });
    }
  });

  // Evaluator nodes with no criteria (warning)
  nodes.filter(n => n.type === 'evaluator').forEach(n => {
    if (!n.evaluatorCriteria || !n.evaluatorCriteria.trim()) {
      issues.push({ severity: 'warning', message: `Evaluator "${n.name || n.id}" has no evaluation criteria`, nodeIds: [n.id] });
    }
  });

  // InfraNodus nodes with no API key (warning)
  nodes.filter(n => n.type === 'infranodus').forEach(n => {
    if (!n.infranodusApiKey || !n.infranodusApiKey.trim()) {
      issues.push({ severity: 'warning', message: `InfraNodus node "${n.name || n.id}" has no API key`, nodeIds: [n.id] });
    }
  });

  return issues;
}

export function validateImportedGraph(data) {
  if (!data || typeof data !== 'object') throw new Error('Invalid JSON structure');
  if (!Array.isArray(data.nodes)) throw new Error('Missing "nodes" array');
  if (!Array.isArray(data.edges)) throw new Error('Missing "edges" array');
  const nodeIds = new Set(data.nodes.map(n => n.id));
  data.nodes.forEach((n, i) => {
    if (!n.id) throw new Error(`Node at index ${i} is missing "id"`);
    if (!n.position || typeof n.position.x !== 'number' || typeof n.position.y !== 'number') {
      throw new Error(`Node "${n.id}" has invalid position`);
    }
  });
  data.edges.forEach((e, i) => {
    if (!nodeIds.has(e.from)) throw new Error(`Edge ${i} references unknown source node "${e.from}"`);
    if (!nodeIds.has(e.to))   throw new Error(`Edge ${i} references unknown target node "${e.to}"`);
  });
  return { nodes: data.nodes, edges: data.edges };
}
