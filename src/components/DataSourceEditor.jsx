import { useState } from 'react';
import { DATA_SOURCE_TYPES, ACCESS_MODES, getSourceType, makeDataSource } from '../data/dataSourceTypes.js';
import { pickFilePath, pickFolderPath } from '../api/dataSources.js';
import { HelpTip } from './HelpTip.jsx';

function AccessBadge({ mode, onClick }) {
  const def = ACCESS_MODES.find(m => m.id === mode) || ACCESS_MODES[0];
  return (
    <button
      className="ds-access-badge"
      style={{ borderColor: def.color, color: def.color }}
      onClick={onClick}
      title="Click to cycle access mode"
    >
      {def.label}
    </button>
  );
}

function DataSourceRow({ source, onChange, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  const typeDef = getSourceType(source.type);

  const up = (field, value) => onChange({ ...source, [field]: value });

  const cycleAccess = () => {
    const idx  = ACCESS_MODES.findIndex(m => m.id === source.accessMode);
    const next = ACCESS_MODES[(idx + 1) % ACCESS_MODES.length];
    up('accessMode', next.id);
  };

  const handleBrowse = async () => {
    const path = typeDef.usePicker === 'folder'
      ? await pickFolderPath()
      : await pickFilePath();
    if (path) up('path', path);
  };

  const primaryValue = source.type === 'url'
    ? source.url
    : source.type === 'database'
    ? source.connectionString
    : source.path;

  return (
    <div className={`ds-row ${expanded ? 'expanded' : ''}`}>
      <div className="ds-row-header" onClick={() => setExpanded(e => !e)}>
        <span className="ds-type-icon">{typeDef.icon}</span>
        <span className="ds-label">{source.label || typeDef.label}</span>
        <span className="ds-path-preview" title={primaryValue}>{primaryValue || <em>not set</em>}</span>
        <AccessBadge mode={source.accessMode} onClick={(e) => { e.stopPropagation(); cycleAccess(); }} />
        <button className="ds-remove-btn" onClick={(e) => { e.stopPropagation(); onRemove(source.id); }} title="Remove">×</button>
        <span className="ds-chevron">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="ds-row-body">
          {/* Label */}
          <div className="ds-field">
            <label className="ds-field-label">Label</label>
            <input
              className="field-input"
              value={source.label}
              placeholder={`e.g. ${typeDef.label}`}
              onChange={e => up('label', e.target.value)}
            />
          </div>

          {/* Type */}
          <div className="ds-field">
            <label className="ds-field-label">Type</label>
            <select className="field-select" value={source.type} onChange={e => up('type', e.target.value)}>
              {DATA_SOURCE_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
              ))}
            </select>
            {typeDef.note && <div className="ds-note">{typeDef.note}</div>}
          </div>

          {/* Path / URL / Connection string */}
          {(source.type === 'file' || source.type === 'folder' || source.type === 'spreadsheet') && (
            <div className="ds-field">
              <label className="ds-field-label">Path</label>
              <div className="ds-path-row">
                <input
                  className="field-input"
                  value={source.path}
                  placeholder={typeDef.placeholder}
                  onChange={e => up('path', e.target.value)}
                />
                <button className="ds-browse-btn" onClick={handleBrowse} title="Browse…">Browse</button>
              </div>
            </div>
          )}
          {source.type === 'url' && (
            <div className="ds-field">
              <label className="ds-field-label">URL</label>
              <input className="field-input" value={source.url} placeholder={typeDef.placeholder} onChange={e => up('url', e.target.value)} />
            </div>
          )}
          {source.type === 'database' && (
            <>
              <div className="ds-field">
                <label className="ds-field-label">Connection String</label>
                <input className="field-input" value={source.connectionString} placeholder={typeDef.placeholder} onChange={e => up('connectionString', e.target.value)} style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }} />
              </div>
              <div className="ds-field">
                <label className="ds-field-label">Table / Collection <span className="ds-optional">(optional)</span></label>
                <input className="field-input" value={source.table} placeholder="e.g. users" onChange={e => up('table', e.target.value)} />
              </div>
            </>
          )}
          {source.type === 'spreadsheet' && (
            <div className="ds-field">
              <label className="ds-field-label">Sheet Name <span className="ds-optional">(optional)</span></label>
              <input className="field-input" value={source.sheet} placeholder="e.g. Sheet1" onChange={e => up('sheet', e.target.value)} />
            </div>
          )}

          {/* Access mode */}
          <div className="ds-field">
            <label className="ds-field-label">Access Mode</label>
            <div className="ds-access-group">
              {ACCESS_MODES.map(m => (
                <button
                  key={m.id}
                  className={`ds-access-opt ${source.accessMode === m.id ? 'active' : ''}`}
                  style={source.accessMode === m.id ? { borderColor: m.color, color: m.color, background: `${m.color}18` } : {}}
                  onClick={() => up('accessMode', m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DataSourceEditor({ node, onChange, prefs }) {
  const sources = node.dataSources || [];

  const handleChange = (updated) => {
    onChange(sources.map(s => s.id === updated.id ? updated : s));
  };

  const handleRemove = (id) => {
    onChange(sources.filter(s => s.id !== id));
  };

  const handleAdd = () => {
    onChange([...sources, makeDataSource()]);
  };

  return (
    <div className="field-group">
      <label className="field-label">
        Data Sources
        <HelpTip text="Files, folders, URLs, or databases this node reads from or writes to. The access mode controls whether the node reads, writes, or does both." prefs={prefs} />
      </label>
      <div className="ds-list">
        {sources.map(src => (
          <DataSourceRow
            key={src.id}
            source={src}
            onChange={handleChange}
            onRemove={handleRemove}
          />
        ))}
      </div>
      <button className="ds-add-btn" onClick={handleAdd}>+ Add Data Source</button>
    </div>
  );
}
