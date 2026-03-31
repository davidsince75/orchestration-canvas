import { getEdgePoints } from '../utils/geometry.js';
import { NODE_W, NODE_H } from '../data/nodeStyles.js';

// ── Particle configuration per edge animation state ───────────────────────────
//
// dur    – seconds for one particle to travel the full edge length
// count  – number of particles spread evenly along the edge at once
// r      – particle radius in canvas units
// color  – fill colour
// opacity – base opacity
// glow   – whether to apply the blur glow filter

const PARTICLE_CFG = {
  idle:    { dur: 5.0, count: 2, r: 2,   color: '#4a4a72', opacity: 0.50, glow: false },
  active:  { dur: 1.1, count: 3, r: 2.5, color: '#60a5fa', opacity: 1.00, glow: true  },
  done:    { dur: 2.8, count: 2, r: 2,   color: '#4ade80', opacity: 0.70, glow: false },
  error:   { dur: 2.0, count: 2, r: 2,   color: '#ff6b6b', opacity: 0.70, glow: false },
  skipped: { dur: 6.0, count: 1, r: 1.5, color: '#facc15', opacity: 0.30, glow: false },
};

// Derive the animation state for one edge from the current run node states.
function edgeAnimState(edge, nodeRunStates) {
  if (!nodeRunStates) return 'idle';
  const fromStatus = nodeRunStates.get(edge.from)?.status;
  const toStatus   = nodeRunStates.get(edge.to)?.status;

  if (fromStatus === 'running') return 'active';
  // Edge between two completed nodes
  if (fromStatus === 'done' && toStatus === 'done') return 'done';
  // From-node done but to-node not yet — signal is "in flight"
  if (fromStatus === 'done') return 'active';
  if (fromStatus === 'error') return 'error';
  if (fromStatus === 'cancelled') return 'skipped';
  return 'idle';
}

// Render `count` particles evenly spread along a named SVG path, each
// animated with <animateMotion>. Negative begin values offset the start
// position so particles are distributed across the path immediately.
function EdgeParticles({ pathId, cfg }) {
  const { dur, count, r, color, opacity, glow } = cfg;
  return Array.from({ length: count }, (_, i) => {
    const begin = i === 0 ? '0s' : `-${((i * dur) / count).toFixed(3)}s`;
    return (
      <circle
        key={i}
        r={r}
        fill={color}
        opacity={opacity}
        filter={glow ? 'url(#particle-glow)' : undefined}
      >
        <animateMotion
          dur={`${dur}s`}
          begin={begin}
          repeatCount="indefinite"
        >
          <mpath href={`#${pathId}`} />
        </animateMotion>
      </circle>
    );
  });
}

export function EdgeLayer({ nodes, edges, selectedEdgeId, draggingEdge, nodeRunStates }) {
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

  return (
    <svg className="canvas-svg" style={{ pointerEvents: 'none' }}>
      <defs>
        {/* ── Arrowhead markers ── */}
        <marker id="arrowhead" markerWidth="9" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 9 3, 0 6" fill="rgba(255,255,255,0.65)" />
        </marker>
        <marker id="arrowhead-sel" markerWidth="9" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 9 3, 0 6" fill="#9b8fe0" />
        </marker>
        <marker id="arrowhead-ghost" markerWidth="9" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 9 3, 0 6" fill="#6c5ce7" />
        </marker>

        {/* ── Glow filter for active particles ── */}
        <filter id="particle-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {edges.map(edge => {
        const from = nodeMap[edge.from];
        const to   = nodeMap[edge.to];
        if (!from || !to) return null;

        const { x1, y1, x2, y2 } = getEdgePoints(from, to);
        const mx  = (x1 + x2) / 2;
        const my  = (y1 + y2) / 2;
        const sel = selectedEdgeId === edge.id;

        // Each path gets a stable DOM id so <mpath> can reference it.
        const pathId  = `ep-${edge.id}`;
        const animState = edgeAnimState(edge, nodeRunStates);
        const cfg       = PARTICLE_CFG[animState];

        return (
          <g key={edge.id}>
            {/* Selection glow underlay */}
            {sel && (
              <path
                d={`M ${x1},${y1} L ${x2},${y2}`}
                stroke="#6c5ce7"
                strokeWidth="6"
                strokeOpacity="0.18"
                fill="none"
              />
            )}

            {/* Main edge path — also the mpath target for particles */}
            <path
              id={pathId}
              d={`M ${x1},${y1} L ${x2},${y2}`}
              stroke={sel ? '#9b8fe0' : '#383848'}
              strokeWidth={sel ? 2.5 : 1.5}
              fill="none"
              markerEnd={sel ? 'url(#arrowhead-sel)' : 'url(#arrowhead)'}
            />

            {/* Edge label */}
            {edge.label && (
              <text
                x={mx} y={my - 6}
                fill={sel ? '#6c5ce7' : '#3e3e56'}
                fontSize="10"
                textAnchor="middle"
                fontFamily="-apple-system, sans-serif"
              >
                {edge.label}
              </text>
            )}

            {/* Flowing particles */}
            <EdgeParticles pathId={pathId} cfg={cfg} />
          </g>
        );
      })}

      {/* Ghost edge while dragging a new connection */}
      {draggingEdge && (() => {
        const fromNode = nodeMap[draggingEdge.fromId];
        if (!fromNode) return null;
        const x1 = fromNode.position.x + NODE_W / 2;
        const y1 = fromNode.position.y + NODE_H;
        return (
          <path
            d={`M ${x1},${y1} L ${draggingEdge.x},${draggingEdge.y}`}
            stroke="#6c5ce7"
            strokeWidth="1.5"
            strokeDasharray="5 3"
            fill="none"
            markerEnd="url(#arrowhead-ghost)"
          />
        );
      })()}
    </svg>
  );
}
