import { useState } from 'react';
import { LIBRARY } from '../data/library.js';
import { NODE_STYLES } from '../data/nodeStyles.js';

export function LibraryPanel() {
  const [query, setQuery] = useState('');
  const filtered = LIBRARY.filter(n =>
    n.label.toLowerCase().includes(query.toLowerCase()) ||
    n.type.toLowerCase().includes(query.toLowerCase())
  );
  return (
    <div className="library-tab-content">
      <input
        className="library-search"
        placeholder="Search nodes…"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <div className="library-list">
        {filtered.map((tpl, i) => {
          const s = NODE_STYLES[tpl.type] || NODE_STYLES.agent;
          return (
            <div
              key={i}
              className="library-card"
              draggable
              onDragStart={e => e.dataTransfer.setData('nodeTemplate', JSON.stringify(tpl))}
              title={tpl.desc}
            >
              <div className="library-card-dot" style={{ background: s.border }} />
              <div className="library-card-info">
                <div className="library-card-label">{tpl.label}</div>
                <div className="library-card-type">{tpl.type}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
