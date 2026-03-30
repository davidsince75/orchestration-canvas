/**
 * Compact brief editor shown in Run mode (left panel).
 * Editable when idle; read-only while a run is in progress.
 */
export function RunBriefPanel({ brief, setBrief, onRun, onStop, isRunning, runState }) {
  const mode       = runState?.mode;
  const isIdle     = !isRunning && !mode;
  const isDone     = mode === 'done';
  const isError    = mode === 'error';
  const isCancelled = mode === 'cancelled';
  const canEdit    = !isRunning;

  const statusLabel = isRunning   ? 'Running…'
    : isDone      ? 'Completed'
    : isError     ? 'Completed with errors'
    : isCancelled ? 'Cancelled'
    : null;

  const statusColour = isDone      ? '#4ade80'
    : isError     ? '#ff6b6b'
    : isCancelled ? '#facc15'
    : '#a78bfa';

  return (
    <div className="left-panel run-brief-panel">
      <div className="left-tabs">
        <span className="left-tab active">Prompt</span>
        {statusLabel && (
          <span className="run-brief-status" style={{ color: statusColour }}>
            {statusLabel}
          </span>
        )}
      </div>

      <div className="brief-tab-content">
        <span className="panel-heading">Pipeline Input</span>
        <textarea
          style={{
            flex: 1,
            background:  canEdit ? '#20202e' : '#1a1a28',
            border:      `1px solid ${canEdit ? '#2e2e40' : '#1e1e30'}`,
            color:       canEdit ? '#d8d8d8' : '#888',
            padding:     '10px',
            borderRadius:'6px',
            fontSize:    '12px',
            lineHeight:  '1.55',
            resize:      'none',
            outline:     'none',
            fontFamily:  'inherit',
            cursor:      canEdit ? 'text' : 'default',
          }}
          value={brief}
          onChange={e => canEdit && setBrief(e.target.value)}
          readOnly={!canEdit}
          placeholder="What should this pipeline do?\n\nExample: Research the latest developments in quantum computing and write a structured report with key findings and implications."
        />

        {!brief.trim() && !isRunning && (
          <div className="error-msg" style={{ marginBottom: 6 }}>
            A prompt is required to run the pipeline.
          </div>
        )}

        {isRunning ? (
          <button className="btn-stop" onClick={onStop}>
            ✕ Stop Run
          </button>
        ) : (
          <button
            className="btn-generate"
            onClick={onRun}
            disabled={!brief.trim()}
            style={{ background: !brief.trim() ? '#2a2a3e' : undefined }}
          >
            ▶ Run Pipeline
          </button>
        )}
      </div>
    </div>
  );
}
