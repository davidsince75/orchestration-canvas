import { useState, useEffect, useRef, useCallback } from 'react';
import { canVisualize } from '../utils/infranodusViz.js';
import { VizPanel } from './VizPanel.jsx';
import { OutputRenderer } from './OutputRenderer.jsx';

const STATUS_BADGE = {
  pending:   { label: '○ Pending',   color: '#555577' },
  running:   { label: '⟳ Running',   color: '#a78bfa' },
  done:      { label: '✓ Done',      color: '#4ade80' },
  error:     { label: '✕ Error',     color: '#ff6b6b' },
  cancelled: { label: '⊘ Skipped',   color: '#facc15' },
};

function NodeOutput({ node, state }) {
  const [open, setOpen]       = useState(false);
  const [vizOpen, setVizOpen] = useState(false);
  const badge = STATUS_BADGE[state?.status || 'pending'];

  // Auto-expand when node finishes (always for output nodes; toggle for others)
  useEffect(() => {
    if (state?.status === 'done' || state?.status === 'error') setOpen(true);
  }, [state?.status]);

  // Auto-expand on first streaming token so the user sees output immediately
  useEffect(() => {
    if (state?.partialOutput && !open) setOpen(true);
  }, [state?.partialOutput, open]);

  // Output nodes are always expanded — hide the chevron toggle
  const isOutputNode = node.type === 'output';

  // Auto-open viz for infranodus nodes with graph output
  useEffect(() => {
    if (
      node.type === 'infranodus' &&
      state?.status === 'done' &&
      canVisualize(state?.output)
    ) {
      setVizOpen(true);
    }
  }, [node.type, state?.status, state?.output]);

  // Display: streaming partial output takes priority while running,
  // falling back to the final output once done.
  const displayText = state?.partialOutput ?? state?.output ?? null;
  const copyText    = state?.output || state?.error || state?.partialOutput || '';
  const showViz     = node.type === 'infranodus' && canVisualize(state?.output);
  const isStreaming = state?.status === 'running' && !!state?.partialOutput;

  return (
    <div
      className="run-output-node"
      style={{
        border:       `1px solid ${state?.status === 'running' ? '#a78bfa' : '#2a2a3e'}`,
        borderRadius: 8,
        marginBottom: 8,
        overflow:     'hidden',
        transition:   'border-color 0.2s',
      }}
    >
      {/* Header row */}
      <div
        style={{
          display:    'flex',
          alignItems: 'center',
          gap:        8,
          padding:    '8px 12px',
          cursor:     (!isOutputNode && copyText) ? 'pointer' : 'default',
          background: '#1a1a28',
          userSelect: 'none',
        }}
        onClick={() => !isOutputNode && copyText && setOpen(o => !o)}
      >
        <span style={{ flex: 1, fontWeight: 600, fontSize: 13, color: '#e0e0f0' }}>
          {node.name}
        </span>
        <span style={{ fontSize: 11, color: badge.color, fontWeight: 600 }}>
          {badge.label}
        </span>
        {showViz && (
          <button
            className="viz-inline-btn"
            onClick={e => { e.stopPropagation(); setVizOpen(v => !v); }}
            title={vizOpen ? 'Hide visualisation' : 'Show constellation visualisation'}
          >
            {vizOpen ? '🌌 Hide Viz' : '🌌 Visualize'}
          </button>
        )}
        {!isOutputNode && copyText && (
          <span style={{ fontSize: 11, color: '#555', marginLeft: 4 }}>
            {open ? '▲' : '▼'}
          </span>
        )}
      </div>

      {/* Viz panel — shown above raw output */}
      {showViz && vizOpen && (
        <VizPanel output={state.output} />
      )}

      {/* ── Output Node: full OutputRenderer (only once complete) ── */}
      {node.type === 'output' && (state?.status === 'done' || state?.status === 'error') && (
        <div style={{ borderTop: '1px solid #1e1e30' }}>
          <OutputRenderer
            node={node}
            output={state?.output}
            error={state?.error}
          />
        </div>
      )}

      {/* Output node streaming placeholder while running */}
      {node.type === 'output' && state?.status === 'running' && (
        <div style={{ padding: '12px 16px', background: '#13131f', borderTop: '1px solid #1e1e30' }}>
          <pre style={{ color: '#a78bfa', fontSize: 12, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.6', opacity: 0.8 }}>
            {state?.partialOutput || ''}
            {isStreaming && <StreamCursor />}
          </pre>
        </div>
      )}

      {/* ── All other nodes: viz + raw pre ── */}
      {node.type !== 'output' && open && (displayText || state?.error) && (
        <div style={{ padding: '10px 12px', background: '#13131f', position: 'relative' }}>
          {state?.status === 'error' ? (
            <pre style={{ color: '#ff6b6b', fontSize: 11, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {state.error}
            </pre>
          ) : (
            <pre style={{ color: '#c8c8d8', fontSize: 12, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.6' }}>
              {displayText}
              {isStreaming && <StreamCursor />}
            </pre>
          )}
          <button
            style={{
              position:     'absolute',
              top:          8,
              right:        8,
              background:   '#2a2a3e',
              border:       '1px solid #3a3a50',
              color:        '#aaa',
              borderRadius: 4,
              padding:      '2px 8px',
              fontSize:     11,
              cursor:       'pointer',
            }}
            onClick={e => {
              e.stopPropagation();
              navigator.clipboard.writeText(copyText);
            }}
            title="Copy to clipboard"
          >
            Copy
          </button>
        </div>
      )}
    </div>
  );
}

/** Blinking cursor rendered at the end of streaming text. */
function StreamCursor() {
  return (
    <span
      style={{
        display:         'inline-block',
        width:           '2px',
        height:          '1em',
        background:      '#a78bfa',
        marginLeft:      1,
        verticalAlign:   'text-bottom',
        animation:       'stream-cursor-blink 0.8s step-end infinite',
      }}
      aria-hidden="true"
    />
  );
}

export function RunOutputPanel({ graph, runState }) {
  const scrollRef     = useRef(null);
  const lastScrollRef = useRef(0);
  const nodeStates    = runState?.nodeStates || new Map();

  // Throttled scroll: fire at most every 300 ms so high-frequency token
  // events don't cause continuous jank during streaming.
  const scrollToRunning = useCallback(() => {
    const now = Date.now();
    if (now - lastScrollRef.current < 300) return;
    lastScrollRef.current = now;
    const el = scrollRef.current?.querySelector('.run-output-node[data-running="true"]');
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  useEffect(() => {
    scrollToRunning();
  }, [runState?.nodeStates, scrollToRunning]);

  // Concatenate all outputs for "Copy All"
  const copyAll = () => {
    const parts = graph.nodes
      .map(n => {
        const s = nodeStates.get(n.id);
        if (!s?.output) return null;
        return `=== ${n.name} ===\n${s.output}`;
      })
      .filter(Boolean)
      .join('\n\n');
    if (parts) navigator.clipboard.writeText(parts);
  };

  const hasAnyOutput = graph.nodes.some(n => nodeStates.get(n.id)?.output);
  const mode = runState?.mode;

  const summaryColor = mode === 'done'      ? '#4ade80'
    : mode === 'error'     ? '#ff6b6b'
    : mode === 'cancelled' ? '#facc15'
    : '#a78bfa';

  const summaryLabel = mode === 'done'      ? 'Run complete'
    : mode === 'error'     ? 'Completed with errors'
    : mode === 'cancelled' ? 'Run cancelled'
    : 'Running…';

  return (
    <div
      className="architect-panel"
      style={{ minWidth: 320, maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 0 }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px 0', gap: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: 1, color: '#a78bfa', flex: 1 }}>
          OUTPUT
        </span>
        {runState && (
          <span style={{ fontSize: 11, color: summaryColor, fontWeight: 600 }}>
            {summaryLabel}
          </span>
        )}
        {hasAnyOutput && (
          <button
            style={{
              background:  '#2a2a3e',
              border:      '1px solid #3a3a50',
              color:       '#aaa',
              borderRadius:4,
              padding:     '2px 8px',
              fontSize:    11,
              cursor:      'pointer',
              marginLeft:  4,
            }}
            onClick={copyAll}
            title="Copy all outputs"
          >
            Copy All
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 16px' }}
      >
        {graph.nodes.length === 0 ? (
          <p style={{ color: '#555', fontSize: 12, textAlign: 'center', marginTop: 40 }}>
            No nodes in graph.
          </p>
        ) : !runState ? (
          <p style={{ color: '#555', fontSize: 12, textAlign: 'center', marginTop: 40 }}>
            Enter a prompt and click Run Pipeline to start.
          </p>
        ) : (
          graph.nodes.map(node => {
            const state = nodeStates.get(node.id);
            return (
              <div
                key={node.id}
                data-running={state?.status === 'running' ? 'true' : undefined}
              >
                <NodeOutput node={node} state={state} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
