import { useState } from 'react';

export function PrefsModal({ prefs, setPrefs, onClose }) {
  const [ghTokenVisible, setGhTokenVisible] = useState(false);
  return (
    <div className="prefs-overlay" onClick={onClose}>
      <div className="prefs-modal" onClick={e => e.stopPropagation()}>
        <div className="prefs-modal-header">
          <span className="prefs-modal-title">Preferences</span>
          <button className="prefs-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="prefs-body">
          <div className="prefs-row">
            <div className="prefs-row-info">
              <div className="prefs-row-label">Port Visibility</div>
              <div className="prefs-row-hint">Connection ports on nodes</div>
            </div>
            <div className="toggle-group">
              <button className={`toggle-btn ${prefs.ports !== 'always' ? 'active' : ''}`}
                onClick={() => setPrefs(p => ({ ...p, ports: 'hover' }))}>On Hover</button>
              <button className={`toggle-btn ${prefs.ports === 'always' ? 'active' : ''}`}
                onClick={() => setPrefs(p => ({ ...p, ports: 'always' }))}>Always</button>
            </div>
          </div>
          <div className="prefs-row">
            <div className="prefs-row-info">
              <div className="prefs-row-label">Help Bubbles</div>
              <div className="prefs-row-hint">Show ? tooltips on input fields</div>
            </div>
            <div className="toggle-group">
              <button className={`toggle-btn ${!prefs.helpBubbles ? 'active' : ''}`}
                onClick={() => setPrefs(p => ({ ...p, helpBubbles: false }))}>Off</button>
              <button className={`toggle-btn ${prefs.helpBubbles ? 'active' : ''}`}
                onClick={() => setPrefs(p => ({ ...p, helpBubbles: true }))}>On</button>
            </div>
          </div>
          <div className="prefs-row prefs-row-col">
            <div className="prefs-row-info">
              <div className="prefs-row-label">GitHub Token</div>
              <div className="prefs-row-hint">
                Personal access token with <strong>gist</strong> scope — used for Gist save/load.{' '}
                <a href="https://github.com/settings/tokens/new?scopes=gist" target="_blank" rel="noreferrer"
                   style={{ color: '#818cf8' }}>Create one</a>
              </div>
            </div>
            <div className="prefs-token-row">
              <input
                type={ghTokenVisible ? 'text' : 'password'}
                className="prefs-token-input"
                value={prefs.githubToken || ''}
                onChange={e => setPrefs(p => ({ ...p, githubToken: e.target.value }))}
                placeholder="ghp_…"
                autoComplete="off"
              />
              <button className="prefs-token-toggle" onClick={() => setGhTokenVisible(v => !v)}>
                {ghTokenVisible ? '🙈' : '👁'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
