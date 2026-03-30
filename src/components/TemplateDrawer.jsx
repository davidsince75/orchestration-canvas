import { TEMPLATES } from '../data/templates.js';

export function TemplateDrawer({ open, onClose, onSelect }) {
  if (!open) return null;
  return (
    <div className="template-overlay" onClick={onClose}>
      <div className="template-drawer" onClick={e => e.stopPropagation()}>
        <div className="template-drawer-header">
          <span className="template-drawer-title">Starter Templates</span>
          <button className="template-close-btn" onClick={onClose}>×</button>
        </div>
        <div className="template-list">
          {TEMPLATES.map(t => (
            <div key={t.id} className="template-item" onClick={() => onSelect(t)}>
              <div className="template-item-name">{t.name}</div>
              <div className="template-item-desc">{t.description}</div>
              <div className="template-item-tags">
                {t.tags.map(tag => <span key={tag} className="template-tag">{tag}</span>)}
                <span className="template-tag">{t.graph.nodes.length} nodes</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
