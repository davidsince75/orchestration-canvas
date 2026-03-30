import { useState } from 'react';
import React from 'react';
import { NODE_STYLES } from '../data/nodeStyles.js';
import { callArchitectAnalysis, callArchitectFix, callArchitectGenerate } from '../api/anthropic.js';
import { snapToGrid, findCriticalPath } from '../utils/graph.js';
import { useToast } from './ToastProvider.jsx';

export function ArchitectPanel({ graph, validIssues, apiKey, onAddNodeFull, onHighlight, onUpdateGraph, onClose }) {
  const [tab,     setTab]     = useState('build');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState('');

  // Fix tab state
  const [fixResult,   setFixResult]   = useState(null);
  const [fixLoading,  setFixLoading]  = useState(false);
  const [fixError,    setFixError]    = useState('');
  const [fixApplied,  setFixApplied]  = useState(false);

  // Build tab state
  const [buildDesc,    setBuildDesc]    = useState('');
  const [buildResult,  setBuildResult]  = useState(null);
  const [buildLoading, setBuildLoading] = useState(false);
  const [buildError,   setBuildError]   = useState('');
  const [buildApplied, setBuildApplied] = useState(false);

  const toast = useToast();

  const critPath = findCriticalPath(graph);
  const nodeMap  = Object.fromEntries(graph.nodes.map(n => [n.id, n]));

  const runConsult = async () => {
    if (!apiKey.trim()) { setError('Add your API key in the top bar first.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const data = await callArchitectAnalysis(apiKey, graph, validIssues);
      setResult(data);
      setTab('recommend');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const applyNode = (rec) => {
    if (!rec.addNode) return;
    const last = graph.nodes[graph.nodes.length - 1];
    const x = last ? Math.min(last.position.x + 220, 2200) : 200;
    const y = last ? last.position.y : 300;
    const snapped = snapToGrid(x, y);
    onAddNodeFull({ ...rec.addNode, position: snapped });
    toast(`Added "${rec.addNode.name}"`, 'success');
  };

  const runFix = async () => {
    if (!apiKey.trim()) { setFixError('Add your API key in the top bar first.'); return; }
    if (validIssues.length === 0) { setFixError('No issues detected — nothing to fix.'); return; }
    setFixLoading(true); setFixError(''); setFixResult(null); setFixApplied(false);
    try {
      const data = await callArchitectFix(apiKey, graph, validIssues);
      setFixResult(data);
    } catch (err) { setFixError(err.message); }
    finally { setFixLoading(false); }
  };

  const applyFix = () => {
    if (!fixResult) return;
    let updated = { ...graph, nodes: [...graph.nodes], edges: [...graph.edges] };

    // Apply node field patches
    for (const patch of (fixResult.patches || [])) {
      updated = {
        ...updated,
        nodes: updated.nodes.map(n =>
          n.id === patch.nodeId ? { ...n, [patch.field]: patch.value } : n
        ),
      };
    }

    // Add edges (skip duplicates)
    for (const e of (fixResult.addEdges || [])) {
      const alreadyExists = updated.edges.some(ex => ex.from === e.from && ex.to === e.to);
      if (!alreadyExists) {
        updated = {
          ...updated,
          edges: [...updated.edges, { id: 'edge_' + Date.now() + Math.random(), from: e.from, to: e.to, label: e.label || '' }],
        };
      }
    }

    // Remove edges
    const removeIds = new Set((fixResult.removeEdges || []).map(r => r.edgeId));
    if (removeIds.size > 0) {
      updated = { ...updated, edges: updated.edges.filter(e => !removeIds.has(e.id)) };
    }

    onUpdateGraph(updated);
    setFixApplied(true);
    toast('Fix applied', 'success');
  };

  const runBuild = async () => {
    if (!apiKey.trim()) { setBuildError('Add your API key in the top bar first.'); return; }
    if (!buildDesc.trim()) { setBuildError('Describe what you want your pipeline to do.'); return; }
    setBuildLoading(true); setBuildError(''); setBuildResult(null); setBuildApplied(false);
    try {
      const data = await callArchitectGenerate(apiKey, buildDesc);
      setBuildResult(data);
    } catch (err) {
      setBuildError('Generation failed: ' + err.message);
    } finally {
      setBuildLoading(false);
    }
  };

  const applyBuild = () => {
    if (!buildResult) return;
    onUpdateGraph({ nodes: buildResult.nodes, edges: buildResult.edges });
    setBuildApplied(true);
    toast(`Pipeline "${buildResult.title || 'New pipeline'}" applied — ${buildResult.nodes.length} nodes`, 'success');
  };

  const fixPatchCount   = fixResult ? (fixResult.patches   || []).length : 0;
  const fixAddCount     = fixResult ? (fixResult.addEdges   || []).length : 0;
  const fixRemoveCount  = fixResult ? (fixResult.removeEdges|| []).length : 0;
  const fixChangeCount  = fixPatchCount + fixAddCount + fixRemoveCount;

  return (
    <div className="architect-panel">
      <div className="arch-header">
        <span className="arch-header-title">⬡ Architect</span>
        <button className="arch-close" onClick={onClose}>×</button>
      </div>
      <div className="arch-tabs">
        {['build', 'diagnose', 'questions', 'recommend', 'fix'].map(t => (
          <button key={t} className={`arch-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'build' ? '✦ Build' : t === 'diagnose' ? 'Diagnose' : t === 'questions' ? 'Ask' : t === 'recommend' ? 'Suggest' : 'Fix'}
          </button>
        ))}
      </div>
      <div className="arch-body">
        {tab === 'diagnose' && (
          <>
            {validIssues.length === 0
              ? <div className="arch-issue ok">✓ No issues detected</div>
              : validIssues.map((iss, i) => (
                  <div key={i} className={`arch-issue ${iss.severity}`}
                    style={{ cursor: iss.nodeIds?.length ? 'pointer' : 'default' }}
                    onClick={() => iss.nodeIds?.length && onHighlight(new Set(iss.nodeIds))}>
                    {iss.message}
                  </div>
                ))
            }
            {critPath.length > 1 && (
              <>
                <span className="panel-heading" style={{ marginTop: 6 }}>Critical Path</span>
                {critPath.map((id, i) => {
                  const n = nodeMap[id]; if (!n) return null;
                  const s = NODE_STYLES[n.type] || NODE_STYLES.agent;
                  return (
                    <React.Fragment key={id}>
                      <div className="arch-path-node" onClick={() => onHighlight(new Set([id]))}>
                        <div className="arch-path-dot" style={{ background: s.border }} />
                        {n.name}
                      </div>
                      {i < critPath.length - 1 && <div className="arch-path-arrow">↓</div>}
                    </React.Fragment>
                  );
                })}
              </>
            )}
          </>
        )}

        {tab === 'questions' && (
          <>
            {!result && !loading && <div className="arch-empty">Run Consult to generate targeted questions about your graph.</div>}
            {loading && <div className="loading-row"><div className="spinner" /><span>Analysing graph…</span></div>}
            {error && <div className="error-msg">{error}</div>}
            {result?.questions?.map((q, i) => <div key={i} className="arch-question">❓ {q}</div>)}
            {(!result || tab === 'questions') && !loading && (
              <button className="arch-run-btn" onClick={runConsult} disabled={loading || graph.nodes.length === 0}>
                {loading ? 'Consulting…' : '⬡ Consult Architect'}
              </button>
            )}
          </>
        )}

        {tab === 'recommend' && (
          <>
            {!result && !loading && <div className="arch-empty">Run Consult to get recommendations for your graph.</div>}
            {loading && <div className="loading-row"><div className="spinner" /><span>Analysing graph…</span></div>}
            {error && <div className="error-msg">{error}</div>}
            {result?.recommendations?.map((rec, i) => (
              <div key={i} className="arch-rec">
                <div className="arch-rec-title">{rec.title}</div>
                <div className="arch-rec-desc">{rec.description}</div>
                {rec.addNode && (
                  <button className="arch-apply-btn" onClick={() => applyNode(rec)}>
                    + Apply — add {rec.addNode.name}
                  </button>
                )}
              </div>
            ))}
            {(!result || tab === 'recommend') && !loading && (
              <button className="arch-run-btn" onClick={runConsult} disabled={loading || graph.nodes.length === 0}>
                {loading ? 'Consulting…' : '⬡ Consult Architect'}
              </button>
            )}
          </>
        )}

        {tab === 'build' && (
          <div className="arch-build">
            {!buildResult && !buildLoading && (
              <>
                <div className="arch-build-hint">
                  Describe what you want your pipeline to do — in plain English. The Architect will design and build it for you.
                </div>
                <textarea
                  className="arch-build-textarea"
                  placeholder={`e.g. "I want a pipeline that takes a company name, researches it online, analyses sentiment, and produces an investment brief" or "Build me a content moderation pipeline for a social platform"`}
                  value={buildDesc}
                  onChange={e => setBuildDesc(e.target.value)}
                  rows={6}
                />
              </>
            )}
            {buildLoading && (
              <div className="loading-row">
                <div className="spinner" />
                <span>Designing your pipeline…</span>
              </div>
            )}
            {buildError && <div className="error-msg">{buildError}</div>}

            {buildResult && !buildApplied && (
              <>
                <div className="arch-build-preview-title">
                  {buildResult.title || 'Generated Pipeline'}
                </div>
                {buildResult.description && (
                  <div className="arch-build-preview-desc">{buildResult.description}</div>
                )}
                <span className="panel-heading" style={{ marginTop: 8 }}>
                  {buildResult.nodes.length} nodes · {buildResult.edges.length} edges
                </span>
                <div className="arch-build-node-list">
                  {buildResult.nodes.map((n, i) => {
                    const s = NODE_STYLES[n.type] || NODE_STYLES.agent;
                    return (
                      <div key={n.id} className="arch-build-node-item">
                        <div className="arch-build-node-dot" style={{ background: s.border }} />
                        <div>
                          <div className="arch-build-node-name">{n.name}</div>
                          <div className="arch-build-node-role">{n.role}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button className="arch-run-btn" onClick={applyBuild} style={{ marginTop: 10 }}>
                  ✦ Apply Pipeline to Canvas
                </button>
                <button
                  className="arch-apply-btn"
                  onClick={() => { setBuildResult(null); setBuildApplied(false); }}
                  style={{ marginTop: 4 }}
                >
                  ← Edit description
                </button>
              </>
            )}

            {buildApplied && (
              <>
                <div className="arch-issue ok">
                  ✓ Pipeline applied — {buildResult?.nodes.length} nodes added to canvas
                </div>
                <button
                  className="arch-apply-btn"
                  onClick={() => { setBuildDesc(''); setBuildResult(null); setBuildApplied(false); setBuildError(''); }}
                  style={{ marginTop: 8 }}
                >
                  Build another pipeline
                </button>
              </>
            )}

            {!buildLoading && !buildResult && (
              <button
                className="arch-run-btn"
                onClick={runBuild}
                disabled={buildLoading || !buildDesc.trim()}
                style={{ marginTop: 8 }}
              >
                {buildLoading ? 'Building…' : '✦ Build Pipeline'}
              </button>
            )}
          </div>
        )}

        {tab === 'fix' && (
          <>
            {validIssues.length === 0 && !fixResult && (
              <div className="arch-issue ok">✓ No issues to fix</div>
            )}
            {validIssues.length > 0 && !fixResult && !fixLoading && (
              <div className="arch-empty">
                {validIssues.length} issue{validIssues.length !== 1 ? 's' : ''} detected.
                The Architect will propose targeted patches to resolve them.
              </div>
            )}
            {fixLoading && <div className="loading-row"><div className="spinner" /><span>Diagnosing &amp; planning fix…</span></div>}
            {fixError && <div className="error-msg">{fixError}</div>}

            {fixResult && !fixApplied && (
              <>
                <div className="arch-fix-summary">{fixResult.summary}</div>
                {fixPatchCount > 0 && (
                  <>
                    <span className="panel-heading" style={{ marginTop: 6 }}>Node Patches ({fixPatchCount})</span>
                    {fixResult.patches.map((p, i) => {
                      const n = nodeMap[p.nodeId];
                      return (
                        <div key={i} className="arch-fix-item">
                          <span className="arch-fix-node">{n?.name || p.nodeId}</span>
                          <span className="arch-fix-field"> · {p.field}</span>
                          <div className="arch-fix-value">{String(p.value).slice(0, 80)}{String(p.value).length > 80 ? '…' : ''}</div>
                        </div>
                      );
                    })}
                  </>
                )}
                {fixAddCount > 0 && (
                  <>
                    <span className="panel-heading" style={{ marginTop: 6 }}>Add Edges ({fixAddCount})</span>
                    {fixResult.addEdges.map((e, i) => (
                      <div key={i} className="arch-fix-item">
                        {nodeMap[e.from]?.name || e.from} → {nodeMap[e.to]?.name || e.to}
                        {e.label && <span className="arch-fix-field"> · {e.label}</span>}
                      </div>
                    ))}
                  </>
                )}
                {fixRemoveCount > 0 && (
                  <>
                    <span className="panel-heading" style={{ marginTop: 6 }}>Remove Edges ({fixRemoveCount})</span>
                    {fixResult.removeEdges.map((e, i) => (
                      <div key={i} className="arch-fix-item">{e.edgeId}</div>
                    ))}
                  </>
                )}
                <button
                  className="arch-run-btn"
                  onClick={applyFix}
                  disabled={fixChangeCount === 0}
                  style={{ marginTop: 10 }}
                >
                  ✓ Apply {fixChangeCount} change{fixChangeCount !== 1 ? 's' : ''}
                </button>
                <button className="arch-apply-btn" onClick={() => { setFixResult(null); setFixApplied(false); }} style={{ marginTop: 4 }}>
                  Discard
                </button>
              </>
            )}

            {fixApplied && (
              <div className="arch-issue ok">✓ Fix applied — {fixResult?.summary}</div>
            )}

            {!fixLoading && !fixResult && validIssues.length > 0 && (
              <button className="arch-run-btn" onClick={runFix} disabled={fixLoading || graph.nodes.length === 0} style={{ marginTop: 8 }}>
                ⬡ Auto-Fix Issues
              </button>
            )}
            {(fixApplied || fixResult) && !fixLoading && (
              <button className="arch-apply-btn" onClick={() => { setFixResult(null); setFixApplied(false); setFixError(''); }} style={{ marginTop: 6 }}>
                Run Again
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
