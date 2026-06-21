import { useState, useRef, useEffect } from 'react';
import { downloadFile, exportMermaid, exportPython, exportTypeScript,
         exportAnthropicSDK, exportLangGraph, exportCrewAI } from '../utils/export.js';
import { exportOpenMultiAgent } from '../utils/exportToOpenMultiAgent.js';
import { validateImportedGraph } from '../utils/graph.js';
import { saveGist, loadGist } from '../api/github.js';
import { useToast } from './ToastProvider.jsx';

export function ExportImportMenu({ graph, brief, onImport, prefs }) {
  const [open, setOpen] = useState(false);
  const menuRef      = useRef(null);
  const fileInputRef = useRef(null);
  const toast = useToast();
  const hasGraph = graph.nodes.length > 0;

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (!menuRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleExportJSON = () => {
    const data = { version: 1, graph, brief, exportedAt: new Date().toISOString() };
    downloadFile(JSON.stringify(data, null, 2), `orchestration-${Date.now()}.json`, 'application/json');
    toast('Graph exported as JSON', 'success');
    setOpen(false);
  };

  const handleExportMermaid = async () => {
    const mmd = exportMermaid(graph);
    try {
      await navigator.clipboard.writeText(mmd);
      toast('Mermaid diagram copied to clipboard', 'success');
    } catch {
      downloadFile(mmd, `orchestration-${Date.now()}.mmd`, 'text/plain');
      toast('Mermaid diagram downloaded', 'info');
    }
    setOpen(false);
  };

  const handleExportPython = () => {
    const code = exportPython(graph);
    downloadFile(code, `orchestration-${Date.now()}.py`, 'text/x-python');
    toast('Python scaffold downloaded', 'success');
    setOpen(false);
  };

  const handleExportTypeScript = () => {
    const code = exportTypeScript(graph);
    downloadFile(code, `orchestration-${Date.now()}.ts`, 'text/typescript');
    toast('TypeScript scaffold downloaded', 'success');
    setOpen(false);
  };

  const handleExportAnthropicSDK = () => {
    const code = exportAnthropicSDK(graph);
    downloadFile(code, `orchestration-anthropic-${Date.now()}.py`, 'text/x-python');
    toast('Anthropic SDK scaffold downloaded', 'success');
    setOpen(false);
  };

  const handleExportLangGraph = () => {
    const code = exportLangGraph(graph);
    downloadFile(code, `orchestration-langgraph-${Date.now()}.py`, 'text/x-python');
    toast('LangGraph scaffold downloaded', 'success');
    setOpen(false);
  };

  const handleExportCrewAI = () => {
    const code = exportCrewAI(graph);
    downloadFile(code, `orchestration-crewai-${Date.now()}.py`, 'text/x-python');
    toast('CrewAI scaffold downloaded', 'success');
    setOpen(false);
  };

  const handleExportOpenMultiAgent = () => {
    const code = exportOpenMultiAgent(graph);
    downloadFile(code, `orchestration-open-multi-agent-${Date.now()}.ts`, 'text/typescript');
    toast('open-multi-agent TypeScript file downloaded', 'success');
    setOpen(false);
  };

  const handleSaveGist = async () => {
    const token = prefs?.githubToken || '';
    if (!token) {
      toast('Add a GitHub token in Preferences (⚙) first', 'error');
      setOpen(false);
      return;
    }
    try {
      const { id, url } = await saveGist(token, graph, brief, false);
      try { await navigator.clipboard.writeText(id); } catch {}
      toast(`Gist saved! ID copied to clipboard. View at: ${url}`, 'success');
    } catch (err) {
      toast(`Gist save failed: ${err.message}`, 'error');
    }
    setOpen(false);
  };

  const handleLoadGist = async () => {
    const token = prefs?.githubToken || '';
    const gistId = window.prompt('Enter Gist ID or full URL:');
    if (!gistId) return;
    const id = gistId.trim().replace(/.*\//, ''); // strip URL prefix if pasted
    try {
      const { graph: ng, brief: nb } = await loadGist(token, id);
      const validated = validateImportedGraph(ng);
      onImport(validated, nb);
      toast('Gist loaded successfully', 'success');
    } catch (err) {
      toast(`Gist load failed: ${err.message}`, 'error');
    }
    setOpen(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        const raw = parsed.graph || parsed;
        const validated = validateImportedGraph(raw);
        onImport(validated, parsed.brief);
        toast('Graph imported successfully', 'success');
      } catch (err) {
        toast(`Import failed: ${err.message}`, 'error');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="export-menu" ref={menuRef}>
      <button className="topbar-btn" onClick={() => setOpen(o => !o)}>
        ↕ Export / Import
      </button>
      {open && (
        <div className="export-dropdown">
          <button className="export-dropdown-item" onClick={handleExportJSON} disabled={!hasGraph}>
            <span className="di">↓</span> Export JSON
          </button>
          <button className="export-dropdown-item" onClick={handleExportMermaid} disabled={!hasGraph}>
            <span className="di">◇</span> Copy as Mermaid
          </button>
          <button className="export-dropdown-item" onClick={handleExportPython} disabled={!hasGraph}>
            <span className="di">🐍</span> Export Python scaffold
          </button>
          <button className="export-dropdown-item" onClick={handleExportTypeScript} disabled={!hasGraph}>
            <span className="di">⬡</span> Export TypeScript scaffold
          </button>
          <div className="export-dropdown-sep" />
          <button className="export-dropdown-item" onClick={handleExportAnthropicSDK} disabled={!hasGraph}>
            <span className="di">⚡</span> Anthropic SDK (Python)
          </button>
          <button className="export-dropdown-item" onClick={handleExportLangGraph} disabled={!hasGraph}>
            <span className="di">🔗</span> LangGraph scaffold
          </button>
          <button className="export-dropdown-item" onClick={handleExportCrewAI} disabled={!hasGraph}>
            <span className="di">👥</span> CrewAI scaffold
          </button>
          <button className="export-dropdown-item" onClick={handleExportOpenMultiAgent} disabled={!hasGraph}>
            <span className="di">⬡</span> open-multi-agent (TypeScript)
          </button>
          <div className="export-dropdown-sep" />
          <button className="export-dropdown-item" onClick={() => { fileInputRef.current.click(); setOpen(false); }}>
            <span className="di">↑</span> Import JSON
          </button>
          <div className="export-dropdown-sep" />
          <button className="export-dropdown-item" onClick={handleSaveGist} disabled={!hasGraph}>
            <span className="di">⇡</span> Save to GitHub Gist
          </button>
          <button className="export-dropdown-item" onClick={handleLoadGist}>
            <span className="di">⇣</span> Load from GitHub Gist
          </button>
        </div>
      )}
      <input type="file" ref={fileInputRef} accept=".json" style={{ display: 'none' }} onChange={handleFileChange} />
    </div>
  );
}
