import { ExportImportMenu } from './ExportImportMenu.jsx';

export function TopBar({ apiKey, setApiKey, canUndo, canRedo, onUndo, onRedo, onNewCanvas,
                         graph, brief, onImport, prefs, architectOpen, onToggleArchitect, onOpenPrefs,
                         runMode, onToggleRunMode, onRun, onStop, isRunning, onOpenHistory,
                         costOpen, onToggleCost }) {
  const inRunMode = runMode === 'run';
  return (
    <div className="topbar">
      <span className="topbar-title">Orchestration Canvas</span>
      <div className="topbar-divider" />

      {/* Design / Run toggle */}
      <div className="toggle-group" style={{ gap: 0 }}>
        <button
          className={`toggle-btn ${!inRunMode ? 'active' : ''}`}
          onClick={() => !inRunMode || onToggleRunMode()}
          disabled={isRunning}
          title="Design mode">
          Design
        </button>
        <button
          className={`toggle-btn ${inRunMode ? 'active' : ''}`}
          onClick={() => inRunMode || onToggleRunMode()}
          disabled={isRunning}
          title="Run mode">
          Run
        </button>
      </div>

      {inRunMode ? (
        <>
          <button
            className="topbar-btn primary"
            onClick={onRun}
            disabled={isRunning || !graph.nodes.length}
            title={graph.nodes.length === 0 ? 'Add nodes in Design mode before running' : 'Execute graph'}>
            {isRunning ? '⟳ Running…' : '▶ Run'}
          </button>
          {isRunning && (
            <button
              className="topbar-btn danger"
              onClick={onStop}
              title="Stop after current node completes"
              style={{ fontSize: '11px' }}>
              ✕ Stop
            </button>
          )}
          <button className="topbar-btn" onClick={onOpenHistory} title="Run history">
            ☰ History
          </button>
        </>
      ) : (
        <>
          <button className="topbar-btn" onClick={onUndo} disabled={!canUndo || isRunning} title="Undo (Ctrl+Z)">← Undo</button>
          <button className="topbar-btn" onClick={onRedo} disabled={!canRedo || isRunning} title="Redo (Ctrl+Shift+Z)">Redo →</button>
          <div className="topbar-divider" />
          <ExportImportMenu graph={graph} brief={brief} onImport={onImport} prefs={prefs} />
          <button className="topbar-btn danger" onClick={onNewCanvas} disabled={isRunning} title="Clear canvas">✕ New</button>
          <div className="topbar-divider" />
          <button className={`topbar-btn primary ${architectOpen ? 'active' : ''}`}
            onClick={onToggleArchitect}
            title="Toggle Architect panel">
            ⬡ Architect
          </button>
          <button
            className={`topbar-btn ${costOpen ? 'active' : ''}`}
            onClick={onToggleCost}
            disabled={!graph.nodes.length}
            title="Estimate API call costs">
            $ Cost
          </button>
        </>
      )}

      <button className="topbar-btn" onClick={onOpenPrefs} title="Preferences" disabled={isRunning}>⚙</button>
      <div className="topbar-sep" />
      <span className="topbar-label">Anthropic API Key</span>
      <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-ant-api03-…" autoComplete="off" />
    </div>
  );
}
