import { useState } from 'react';
import { LibraryPanel } from './LibraryPanel.jsx';

export function LeftPanel({ brief, setBrief, onOpenTemplates }) {
  const [tab, setTab] = useState('brief');
  return (
    <div className="left-panel">
      <div className="left-tabs">
        <button className={`left-tab ${tab === 'brief'   ? 'active' : ''}`} onClick={() => setTab('brief')}>Context</button>
        <button className={`left-tab ${tab === 'library' ? 'active' : ''}`} onClick={() => setTab('library')}>Library</button>
      </div>
      {tab === 'brief' ? (
        <div className="brief-tab-content">
          <span className="panel-heading">Run Context</span>
          <textarea
            style={{ flex: 1, background: '#20202e', border: '1px solid #2e2e40', color: '#d8d8d8', padding: '10px', borderRadius: '6px', fontSize: '12px', lineHeight: '1.55', resize: 'none', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s' }}
            value={brief}
            onChange={e => setBrief(e.target.value)}
            placeholder={'Optional context passed to your pipeline when it runs.\n\nExample: Research assistant for Series A startups in climate tech. Prioritise market opportunity and founding team strength.'}
          />
          <div className="brief-context-hint">
            This text is available to every agent in the pipeline as background context. Use it to scope the domain, audience, or constraints.
          </div>
          <button className="btn-templates" onClick={onOpenTemplates}>☰ Load Starter Template</button>
        </div>
      ) : (
        <LibraryPanel />
      )}
    </div>
  );
}
