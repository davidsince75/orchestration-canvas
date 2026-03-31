/**
 * Compact brief editor shown in Run mode (left panel).
 * Editable when idle; read-only while a run is in progress.
 */
import { useState } from 'react';
import { callSuggestRunInput } from '../api/anthropic.js';

export function RunBriefPanel({ brief, setBrief, onRun, onStop, isRunning, runState, graph, apiKey }) {
  const [suggesting, setSuggesting] = useState(false);
  const [suggestErr, setSuggestErr] = useState('');

  const handleSuggest = async () => {
    if (!apiKey?.trim()) { setSuggestErr('Add your API key in the top bar first.'); return; }
    setSuggesting(true); setSuggestErr('');
    try {
      const input = await callSuggestRunInput(apiKey, graph);
      setBrief(input);
    } catch (err) {
      setSuggestErr('Could not generate suggestion: ' + err.message);
    } finally {
      setSuggesting(false);
    }
  };
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
    : '#60a5fa';

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
        <div className="field-label-row" style={{ marginBottom: 6 }}>
          <span className="panel-heading" style={{ marginBottom: 0 }}>Pipeline Input</span>
          {!brief.trim() && !isRunning && graph?.nodes?.length > 0 && (
            <button
              className="draft-btn"
              onClick={handleSuggest}
              disabled={suggesting}
              title="Generate a sample input for this pipeline"
            >
              {suggesting ? <span className="draft-spinner" /> : '✦'}
              {suggesting ? 'Thinking…' : 'Suggest input'}
            </button>
          )}
        </div>
        {suggestErr && <div className="error-msg" style={{ marginBottom: 6, fontSize: 11 }}>{suggestErr}</div>}
        <textarea
          style={{
            flex: 1,
            background:  canEdit ? 'var(--surface-2)' : 'var(--surface-1)',
            border:      `1px solid ${canEdit ? 'var(--border-strong)' : 'var(--border)'}`,
            color:       canEdit ? 'var(--text-primary)' : 'var(--text-tertiary)',
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
            style={{ background: !brief.trim() ? 'var(--surface-3)' : undefined }}
          >
            ▶ Run Pipeline
          </button>
        )}
      </div>
    </div>
  );
}
