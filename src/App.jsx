import { useState, useCallback, useEffect, useRef } from 'react';
import { useGraphHistory } from './hooks/useGraphHistory.js';
import { useRunEngine } from './hooks/useRunEngine.js';
import { validateGraph, isInputFocused, centerNodesInCanvas } from './utils/graph.js';
import { secureGet, secureSet } from './utils/secureStore.js';
import { dbGet, dbSet, dbDel } from './utils/db.js';
import { useToast } from './components/ToastProvider.jsx';
import { TopBar } from './components/TopBar.jsx';
import { LeftPanel } from './components/LeftPanel.jsx';
import { Canvas } from './components/Canvas.jsx';
import { ValidationBar } from './components/ValidationBar.jsx';
import { ArchitectPanel } from './components/ArchitectPanel.jsx';
import { ViewportEditor } from './components/ViewportEditor.jsx';
import { TemplateDrawer } from './components/TemplateDrawer.jsx';
import { PrefsModal } from './components/PrefsModal.jsx';
import { RunHistoryPanel } from './components/RunHistoryPanel.jsx';
import { RunBriefPanel } from './components/RunBriefPanel.jsx';
import { RunOutputPanel } from './components/RunOutputPanel.jsx';
import { CostEstimator } from './components/CostEstimator.jsx';
import { Minimap } from './components/Minimap.jsx';
import { HumanReviewModal } from './components/HumanReviewModal.jsx';

export function App() {
  const { graph, setGraph, setGraphSilent, undo, redo, canUndo, canRedo } =
    useGraphHistory(() => ({ nodes: [], edges: [] }));
  const canvasWrapperRef = useRef(null);

  const [apiKey,         setApiKey]         = useState('');
  const [brief,          setBrief]           = useState('');
  const [selectedId,     setSelectedId]      = useState(null);
  const [selectedEdgeId, setSelectedEdgeId]  = useState(null);
  const [validIssues,    setValidIssues]     = useState([]);
  const [highlightedIds, setHighlightedIds]  = useState(new Set());
  const [showTemplates,  setShowTemplates]   = useState(false);
  const [architectOpen,  setArchitectOpen]   = useState(false);
  const [prefsOpen,      setPrefsOpen]       = useState(false);
  const [historyOpen,    setHistoryOpen]     = useState(false);
  const [costOpen,       setCostOpen]        = useState(false);
  const [zoom,           setZoom]            = useState(1);
  const [selectedIds,    setSelectedIds]     = useState(new Set());
  const [runMode,        setRunMode]         = useState('design');
  const [prefs,          setPrefs]           = useState({});
  const [dbLoaded,       setDbLoaded]        = useState(false);
  const [suggestedDesc,  setSuggestedDesc]   = useState('');
  const toast = useToast();

  const { runState, pendingReview, startExecution, stopExecution, clearRun, submitReview, isRunning } = useRunEngine(
    graph,
    apiKey,
    brief,
    (msg) => { toast(msg, 'error'); setError(msg); }
  );

  // ── Load persisted state on mount ────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      secureGet('oc_apikey'),
      dbGet('oc_brief'),
      dbGet('oc_graph'),
      dbGet('oc_prefs'),
    ]).then(([key, savedBrief, savedGraph, savedPrefs]) => {
      if (key)        setApiKey(key);
      if (savedBrief) setBrief(savedBrief);
      if (savedGraph) { try { setGraph(JSON.parse(savedGraph)); } catch {} }
      if (savedPrefs) { try { setPrefs(JSON.parse(savedPrefs)); } catch {} }
      setDbLoaded(true);
      // Auto-open Architect to Build tab when canvas is empty on first load
      if (!savedGraph || savedGraph === '{"nodes":[],"edges":[]}') {
        setArchitectOpen(true);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!dbLoaded) return;
    const t = setTimeout(() => dbSet('oc_graph', JSON.stringify(graph)), 300);
    return () => clearTimeout(t);
  }, [graph, dbLoaded]);

  useEffect(() => { if (dbLoaded) dbSet('oc_brief', brief); }, [brief, dbLoaded]);
  useEffect(() => { secureSet('oc_apikey', apiKey); }, [apiKey]);
  useEffect(() => { if (dbLoaded) dbSet('oc_prefs', JSON.stringify(prefs)); }, [prefs, dbLoaded]);

  // ── Validation ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setValidIssues(validateGraph(graph)), 500);
    return () => clearTimeout(t);
  }, [graph]);

  useEffect(() => { setHighlightedIds(new Set()); }, [selectedId]);

  // ── Clear run state when switching back to design mode ───────────────────────
  useEffect(() => {
    if (runMode === 'design') clearRun();
    if (runMode === 'run')    setArchitectOpen(false);
  }, [runMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Show toast when run completes ────────────────────────────────────────────
  useEffect(() => {
    if (runState?.mode === 'done')      toast('Run complete', 'success');
    if (runState?.mode === 'error')     toast('Run completed with errors', 'error');
    if (runState?.mode === 'cancelled') toast('Run cancelled', 'info');
  }, [runState?.mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedNode = graph.nodes.find(n => n.id === selectedId) || null;

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleUpdatePosition = useCallback((nodeId, x, y) => {
    setGraphSilent(prev => ({ ...prev, nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, position: { x, y } } : n) }));
  }, [setGraphSilent]);

  const handleUpdateNode = useCallback((updated) => {
    setGraph(prev => ({ ...prev, nodes: prev.nodes.map(n => n.id === updated.id ? updated : n) }));
  }, [setGraph]);

  const handleUpdateGraph = useCallback((ng) => { setGraph(ng); setSelectedId(null); }, [setGraph]);
  const handleImport      = useCallback((ng, nb) => {
    setGraph(ng);
    setSelectedId(null);
    if (nb !== undefined) setBrief(nb);
  }, [setGraph]);

  const handleDeleteNode = useCallback((nodeId) => {
    setGraph(prev => ({
      nodes: prev.nodes.filter(n => n.id !== nodeId),
      edges: prev.edges.filter(e => e.from !== nodeId && e.to !== nodeId),
    }));
    setSelectedId(null);
    setSelectedIds(new Set());
    toast('Node deleted', 'info');
  }, [setGraph, toast]);

  const handleDeleteEdge = useCallback((edgeId) => {
    setGraph(prev => ({ ...prev, edges: prev.edges.filter(e => e.id !== edgeId) }));
    setSelectedEdgeId(null);
    toast('Connection removed', 'info');
  }, [setGraph, toast]);

  const handleUpdateEdge = useCallback((updated) => {
    setGraph(prev => ({ ...prev, edges: prev.edges.map(e => e.id === updated.id ? updated : e) }));
  }, [setGraph]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size > 1) {
      const ids = selectedIds;
      setGraph(prev => ({
        nodes: prev.nodes.filter(n => !ids.has(n.id)),
        edges: prev.edges.filter(e => !ids.has(e.from) && !ids.has(e.to)),
      }));
      setSelectedId(null);
      setSelectedIds(new Set());
      setSelectedEdgeId(null);
      toast(`${ids.size} nodes deleted`, 'info');
    } else if (selectedId) {
      handleDeleteNode(selectedId);
    } else if (selectedEdgeId) {
      handleDeleteEdge(selectedEdgeId);
    }
  }, [selectedIds, selectedId, selectedEdgeId, setGraph, handleDeleteNode, handleDeleteEdge]);

  // ── Keyboard shortcuts (defined after delete handlers so closure is always fresh) ──
  useEffect(() => {
    const handler = (e) => {
      if (isRunning) return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputFocused()) {
        handleDeleteSelected();
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, isRunning, handleDeleteSelected]);

  const handleAddNode = useCallback((x, y, tpl) => {
    const id = 'node_' + Date.now();
    const node = {
      id,
      type:         tpl?.type         || 'agent',
      name:         tpl?.label        || 'New Agent',
      role:         tpl?.desc         || '',
      systemPrompt: '',
      inputSchema:  {},
      outputSchema: {},
      position:     { x, y },
    };
    setGraph(prev => ({ ...prev, nodes: [...prev.nodes, node] }));
    setSelectedId(id);
    toast(tpl ? `Added ${tpl.label}` : 'Node added — double-click label to rename', 'info');
  }, [setGraph, toast]);

  const handleAddNodeFull = useCallback((nodeData) => {
    const id = 'node_' + Date.now();
    const node = { id, inputSchema: {}, outputSchema: {}, systemPrompt: '', ...nodeData };
    setGraph(prev => ({ ...prev, nodes: [...prev.nodes, node] }));
    setSelectedId(id);
  }, [setGraph]);

  const handleAddEdge = useCallback((fromId, toId) => {
    if (fromId === toId) return;
    setGraph(prev => {
      if (prev.edges.some(e => e.from === fromId && e.to === toId)) return prev;
      return { ...prev, edges: [...prev.edges, { id: 'edge_' + Date.now(), from: fromId, to: toId, label: '' }] };
    });
    toast('Connection added', 'success');
  }, [setGraph, toast]);

  const handleExampleClick = useCallback((example) => {
    setSuggestedDesc(example);
    setArchitectOpen(true);
    // Reset after one tick so re-clicking the same example still fires the effect
    setTimeout(() => setSuggestedDesc(''), 100);
  }, []);

  const handleNewCanvas = useCallback(() => {
    if (graph.nodes.length > 0 && !window.confirm('Clear the canvas? Export first if needed.')) return;
    setGraph({ nodes: [], edges: [] });
    setSelectedId(null); setSelectedEdgeId(null); setError('');
    Promise.all([dbDel('oc_graph'), dbDel('oc_brief')]);
    setBrief('');
    toast('Canvas cleared', 'info');
  }, [graph.nodes.length, setGraph]);

  const handleLoadTemplate = useCallback((template) => {
    if (graph.nodes.length > 0 && !window.confirm(`Load "${template.name}"? Current canvas will be replaced.`)) return;
    const centred = { ...template.graph, nodes: centerNodesInCanvas(template.graph.nodes) };
    setGraph(centred); setBrief(template.brief);
    setSelectedId(null); setShowTemplates(false);
    toast(`Template "${template.name}" loaded`, 'success');
  }, [graph.nodes.length, setGraph]);

  return (
    <div id="app">
      <TopBar
        apiKey={apiKey} setApiKey={setApiKey}
        canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo}
        onNewCanvas={handleNewCanvas}
        graph={graph} brief={brief} onImport={handleImport} prefs={prefs}
        architectOpen={architectOpen}
        onToggleArchitect={() => setArchitectOpen(o => !o)}
        onOpenPrefs={() => setPrefsOpen(true)}
        runMode={runMode}
        onToggleRunMode={() => setRunMode(m => m === 'design' ? 'run' : 'design')}
        onRun={startExecution}
        onStop={stopExecution}
        isRunning={isRunning}
        onOpenHistory={() => setHistoryOpen(o => !o)}
        costOpen={costOpen}
        onToggleCost={() => setCostOpen(o => !o)}
      />
      <div className="main-area">
        {runMode === 'design' ? (
          <LeftPanel
            brief={brief} setBrief={setBrief}
            onOpenTemplates={() => setShowTemplates(true)}
          />
        ) : (
          <RunBriefPanel
            brief={brief} setBrief={setBrief}
            onRun={startExecution}
            onStop={stopExecution}
            isRunning={isRunning}
            runState={runState}
            graph={graph}
            apiKey={apiKey}
          />
        )}
        <div className="canvas-area">
          <Canvas
            graph={graph}
            selectedId={selectedId}
            selectedEdgeId={selectedEdgeId}
            highlightedIds={highlightedIds}
            onSelectNode={(id) => { setSelectedId(id); if (id) setSelectedIds(new Set([id])); else setSelectedIds(new Set()); }}
            onSelectEdge={setSelectedEdgeId}
            onUpdatePosition={handleUpdatePosition}
            onAddNode={handleAddNode}
            onAddEdge={handleAddEdge}
            portsAlways={prefs.ports === 'always'}
            nodeRunStates={runState?.nodeStates || null}
            runMode={runMode}
            zoom={zoom}
            onZoom={setZoom}
            selectedIds={selectedIds}
            onMultiSelect={setSelectedIds}
            wrapperRefOut={canvasWrapperRef}
            onExampleClick={handleExampleClick}
          />
          {/* Minimap — outside scroll container so position:absolute works correctly */}
          {graph.nodes.length > 0 && runMode === 'design' && (
            <Minimap nodes={graph.nodes} wrapperRef={canvasWrapperRef} zoom={zoom} />
          )}
          {/* Zoom controls */}
          <div className="zoom-controls">
            <button className="zoom-btn" onClick={() => setZoom(z => Math.min(2,   parseFloat((z + 0.1).toFixed(2))))} title="Zoom in">+</button>
            <span   className="zoom-label">{Math.round(zoom * 100)}%</span>
            <button className="zoom-btn" onClick={() => setZoom(z => Math.max(0.25, parseFloat((z - 0.1).toFixed(2))))} title="Zoom out">−</button>
            <button className="zoom-btn zoom-reset" onClick={() => setZoom(1)} title="Reset zoom (100%)">⊙</button>
          </div>
          {graph.nodes.length > 0 && runMode === 'design' && (
            <ValidationBar issues={validIssues} onHighlight={setHighlightedIds} />
          )}
          {selectedIds.size > 1 && runMode === 'design' && (
            <div className="multiselect-badge">
              {selectedIds.size} nodes selected
              <button className="multiselect-delete" onClick={handleDeleteSelected} title="Delete selected nodes">✕ Delete all</button>
              <button className="multiselect-clear" onClick={() => { setSelectedIds(new Set()); setSelectedId(null); }}>Deselect</button>
            </div>
          )}
        </div>
        {runMode === 'design' && architectOpen && (
          <ArchitectPanel
            graph={graph}
            validIssues={validIssues}
            apiKey={apiKey}
            onAddNodeFull={handleAddNodeFull}
            onHighlight={setHighlightedIds}
            onUpdateGraph={handleUpdateGraph}
            onClose={() => setArchitectOpen(false)}
            suggestedDesc={suggestedDesc}
          />
        )}
        {runMode === 'run' && (
          <RunOutputPanel graph={graph} runState={runState} pendingReview={pendingReview} />
        )}
        {historyOpen && (
          <RunHistoryPanel graph={graph} onClose={() => setHistoryOpen(false)} />
        )}
        {runMode === 'design' && costOpen && (
          <CostEstimator graph={graph} onClose={() => setCostOpen(false)} />
        )}
        {runMode === 'design' && (
          <ViewportEditor
            node={selectedNode}
            selectedEdge={graph.edges.find(e => e.id === selectedEdgeId) || null}
            graph={graph}
            onUpdateNode={handleUpdateNode}
            onUpdateEdge={handleUpdateEdge}
            onUpdateGraph={handleUpdateGraph}
            onDeleteNode={handleDeleteNode}
            onDeleteEdge={handleDeleteEdge}
            apiKey={apiKey}
            generating={false}
            prefs={prefs}
          />
        )}
      </div>
      <TemplateDrawer open={showTemplates} onClose={() => setShowTemplates(false)} onSelect={handleLoadTemplate} />
      {prefsOpen && <PrefsModal prefs={prefs} setPrefs={setPrefs} onClose={() => setPrefsOpen(false)} />}
      {/* Human-in-loop review modal — rendered above everything else */}
      <HumanReviewModal review={pendingReview} onSubmit={submitReview} />
    </div>
  );
}
