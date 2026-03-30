import { useState, useEffect, useRef, useCallback } from 'react';
import { fromInfraNodus, generateVizHTML } from '../utils/infranodusViz.js';

/**
 * VizPanel — renders an InfraNodus JSON graph as an interactive D3 constellation
 * inside a sandboxed iframe. Manages blob URL lifecycle to avoid memory leaks.
 *
 * Props:
 *   output  {string} — raw JSON string produced by an InfraNodus node
 *   height  {number} — iframe height in px (default 480)
 */
export function VizPanel({ output, height = 480 }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [theme, setTheme]     = useState('dark');
  const prevUrl = useRef(null);

  const buildBlob = useCallback((t) => {
    if (prevUrl.current) URL.revokeObjectURL(prevUrl.current);
    try {
      const raw  = JSON.parse(output);
      const data = fromInfraNodus(raw);
      const html = generateVizHTML(data, { theme: t });
      const blob = new Blob([html], { type: 'text/html' });
      const url  = URL.createObjectURL(blob);
      prevUrl.current = url;
      setBlobUrl(url);
    } catch {
      setBlobUrl(null);
    }
  }, [output]);

  useEffect(() => {
    buildBlob(theme);
    return () => {
      if (prevUrl.current) URL.revokeObjectURL(prevUrl.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [output]);

  const handleThemeToggle = () => {
    const next = theme === 'dark' ? 'editorial' : 'dark';
    setTheme(next);
    buildBlob(next);
  };

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = 'infranodus-graph.html';
    a.click();
  };

  if (!blobUrl) return null;

  return (
    <div className="viz-panel">
      <div className="viz-panel-toolbar">
        <span className="viz-panel-label">🌌 Constellation Viz</span>
        <button className="viz-toolbar-btn" onClick={handleThemeToggle} title="Toggle theme">
          {theme === 'dark' ? '☀ Editorial' : '🌙 Dark'}
        </button>
        <button className="viz-toolbar-btn" onClick={handleDownload} title="Download as standalone HTML">
          ⬇ Download
        </button>
      </div>
      <iframe
        className="viz-iframe"
        src={blobUrl}
        title="InfraNodus Knowledge Graph"
        sandbox="allow-scripts"
        style={{ height }}
      />
    </div>
  );
}
