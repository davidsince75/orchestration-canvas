import { getEdgePoints } from '../utils/geometry.js';
import { NODE_W, NODE_H } from '../data/nodeStyles.js';

export function EdgeLayer({ nodes, edges, selectedEdgeId, draggingEdge }) {
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
  return (
    <svg className="canvas-svg" style={{ pointerEvents: 'none' }}>
      <defs>
        <marker id="arrowhead" markerWidth="9" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 9 3, 0 6" fill="rgba(255,255,255,0.65)" />
        </marker>
        <marker id="arrowhead-sel" markerWidth="9" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 9 3, 0 6" fill="#9b8fe0" />
        </marker>
        <marker id="arrowhead-ghost" markerWidth="9" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 9 3, 0 6" fill="#6c5ce7" />
        </marker>
      </defs>
      {edges.map(edge => {
        const from = nodeMap[edge.from], to = nodeMap[edge.to];
        if (!from || !to) return null;
        const { x1, y1, x2, y2 } = getEdgePoints(from, to);
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        const sel = selectedEdgeId === edge.id;
        return (
          <g key={edge.id}>
            <line x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={sel ? '#9b8fe0' : '#383848'}
              strokeWidth={sel ? 2.5 : 1.5}
              markerEnd={sel ? 'url(#arrowhead-sel)' : 'url(#arrowhead)'}
            />
            {sel && <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#6c5ce7" strokeWidth="6" strokeOpacity="0.15" />}
            {edge.label && (
              <text x={mx} y={my - 6} fill={sel ? '#6c5ce7' : '#3e3e56'} fontSize="10" textAnchor="middle" fontFamily="-apple-system, sans-serif">
                {edge.label}
              </text>
            )}
          </g>
        );
      })}
      {draggingEdge && (() => {
        const fromNode = nodeMap[draggingEdge.fromId];
        if (!fromNode) return null;
        const x1 = fromNode.position.x + NODE_W / 2;
        const y1 = fromNode.position.y + NODE_H;
        return (
          <line x1={x1} y1={y1} x2={draggingEdge.x} y2={draggingEdge.y}
            stroke="#6c5ce7" strokeWidth="1.5" strokeDasharray="5 3"
            markerEnd="url(#arrowhead-ghost)" />
        );
      })()}
    </svg>
  );
}
