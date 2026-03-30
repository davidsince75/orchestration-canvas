import { NODE_STYLES } from '../data/nodeStyles.js';

const STATUS_OVERLAY = {
  running:   <span className="run-overlay run-overlay-running"   title="Running…">⟳</span>,
  done:      <span className="run-overlay run-overlay-done"      title="Done">✓</span>,
  cancelled: <span className="run-overlay run-overlay-cancelled" title="Cancelled">⊘</span>,
  error:     null, // shown as border color + badge below
};

export function NodeCard({ node, isSelected, isHighlighted, onMouseDown, onPortMouseDown, portsAlways, runStatus }) {
  const s = NODE_STYLES[node.type] || NODE_STYLES.agent;
  const hasRunError = runStatus?.status === 'error';
  const cls = [
    'node-card',
    isSelected    ? 'selected'    : '',
    isHighlighted ? 'highlighted' : '',
    portsAlways   ? 'ports-always': 'ports-hover',
    runStatus?.status ? `run-status-${runStatus.status}` : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cls}
      style={{
        left:        node.position.x,
        top:         node.position.y,
        background:  s.fill,
        borderColor: isSelected ? '#ffffff' : hasRunError ? '#ff6b6b' : s.border,
      }}
      onMouseDown={onMouseDown}
      onClick={e => e.stopPropagation()}
    >
      <div className="node-card-header">
        <span className="node-name">{node.name}</span>
        <span className="node-type-badge" style={{ color: s.badge, background: s.badgeBg }}>{node.type}</span>
      </div>
      <p className="node-role">{node.role}</p>
      <div className="node-port port-in"
        onMouseDown={e => { e.stopPropagation(); e.preventDefault(); }}
        title="Input port" />
      <div className="node-port port-out"
        onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onPortMouseDown(e, node.id); }}
        title="Drag to connect" />
      {runStatus?.status && STATUS_OVERLAY[runStatus.status]}
      {hasRunError && (
        <span className="run-overlay run-overlay-error" title={runStatus.error || 'Error'}>✕</span>
      )}
    </div>
  );
}
