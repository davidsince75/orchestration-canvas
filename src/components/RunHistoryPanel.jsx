import { useState, useEffect, useCallback } from 'react';
import { loadRuns, loadRunNodes, clearHistory } from '../api/runHistory.js';

const STATUS_BADGE = {
  running:   { label: 'running',   color: '#fdcb6e' },
  done:      { label: 'done',      color: '#2ecc71' },
  error:     { label: 'error',     color: '#ff6b6b' },
  cancelled: { label: 'cancelled', color: '#888' },
};

function StatusBadge({ status }) {
  const b = STATUS_BADGE[status] || { label: status, color: '#aaa' };
  return (
    <span className="run-history-badge" style={{ color: b.color, borderColor: b.color }}>
      {b.label}
    </span>
  );
}

function RunRow({ run, nodeNameMap }) {
  const [expanded, setExpanded] = useState(false);
  const [nodes, setNodes] = useState(null);

  const toggle = useCallback(async () => {
    if (!expanded && nodes === null) {
      const rows = await loadRunNodes(run.id);
      setNodes(rows);
    }
    setExpanded(e => !e);
  }, [expanded, nodes, run.id]);

  const ts = parseInt(run.created_at, 10);
  const label = isNaN(ts)
    ? run.created_at
    : new Date(ts * 1000).toLocaleString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
      });

  return (
    <div className="run-history-row">
      <div className="run-history-row-header" onClick={toggle}>
        <span className="run-history-toggle">{expanded ? '▾' : '▸'}</span>
        <span className="run-history-time">{label}</span>
        <StatusBadge status={run.status} />
      </div>
      {expanded && nodes !== null && (
        <div className="run-history-nodes">
          {run.initial_prompt && (
            <div className="run-history-node" style={{ borderLeft: '2px solid #3a3a50', marginBottom: 6 }}>
              <div className="run-history-node-header">
                <span className="run-history-node-name" style={{ color: '#888', fontStyle: 'italic' }}>Prompt</span>
              </div>
              <pre className="run-history-output" style={{ color: '#aaa' }}>{run.initial_prompt}</pre>
            </div>
          )}
          {nodes.map((n, i) => (
            <div key={i} className="run-history-node">
              <div className="run-history-node-header">
                <span className="run-history-node-name">{nodeNameMap[n.node_id] || n.node_id}</span>
                <StatusBadge status={n.status} />
              </div>
              {n.output && (
                <pre className="run-history-output">{n.output}</pre>
              )}
              {n.error && (
                <pre className="run-history-output run-history-error">{n.error}</pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function RunHistoryPanel({ graph, onClose }) {
  const [runs, setRuns] = useState([]);

  const nodeNameMap = Object.fromEntries(
    (graph.nodes || []).map(n => [n.id, n.name])
  );

  useEffect(() => {
    loadRuns().then(setRuns).catch(() => setRuns([]));
  }, []);

  const handleClear = useCallback(async () => {
    if (!window.confirm('Clear all run history? This cannot be undone.')) return;
    await clearHistory();
    setRuns([]);
  }, []);

  return (
    <div className="arch-panel run-history-panel">
      <div className="arch-header">
        <span className="arch-title">Run History</span>
        <button className="topbar-btn danger" onClick={handleClear}
          disabled={runs.length === 0} title="Clear all history" style={{ fontSize: '11px', padding: '2px 8px' }}>
          Clear
        </button>
        <button className="arch-close" onClick={onClose}>✕</button>
      </div>
      <div className="run-history-list">
        {runs.length === 0 ? (
          <div className="run-history-empty">No runs yet. Switch to Run mode and click ▶ Run.</div>
        ) : (
          runs.map(run => (
            <RunRow key={run.id} run={run} nodeNameMap={nodeNameMap} />
          ))
        )}
      </div>
    </div>
  );
}
