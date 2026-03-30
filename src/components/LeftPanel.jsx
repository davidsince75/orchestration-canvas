import { useState } from 'react';
import { LibraryPanel } from './LibraryPanel.jsx';

export function LeftPanel({ brief, setBrief, onGenerate, onOpenTemplates, loading, error }) {
  const [tab, setTab] = useState('brief');
  return (
    <div className="left-panel">
      <div className="left-tabs">
        <button className={`left-tab ${tab === 'brief'   ? 'active' : ''}`} onClick={() => setTab('brief')}>Brief</button>
        <button className={`left-tab ${tab === 'library' ? 'active' : ''}`} onClick={() => setTab('library')}>Library</button>
      </div>
      {tab === 'brief' ? (
        <div className="brief-tab-content">
          <span className="panel-heading">System Brief</span>
          <textarea
            style={{ flex: 1, background: '#20202e', border: '1px solid #2e2e40', color: '#d8d8d8', padding: '10px', borderRadius: '6px', fontSize: '12px', lineHeight: '1.55', resize: 'none', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s' }}
            value={brief}
            onChange={e => setBrief(e.target.value)}
            placeholder={'Describe the system you want to build…\n\nExample: A research assistant that takes a question, searches the web, summarises results, stores memory of past queries, and generates a final report.'}
          />
          {loading && <div className="loading-row"><div className="spinner" /><span>Architect is designing…</span></div>}
          {error && !loading && <div className="error-msg">{error}</div>}
          <button className="btn-generate" onClick={onGenerate} disabled={!brief.trim() || loading}>
            {loading ? 'Generating…' : '⬡ Generate Map'}
          </button>
          <button className="btn-templates" onClick={onOpenTemplates}>☰ Load Starter Template</button>
        </div>
      ) : (
        <LibraryPanel />
      )}
    </div>
  );
}
