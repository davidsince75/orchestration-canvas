import { useState } from 'react';
import { NODE_STYLES } from '../data/nodeStyles.js';
import { LLM_PROVIDERS, DEFAULT_PROVIDER, DEFAULT_MODEL, DEFAULT_OLLAMA_URL, getProvider } from '../data/llmProviders.js';
import { getApplicableSkills, getSkillById } from '../data/skills.js';
import { INFRANODUS_OPS, DEFAULT_INFRANODUS_OP } from '../data/infranodusOps.js';
import { OUTPUT_TEMPLATES, DEFAULT_OUTPUT_TEMPLATE } from '../data/outputTemplates.js';
import { OUTPUT_DESIGNS, DEFAULT_OUTPUT_DESIGN } from '../data/outputDesigns.js';
import { callArchitect, parseGraph, callDraftSystemPrompt, callInferSchemas } from '../api/anthropic.js';
import { useToast } from './ToastProvider.jsx';
import { SchemaEditor } from './SchemaEditor.jsx';
import { HelpTip } from './HelpTip.jsx';
import { DataSourceEditor } from './DataSourceEditor.jsx';

const HELP = {
  name:         'A short, descriptive identifier for this node — shown on the canvas.',
  sharedMemoryReads:  'Keys to read from the shared run-memory store before this node executes. Values are injected into the node\'s context.',
  sharedMemoryWrites: 'Keys to write this node\'s output into after it completes. Downstream nodes can read these values.',
  toolType:           'How this tool executes: call a REST endpoint, run a shell command, or read/write/search files.',
  role:         'One sentence describing what this node does within the orchestration. Used by the Architect for analysis.',
  systemPrompt: 'The system-level instructions sent to the LLM powering this node. Define persona, constraints, and output format here.',
  endpoint:     'The API URL or function signature this tool calls. Supports path parameters, e.g. POST /api/search?q={query}.',
  memoryType:   'Working: cleared each run. Queue: FIFO buffer between agents. Long-term: persisted across runs.',
  accessMode:   'Whether this memory node can be read from, written to, or both by connected agents.',
  inputSchema:  'Key–value pairs describing the data this node expects to receive. Values are type hints (string, number, array…).',
  outputSchema: 'Key–value pairs describing the data this node produces. Downstream nodes consume these fields.',
  refine:       'Describe a structural change to the entire graph and the Architect will apply it. E.g. "Add a caching layer between the searcher and summariser."',
  llmProvider:  'Which LLM service powers this node during execution. Claude uses the global API key; other providers require their own key below.',
  llmModel:     'The specific model variant to use. Affects capability, speed, and cost.',
  llmApiKey:    'API key for this provider. Leave blank for Claude (uses the global key). Warning: this value is included in JSON exports.',
  llmOllamaUrl: 'Base URL of your local Ollama server. Defaults to http://localhost:11434.',
  skills:            'Behavioral templates that tag this node and can pre-fill its system prompt. Multiple skills can be combined.',
  routerMode:        'LLM: the model decides the route. Keyword: match on key phrases. Rules: explicit condition → route pairs.',
  routerRoutes:      'One route per line in the format: label → description. E.g. "urgent → High-priority items". The LLM or rules engine picks one.',
  routerDefault:     'Fallback route name used when no condition matches.',
  evaluatorCriteria: 'List the evaluation criteria, one per line. The evaluator will score the input against each criterion.',
  evaluatorScoring:  'Pass/Fail: binary result. Score 1–10: numeric with explanation. Rank: orders multiple inputs.',
  evaluatorThreshold:'Minimum score (1–10) required to pass. Only applies to Score 1–10 mode.',
  humanPrompt:       'Instructions shown to the human reviewer — describe what they need to decide and what context they have.',
  humanTimeout:      'Minutes before the pipeline auto-proceeds. Set to 0 to wait indefinitely.',
  humanOnTimeout:    'What to do if the reviewer does not respond within the timeout.',
  humanBypass:       'When enabled, this node is automatically approved during runs — useful for testing pipelines without stopping at every checkpoint.',
  infranodusKey:     'Your InfraNodus API key. Stored in the node — will be included in JSON exports.',
  infranodusOp:      'Which analysis to run on the incoming text.',
  infranodusGraph:   'Optional: save results to a named InfraNodus graph for future reference. Leave blank for a temporary analysis.',
  infranodusPrivacy: 'When on, text is analysed without being stored on InfraNodus servers.',
  outputTemplate:    'Choose how to structure and display the pipeline output — brief, report, table, slides, and more.',
  outputDesign:      'Visual theme applied to the rendered output card.',
  outputShowViz:     'Automatically embed an InfraNodus constellation visualisation when the incoming data is a knowledge graph.',
  outputShowRaw:     'Let users toggle between the styled view and the raw output text.',
  outputCustom:      'Define your own sections for a fully custom layout. Each section has a label and a content type.',
  memoryBackend:     'Local: simple pass-through (default). Letta: persistent memory via a Letta / MemGPT agent.',
  lettaApiUrl:       'Base URL of the Letta server. Use http://localhost:8283 for a self-hosted instance or https://api.letta.com for the cloud.',
  lettaApiKey:       'Bearer token for the Letta server. Leave empty for unauthenticated local servers. Warning: included in JSON exports.',
  lettaAgentId:      'The ID of the Letta agent whose memory this node reads/writes. Find agent IDs in the Letta dashboard or via GET /v1/agents.',
  lettaMemoryMode:   'Archival: long-term vector search across stored passages. Core Block: a named in-context memory segment always visible to the agent.',
  lettaBlockName:    'Label of the core memory block to read/write. Defaults to pipeline-context.',
};

function NodeSkillPicker({ node, onToggle, tip }) {
  const applicable = getApplicableSkills(node.type);
  const active     = new Set(node.skills || []);

  return (
    <div className="field-group">
      <label className="field-label">Skills {tip('skills')}</label>
      <div className="skills-grid">
        {applicable.map(skill => (
          <button
            key={skill.id}
            className={`skill-badge ${active.has(skill.id) ? 'active' : ''}`}
            onClick={() => onToggle(skill.id)}
            title={skill.description}
          >
            <span className="skill-icon">{skill.icon}</span>
            <span className="skill-name">{skill.name}</span>
          </button>
        ))}
      </div>
      {active.size > 0 && (
        <div className="skills-active-list">
          {[...active].map(id => {
            const s = getSkillById(id);
            return s ? (
              <div key={id} className="skill-active-item">
                <span className="skill-active-name">{s.icon} {s.name}</span>
                <span className="skill-active-desc">{s.description}</span>
              </div>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

const SECTION_TYPES = ['text', 'markdown', 'list', 'table', 'slides'];

function OutputCustomSections({ sections, onChange }) {
  const addSection = () => {
    onChange([...sections, { id: `s${Date.now()}`, label: 'New Section', type: 'markdown' }]);
  };
  const removeSection = (id) => onChange(sections.filter(s => s.id !== id));
  const updateSection = (id, field, value) =>
    onChange(sections.map(s => s.id === id ? { ...s, [field]: value } : s));

  return (
    <div className="output-custom-sections">
      {sections.length === 0 && (
        <div className="output-custom-empty">No sections yet — add one below.</div>
      )}
      {sections.map((sec, idx) => (
        <div key={sec.id} className="output-custom-row">
          <span className="output-custom-idx">{idx + 1}</span>
          <input
            className="field-input output-custom-label-input"
            value={sec.label}
            placeholder="Section label"
            onChange={e => updateSection(sec.id, 'label', e.target.value)}
          />
          <select
            className="field-select output-custom-type-select"
            value={sec.type}
            onChange={e => updateSection(sec.id, 'type', e.target.value)}
          >
            {SECTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button
            className="output-custom-remove"
            onClick={() => removeSection(sec.id)}
            title="Remove section"
          >✕</button>
        </div>
      ))}
      <button className="output-custom-add" onClick={addSection}>+ Add Section</button>
    </div>
  );
}

function SharedMemoryEditor({ node, onChange, tip }) {
  const reads  = (node.sharedMemoryReads  || []).join('\n');
  const writes = (node.sharedMemoryWrites || []).join('\n');
  const parse  = text => text.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);

  return (
    <div className="field-group">
      <label className="field-label">Shared Memory {tip('sharedMemoryReads')}</label>
      <label className="field-label" style={{ fontSize: 10, opacity: 0.65, marginTop: 0 }}>Read keys (one per line)</label>
      <textarea
        className="field-textarea"
        rows={2}
        value={reads}
        placeholder={'e.g. user_context\nsearch_results'}
        onChange={e => onChange({ reads: parse(e.target.value), writes: node.sharedMemoryWrites || [] })}
      />
      <label className="field-label" style={{ fontSize: 10, opacity: 0.65, marginTop: 4 }}>Write keys (one per line)</label>
      <textarea
        className="field-textarea"
        rows={2}
        value={writes}
        placeholder={'e.g. summary\nextracted_data'}
        onChange={e => onChange({ reads: node.sharedMemoryReads || [], writes: parse(e.target.value) })}
      />
    </div>
  );
}

export function ViewportEditor({ node, graph, onUpdateNode, onUpdateGraph, onDeleteNode, apiKey, generating, prefs }) {
  const [refineText,    setRefineText]    = useState('');
  const [refining,      setRefining]      = useState(false);
  const [refineErr,     setRefineErr]     = useState('');
  const [draftLoading,  setDraftLoading]  = useState(false);
  const [draftPreview,  setDraftPreview]  = useState('');
  const [draftErr,      setDraftErr]      = useState('');
  const [inferLoading,  setInferLoading]  = useState(false);
  const [inferErr,      setInferErr]      = useState('');
  const toast = useToast();

  const nodeMap = Object.fromEntries(graph.nodes.map(n => [n.id, n]));
  const up = (field, value) => onUpdateNode({ ...node, [field]: value });

  const handleDraftPrompt = async () => {
    if (!apiKey.trim()) { setDraftErr('Add your API key in the top bar first.'); return; }
    setDraftLoading(true); setDraftErr(''); setDraftPreview('');
    try {
      const drafted = await callDraftSystemPrompt(apiKey, node, graph);
      setDraftPreview(drafted);
    } catch (err) {
      setDraftErr('Draft failed: ' + err.message);
    } finally {
      setDraftLoading(false);
    }
  };

  const handleInferSchemas = async () => {
    if (!apiKey.trim()) { setInferErr('Add your API key in the top bar first.'); return; }
    setInferLoading(true); setInferErr('');
    try {
      const schemas = await callInferSchemas(apiKey, node);
      onUpdateNode({
        ...node,
        inputSchema:  schemas.inputSchema  || node.inputSchema,
        outputSchema: schemas.outputSchema || node.outputSchema,
      });
      toast('Schemas inferred', 'success');
    } catch (err) {
      setInferErr('Inference failed: ' + err.message);
    } finally {
      setInferLoading(false);
    }
  };

  const applyDraft = () => {
    up('systemPrompt', draftPreview);
    setDraftPreview('');
    toast('System prompt applied', 'success');
  };

  const handleToggleSkill = (skillId) => {
    if (!node) return;
    const active = new Set(node.skills || []);
    if (active.has(skillId)) {
      active.delete(skillId);
      onUpdateNode({ ...node, skills: [...active] });
    } else {
      active.add(skillId);
      const skill = getSkillById(skillId);
      const patch = { ...node, skills: [...active] };
      // Stamp system prompt only if it is currently empty
      if (!node.systemPrompt?.trim() && skill?.systemPromptTemplate) {
        onUpdateNode({ ...patch, systemPrompt: skill.systemPromptTemplate });
      } else {
        onUpdateNode(patch);
      }
    }
  };

  const handleRefine = async () => {
    if (!refineText.trim() || !apiKey.trim()) return;
    setRefining(true);
    setRefineErr('');
    try {
      const messages = [{
        role: 'user',
        content: `Here is the current agent orchestration graph:\n${JSON.stringify(graph, null, 2)}\n\nRefine instruction: ${refineText}\n\nReturn the complete updated graph JSON.`,
      }];
      const text    = await callArchitect(apiKey, messages);
      const updated = parseGraph(text);
      onUpdateGraph(updated);
      setRefineText('');
      toast('Graph refined', 'success');
    } catch (err) {
      const msg = err instanceof SyntaxError || err.message.includes('JSON') || err.message.includes('parse')
        ? 'Architect returned invalid response — try again'
        : err.message;
      setRefineErr(msg);
    } finally {
      setRefining(false);
    }
  };

  if (!node) {
    return (
      <div className="viewport-editor">
        <div className="vp-empty">Click any node to inspect<br />and edit its properties</div>
      </div>
    );
  }

  const s = NODE_STYLES[node.type] || NODE_STYLES.agent;
  const connections = graph.edges.filter(e => e.from === node.id || e.to === node.id);
  const tip = (key) => <HelpTip text={HELP[key]} prefs={prefs} />;

  return (
    <div className="viewport-editor">
      <div className="vp-header">
        <div className="vp-header-dot" style={{ background: s.border }} />
        <span className="vp-header-name">{node.name}</span>
        <span className="vp-header-type">{node.type}</span>
        <button className="vp-delete-btn" onClick={() => onDeleteNode(node.id)} title="Delete node (Del)">🗑</button>
      </div>
      <div className="vp-body">
        <div className="field-group">
          <label className="field-label">Name {tip('name')}</label>
          <input className="field-input" value={node.name || ''} onChange={e => up('name', e.target.value)} />
        </div>
        <div className="field-group">
          <label className="field-label">Node Type</label>
          <select
            className="field-select"
            value={node.type || 'agent'}
            onChange={e => onUpdateNode({ ...node, type: e.target.value })}
          >
            <option value="orchestrator">Orchestrator</option>
            <option value="agent">Agent</option>
            <option value="tool">Tool</option>
            <option value="memory">Memory</option>
            <option value="router">Router</option>
            <option value="evaluator">Evaluator</option>
            <option value="human-in-loop">Human-in-Loop</option>
            <option value="infranodus">InfraNodus</option>
            <option value="output">Output</option>
          </select>
        </div>
        <div className="field-group">
          <label className="field-label">Role Description {tip('role')}</label>
          <input className="field-input" value={node.role || ''} onChange={e => up('role', e.target.value)} />
        </div>
        {(node.type === 'orchestrator' || node.type === 'agent') && (
          <div className="field-group">
            <div className="field-label-row">
              <label className="field-label">System Prompt {tip('systemPrompt')}</label>
              <button
                className="draft-btn"
                onClick={handleDraftPrompt}
                disabled={draftLoading || !apiKey.trim()}
                title={node.systemPrompt?.trim() ? 'Improve with AI' : 'Draft with AI'}
              >
                {draftLoading ? <span className="draft-spinner" /> : '✦'}
                {draftLoading ? 'Drafting…' : node.systemPrompt?.trim() ? 'Improve' : 'Draft'}
              </button>
            </div>
            <textarea
              className="field-textarea"
              value={node.systemPrompt || ''}
              rows={6}
              onChange={e => { up('systemPrompt', e.target.value); setDraftPreview(''); }}
            />
            {draftErr && <div className="error-msg" style={{ marginTop: 4 }}>{draftErr}</div>}
            {draftPreview && (
              <div className="draft-preview">
                <div className="draft-preview-label">✦ AI Draft — review before applying</div>
                <div className="draft-preview-text">{draftPreview}</div>
                <div className="draft-preview-actions">
                  <button className="draft-apply-btn" onClick={applyDraft}>Apply</button>
                  <button className="draft-discard-btn" onClick={() => setDraftPreview('')}>Discard</button>
                </div>
              </div>
            )}
          </div>
        )}
        {node.type === 'tool' && (
          <>
            <div className="field-group">
              <label className="field-label">Tool Type {tip('toolType')}</label>
              <select
                className="field-select"
                value={node.toolType || 'rest'}
                onChange={e => up('toolType', e.target.value)}
              >
                <option value="rest">REST API Call</option>
                <option value="bash">Bash Command</option>
                <option value="file_read">File Read</option>
                <option value="file_write">File Write</option>
                <option value="grep">Grep / Regex Search</option>
              </select>
            </div>

            {(node.toolType || 'rest') === 'rest' && (
              <div className="field-group">
                <label className="field-label">API Endpoint {tip('endpoint')}</label>
                <input
                  className="field-input"
                  value={node.toolRestUrl || node.endpoint || ''}
                  placeholder="GET https://api.example.com/resource"
                  onChange={e => up('toolRestUrl', e.target.value)}
                  style={{ fontFamily: 'Consolas, monospace', fontSize: 11 }}
                />
                <label className="field-label" style={{ marginTop: 6 }}>Request Body (optional)</label>
                <textarea
                  className="field-textarea"
                  rows={3}
                  value={node.toolRestBody || ''}
                  placeholder='{"query": "{{input}}"}'
                  onChange={e => up('toolRestBody', e.target.value)}
                  style={{ fontFamily: 'Consolas, monospace', fontSize: 11 }}
                />
              </div>
            )}

            {node.toolType === 'bash' && (
              <div className="field-group">
                <label className="field-label">Shell Command</label>
                <textarea
                  className="field-textarea"
                  rows={3}
                  value={node.toolBashCmd || ''}
                  placeholder="echo 'hello world'"
                  onChange={e => up('toolBashCmd', e.target.value)}
                  style={{ fontFamily: 'Consolas, monospace', fontSize: 11 }}
                />
                <div className="field-hint">Runs on the host machine via sh -c. Use with caution.</div>
              </div>
            )}

            {(node.toolType === 'file_read' || node.toolType === 'file_write' || node.toolType === 'grep') && (
              <div className="field-group">
                <label className="field-label">File Path</label>
                <input
                  className="field-input"
                  value={node.toolFilePath || ''}
                  placeholder="/path/to/file.txt"
                  onChange={e => up('toolFilePath', e.target.value)}
                  style={{ fontFamily: 'Consolas, monospace', fontSize: 11 }}
                />
              </div>
            )}

            {node.toolType === 'grep' && (
              <div className="field-group">
                <label className="field-label">Grep Pattern (regex)</label>
                <input
                  className="field-input"
                  value={node.toolGrepPattern || ''}
                  placeholder="error|warn"
                  onChange={e => up('toolGrepPattern', e.target.value)}
                  style={{ fontFamily: 'Consolas, monospace', fontSize: 11 }}
                />
              </div>
            )}
          </>
        )}
        {node.type === 'memory' && (
          <>
            <div className="field-group">
              <label className="field-label">Memory Type {tip('memoryType')}</label>
              <select className="field-select" value={node.memoryType || 'working'} onChange={e => up('memoryType', e.target.value)}>
                <option value="working">Working</option>
                <option value="queue">Queue</option>
                <option value="long-term">Long-term</option>
              </select>
            </div>
            <div className="field-group">
              <label className="field-label">Access Mode {tip('accessMode')}</label>
              <select className="field-select" value={node.accessMode || 'read-write'} onChange={e => up('accessMode', e.target.value)}>
                <option value="read">Read</option>
                <option value="write">Write</option>
                <option value="read-write">Read-Write</option>
              </select>
            </div>
            {/* ── Memory Backend ───────────────────────────────── */}
            <div className="field-group">
              <label className="field-label">Memory Backend {tip('memoryBackend')}</label>
              <select className="field-select" value={node.memoryBackend || 'local'} onChange={e => up('memoryBackend', e.target.value)}>
                <option value="local">Local (pass-through)</option>
                <option value="letta">Letta (persistent)</option>
              </select>
            </div>
            {/* ── Letta config — shown only when backend = letta ── */}
            {(node.memoryBackend || 'local') === 'letta' && (
              <div className="letta-config-section">
                <div className="letta-config-label">Letta Configuration</div>

                <div className="field-group">
                  <label className="field-label">Letta API URL {tip('lettaApiUrl')}</label>
                  <input
                    className="field-input"
                    value={node.lettaApiUrl || ''}
                    placeholder="http://localhost:8283"
                    onChange={e => up('lettaApiUrl', e.target.value)}
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Letta API Key {tip('lettaApiKey')}</label>
                  <input
                    className="field-input"
                    type="password"
                    value={node.lettaApiKey || ''}
                    placeholder="Bearer token (leave blank for local)"
                    onChange={e => up('lettaApiKey', e.target.value)}
                  />
                  {node.lettaApiKey && (
                    <div className="llm-key-warning">⚠ Included in JSON exports — treat as sensitive</div>
                  )}
                </div>

                <div className="field-group">
                  <label className="field-label">Letta Agent ID {tip('lettaAgentId')}</label>
                  <input
                    className="field-input"
                    value={node.lettaAgentId || ''}
                    placeholder="agent-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    onChange={e => up('lettaAgentId', e.target.value)}
                    style={{ fontFamily: 'Consolas, monospace', fontSize: 11 }}
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Memory Mode {tip('lettaMemoryMode')}</label>
                  <select
                    className="field-select"
                    value={node.lettaMemoryMode || 'archival'}
                    onChange={e => up('lettaMemoryMode', e.target.value)}
                  >
                    <option value="archival">Archival (vector search)</option>
                    <option value="core-block">Core Block (in-context)</option>
                  </select>
                </div>

                {(node.lettaMemoryMode || 'archival') === 'core-block' && (
                  <div className="field-group">
                    <label className="field-label">Block Name {tip('lettaBlockName')}</label>
                    <input
                      className="field-input"
                      value={node.lettaBlockName || ''}
                      placeholder="pipeline-context"
                      onChange={e => up('lettaBlockName', e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}
        {/* ── Router ─────────────────────────────────────────── */}
        {node.type === 'router' && (
          <>
            <div className="field-group">
              <label className="field-label">Routing Mode {tip('routerMode')}</label>
              <select className="field-select" value={node.routerMode || 'llm'} onChange={e => up('routerMode', e.target.value)}>
                <option value="llm">LLM Decision</option>
                <option value="keyword">Keyword Match</option>
                <option value="rules">Explicit Rules</option>
              </select>
            </div>
            <div className="field-group">
              <label className="field-label">Routes {tip('routerRoutes')}</label>
              <textarea
                className="field-textarea"
                rows={4}
                value={node.routerRoutesText || ''}
                placeholder={'urgent → High-priority items requiring immediate action\nnormal → Standard processing path\narchive → Low-value items for long-term storage'}
                onChange={e => {
                  const text = e.target.value;
                  const routes = {};
                  text.split('\n').forEach(line => {
                    const [label, ...rest] = line.split('→');
                    if (label?.trim()) routes[label.trim()] = (rest.join('→') || '').trim();
                  });
                  onUpdateNode({ ...node, routerRoutesText: text, routes });
                }}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Default Route {tip('routerDefault')}</label>
              <input className="field-input" value={node.routerDefault || ''} placeholder="e.g. normal" onChange={e => up('routerDefault', e.target.value)} />
            </div>
          </>
        )}

        {/* ── Evaluator ───────────────────────────────────────── */}
        {node.type === 'evaluator' && (
          <>
            <div className="field-group">
              <label className="field-label">Evaluation Criteria {tip('evaluatorCriteria')}</label>
              <textarea
                className="field-textarea"
                rows={5}
                value={node.evaluatorCriteria || ''}
                placeholder={'Accuracy: Is the information factually correct?\nClarity: Is the response easy to understand?\nCompleteness: Does it fully address the question?'}
                onChange={e => up('evaluatorCriteria', e.target.value)}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Scoring Method {tip('evaluatorScoring')}</label>
              <select className="field-select" value={node.evaluatorScoring || 'pass-fail'} onChange={e => up('evaluatorScoring', e.target.value)}>
                <option value="pass-fail">Pass / Fail</option>
                <option value="score-1-10">Score 1–10</option>
                <option value="rank">Rank</option>
              </select>
            </div>
            {node.evaluatorScoring === 'score-1-10' && (
              <div className="field-group">
                <label className="field-label">Pass Threshold {tip('evaluatorThreshold')}</label>
                <input
                  className="field-input"
                  type="number" min="1" max="10"
                  value={node.evaluatorThreshold ?? 7}
                  onChange={e => up('evaluatorThreshold', Number(e.target.value))}
                  style={{ width: 80 }}
                />
              </div>
            )}
          </>
        )}

        {/* ── Human-in-Loop ────────────────────────────────────── */}
        {node.type === 'human-in-loop' && (
          <>
            <div className="field-group">
              <label className="field-label">Review Instructions {tip('humanPrompt')}</label>
              <textarea
                className="field-textarea"
                rows={4}
                value={node.humanPrompt || ''}
                placeholder="Describe what the reviewer should check and what decision they need to make…"
                onChange={e => up('humanPrompt', e.target.value)}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Timeout (minutes) {tip('humanTimeout')}</label>
              <input
                className="field-input"
                type="number" min="0"
                value={node.humanTimeout ?? 0}
                onChange={e => up('humanTimeout', Number(e.target.value))}
                style={{ width: 100 }}
              />
              <div className="field-hint">0 = wait indefinitely</div>
            </div>
            <div className="field-group">
              <label className="field-label">On Timeout {tip('humanOnTimeout')}</label>
              <select className="field-select" value={node.humanOnTimeout || 'escalate'} onChange={e => up('humanOnTimeout', e.target.value)}>
                <option value="escalate">Escalate to next reviewer</option>
                <option value="auto-approve">Auto-approve</option>
                <option value="auto-reject">Auto-reject</option>
              </select>
            </div>
            <div className="field-group">
              <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!node.humanBypass}
                  onChange={e => up('humanBypass', e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                Bypass Review (auto-approve during runs)
              </label>
              <div className="field-hint">Enable during testing to skip this checkpoint without stopping the pipeline.</div>
            </div>
          </>
        )}

        {/* ── InfraNodus ───────────────────────────────────────── */}
        {node.type === 'infranodus' && (
          <>
            <div className="field-group">
              <label className="field-label">API Key {tip('infranodusKey')}</label>
              <input
                className="field-input"
                type="password"
                value={node.infranodusApiKey || ''}
                placeholder="InfraNodus API key"
                onChange={e => up('infranodusApiKey', e.target.value)}
              />
              <div className="llm-key-warning">⚠ Included in JSON exports — treat as sensitive.</div>
            </div>
            <div className="field-group">
              <label className="field-label">Operation {tip('infranodusOp')}</label>
              <select className="field-select" value={node.infranodusOperation || DEFAULT_INFRANODUS_OP} onChange={e => up('infranodusOperation', e.target.value)}>
                {INFRANODUS_OPS.map(op => (
                  <option key={op.id} value={op.id}>{op.icon} {op.label}</option>
                ))}
              </select>
              {(() => {
                const op = INFRANODUS_OPS.find(o => o.id === (node.infranodusOperation || DEFAULT_INFRANODUS_OP));
                return op ? <div className="llm-provider-note">{op.description}</div> : null;
              })()}
            </div>
            <div className="field-group">
              <label className="field-label">Graph Name {tip('infranodusGraph')}</label>
              <input
                className="field-input"
                value={node.infranodusGraphName || ''}
                placeholder="e.g. my-research (leave blank for temp)"
                onChange={e => up('infranodusGraphName', e.target.value)}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Privacy Mode {tip('infranodusPrivacy')}</label>
              <div className="toggle-group">
                <button
                  className={`toggle-btn ${!node.infranodusPrivacy ? 'active' : ''}`}
                  onClick={() => up('infranodusPrivacy', false)}>Save to graph</button>
                <button
                  className={`toggle-btn ${node.infranodusPrivacy ? 'active' : ''}`}
                  onClick={() => up('infranodusPrivacy', true)}>Don't save</button>
              </div>
            </div>
          </>
        )}

        {/* ── Output ──────────────────────────────────────────── */}
        {node.type === 'output' && (
          <>
            <div className="field-group">
              <label className="field-label">Template {tip('outputTemplate')}</label>
              <select
                className="field-select"
                value={node.outputTemplate || DEFAULT_OUTPUT_TEMPLATE}
                onChange={e => up('outputTemplate', e.target.value)}
              >
                {OUTPUT_TEMPLATES.map(t => (
                  <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                ))}
              </select>
              {(() => {
                const tpl = OUTPUT_TEMPLATES.find(t => t.id === (node.outputTemplate || DEFAULT_OUTPUT_TEMPLATE));
                return tpl ? <div className="llm-provider-note">{tpl.description}</div> : null;
              })()}
            </div>
            <div className="field-group">
              <label className="field-label">Design {tip('outputDesign')}</label>
              <select
                className="field-select"
                value={node.outputDesign || DEFAULT_OUTPUT_DESIGN}
                onChange={e => up('outputDesign', e.target.value)}
              >
                {OUTPUT_DESIGNS.map(d => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
              {(() => {
                const des = OUTPUT_DESIGNS.find(d => d.id === (node.outputDesign || DEFAULT_OUTPUT_DESIGN));
                return des ? <div className="llm-provider-note">{des.description}</div> : null;
              })()}
            </div>
            <div className="field-group">
              <label className="field-label">Options</label>
              <div className="output-options-row">
                <label className="output-option-label">
                  <input
                    type="checkbox"
                    checked={node.outputShowViz !== false}
                    onChange={e => up('outputShowViz', e.target.checked)}
                  />
                  <span>Auto-embed viz {tip('outputShowViz')}</span>
                </label>
                <label className="output-option-label">
                  <input
                    type="checkbox"
                    checked={node.outputShowRawToggle !== false}
                    onChange={e => up('outputShowRawToggle', e.target.checked)}
                  />
                  <span>Show raw toggle {tip('outputShowRaw')}</span>
                </label>
              </div>
            </div>
            {(node.outputTemplate || DEFAULT_OUTPUT_TEMPLATE) === 'custom' && (
              <div className="field-group">
                <label className="field-label">Custom Sections {tip('outputCustom')}</label>
                <OutputCustomSections
                  sections={node.outputCustomSections || []}
                  onChange={s => up('outputCustomSections', s)}
                />
              </div>
            )}
          </>
        )}

        {(node.type === 'orchestrator' || node.type === 'agent') && (
          <div className="field-group llm-section">
            <label className="field-label">LLM Provider {tip('llmProvider')}</label>
            <select
              className="field-select"
              value={node.llmProvider || DEFAULT_PROVIDER}
              onChange={e => up('llmProvider', e.target.value)}
            >
              {LLM_PROVIDERS.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
            {(() => {
              const prov = getProvider(node.llmProvider || DEFAULT_PROVIDER);
              return (
                <>
                  <label className="field-label" style={{ marginTop: 6 }}>Model {tip('llmModel')}</label>
                  <select
                    className="field-select"
                    value={node.llmModel || DEFAULT_MODEL}
                    onChange={e => up('llmModel', e.target.value)}
                  >
                    {prov.models.map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                  {prov.requiresKey && (
                    <>
                      <label className="field-label" style={{ marginTop: 6 }}>API Key {tip('llmApiKey')}</label>
                      <input
                        className="field-input"
                        type="password"
                        value={node.llmApiKey || ''}
                        placeholder={`${prov.label} API key`}
                        onChange={e => up('llmApiKey', e.target.value)}
                      />
                      <div className="llm-key-warning">⚠ Included in JSON exports — treat as sensitive.</div>
                    </>
                  )}
                  {prov.requiresUrl && (
                    <>
                      <label className="field-label" style={{ marginTop: 6 }}>Ollama URL {tip('llmOllamaUrl')}</label>
                      <input
                        className="field-input"
                        value={node.llmOllamaUrl || DEFAULT_OLLAMA_URL}
                        placeholder="http://localhost:11434"
                        onChange={e => up('llmOllamaUrl', e.target.value)}
                      />
                    </>
                  )}
                  {prov.note && <div className="llm-provider-note">{prov.note}</div>}
                </>
              );
            })()}
          </div>
        )}
        {['orchestrator', 'agent', 'router', 'evaluator', 'human-in-loop', 'infranodus'].includes(node.type) && (
          <NodeSkillPicker
            node={node}
            onToggle={handleToggleSkill}
            tip={tip}
          />
        )}
        <div className="field-group">
          <div className="field-label-row">
            <label className="field-label">Input Schema {tip('inputSchema')}</label>
            {(node.type === 'orchestrator' || node.type === 'agent') && (
              <button
                className="draft-btn"
                onClick={handleInferSchemas}
                disabled={inferLoading || !apiKey.trim()}
                title="Infer input and output schemas with AI"
              >
                {inferLoading ? <span className="draft-spinner" /> : '✦'}
                {inferLoading ? 'Inferring…' : 'Infer'}
              </button>
            )}
          </div>
          {inferErr && <div className="error-msg" style={{ marginTop: 2, marginBottom: 4 }}>{inferErr}</div>}
          <SchemaEditor schema={node.inputSchema || {}} onChange={s => up('inputSchema', s)} />
        </div>
        <div className="field-group">
          <label className="field-label">Output Schema {tip('outputSchema')}</label>
          <SchemaEditor schema={node.outputSchema || {}} onChange={s => up('outputSchema', s)} />
        </div>
        <DataSourceEditor
          node={node}
          onChange={sources => up('dataSources', sources)}
          prefs={prefs}
        />
        <SharedMemoryEditor
          node={node}
          tip={tip}
          onChange={({ reads, writes }) => onUpdateNode({
            ...node,
            sharedMemoryReads:  reads,
            sharedMemoryWrites: writes,
          })}
        />
        {connections.length > 0 && (
          <div className="field-group">
            <label className="field-label">Connections</label>
            <div className="connected-list">
              {connections.map(edge => {
                const outgoing = edge.from === node.id;
                const other    = nodeMap[outgoing ? edge.to : edge.from];
                return (
                  <div key={edge.id} className="connected-item">
                    <span className="connected-dir">{outgoing ? '→' : '←'}</span>
                    <span className="connected-name">{other?.name || '?'}</span>
                    {edge.label && <span className="connected-edge-label">· {edge.label}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div className="vp-refine">
        <label className="field-label">Refine Instruction {tip('refine')}</label>
        <textarea value={refineText} onChange={e => setRefineText(e.target.value)} placeholder="e.g. Add a caching layer, split this agent into two…" />
        {refineErr && <div className="error-msg">{refineErr}</div>}
        <button className="btn-refine" onClick={handleRefine} disabled={!refineText.trim() || !apiKey.trim() || refining || generating}>
          {refining ? 'Refining…' : 'Refine with Architect'}
        </button>
      </div>
    </div>
  );
}
