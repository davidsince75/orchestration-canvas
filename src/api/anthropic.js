/**
 * Anthropic API calls — routed through Rust (call_architect Tauri command)
 * so the API key never appears in browser network traffic.
 *
 * PHASE 3A: Both callArchitect and callArchitectAnalysis now use
 * tauriInvoke('call_architect') instead of direct fetch with the
 * dangerous-direct-browser-access header.
 *
 * TODO Phase 3: node execution already goes through run_graph in Rust.
 * Architect calls are now also through Rust. No CORS workaround remains.
 */
import { ARCHITECT_SYSTEM_PROMPT, ARCHITECT_ANALYSIS_PROMPT, ARCHITECT_FIX_PROMPT, ARCHITECT_GENERATE_PROMPT, DRAFT_SYSTEM_PROMPT_PROMPT, SUGGEST_RUN_INPUT_PROMPT, INFER_SCHEMAS_PROMPT } from '../data/systemPrompts.js';

async function tauriInvoke(cmd, args) {
  if (!window.__TAURI_INTERNALS__) {
    throw new Error('Architect requires the Tauri runtime — run npm run dev');
  }
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke(cmd, args);
}

export async function callArchitect(apiKey, messages) {
  return tauriInvoke('call_architect', {
    req: {
      model:        'claude-sonnet-4-20250514',
      maxTokens:    4096,
      systemPrompt: ARCHITECT_SYSTEM_PROMPT,
      messages,
      apiKey,
    },
  });
}

export async function callArchitectAnalysis(apiKey, graph, diagnostics) {
  const summary = {
    nodes: graph.nodes.map(n => ({
      id: n.id, type: n.type, name: n.name,
      role: (n.role || '').slice(0, 80),
      hasSystemPrompt: !!(n.systemPrompt && n.systemPrompt.trim()),
    })),
    edges: graph.edges.map(e => ({ from: e.from, to: e.to, label: e.label })),
    diagnostics: diagnostics.map(d => d.message),
  };

  const raw = await tauriInvoke('call_architect', {
    req: {
      model:        'claude-sonnet-4-6',
      maxTokens:    1200,
      systemPrompt: ARCHITECT_ANALYSIS_PROMPT,
      messages:     [{ role: 'user', content: JSON.stringify(summary, null, 2) }],
      apiKey,
    },
  });

  const text  = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return JSON.parse(fence ? fence[1] : text);
}

export async function callArchitectFix(apiKey, graph, diagnostics) {
  const summary = {
    nodes: graph.nodes.map(n => ({
      id: n.id, type: n.type, name: n.name,
      role: (n.role || '').slice(0, 80),
      hasSystemPrompt: !!(n.systemPrompt && n.systemPrompt.trim()),
      hasInputSchema:  Object.keys(n.inputSchema  || {}).length > 0,
      hasOutputSchema: Object.keys(n.outputSchema || {}).length > 0,
    })),
    edges: graph.edges.map(e => ({ id: e.id, from: e.from, to: e.to, label: e.label })),
    issues: diagnostics.map(d => ({ severity: d.severity, message: d.message, nodeIds: d.nodeIds || [] })),
  };

  const raw = await tauriInvoke('call_architect', {
    req: {
      model:        'claude-sonnet-4-6',
      maxTokens:    2000,
      systemPrompt: ARCHITECT_FIX_PROMPT,
      messages:     [{ role: 'user', content: JSON.stringify(summary, null, 2) }],
      apiKey,
    },
  });

  const text  = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return JSON.parse(fence ? fence[1] : text);
}

export async function callInferSchemas(apiKey, node) {
  const ctx = {
    type:         node.type,
    name:         node.name,
    role:         node.role         || '',
    systemPrompt: (node.systemPrompt || '').slice(0, 400),
  };

  const raw = await tauriInvoke('call_architect', {
    req: {
      model:        'claude-haiku-4-5',
      maxTokens:    400,
      systemPrompt: INFER_SCHEMAS_PROMPT,
      messages:     [{ role: 'user', content: JSON.stringify(ctx, null, 2) }],
      apiKey,
    },
  });

  const text  = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return JSON.parse(fence ? fence[1] : text);
}

export async function callSuggestRunInput(apiKey, graph) {
  const pipeline = {
    nodes: graph.nodes.map(n => ({
      type: n.type,
      name: n.name,
      role: (n.role || '').slice(0, 120),
      systemPromptSnippet: (n.systemPrompt || '').slice(0, 200),
    })),
  };

  const raw = await tauriInvoke('call_architect', {
    req: {
      model:        'claude-haiku-4-5',
      maxTokens:    300,
      systemPrompt: SUGGEST_RUN_INPUT_PROMPT,
      messages:     [{ role: 'user', content: JSON.stringify(pipeline, null, 2) }],
      apiKey,
    },
  });

  return raw.trim();
}

export async function callDraftSystemPrompt(apiKey, node, graph) {
  // Build a minimal context object — just enough for Claude to write a great prompt
  const nodeMap = Object.fromEntries(graph.nodes.map(n => [n.id, n]));
  const incoming = graph.edges
    .filter(e => e.to === node.id)
    .map(e => ({ name: nodeMap[e.from]?.name || e.from, role: nodeMap[e.from]?.role || '', label: e.label || '' }));
  const outgoing = graph.edges
    .filter(e => e.from === node.id)
    .map(e => ({ name: nodeMap[e.to]?.name || e.to, role: nodeMap[e.to]?.role || '', label: e.label || '' }));

  const ctx = {
    node: {
      type:         node.type,
      name:         node.name,
      role:         node.role || '',
      existingPrompt: (node.systemPrompt || '').trim(),
    },
    pipelineSize: graph.nodes.length,
    incoming,
    outgoing,
  };

  const instruction = ctx.node.existingPrompt
    ? `Improve and expand the existing system prompt for this node. Keep what is good, make it more specific, detailed, and production-ready.\n\n${JSON.stringify(ctx, null, 2)}`
    : `Write a new system prompt for this node from scratch based on its role and pipeline context.\n\n${JSON.stringify(ctx, null, 2)}`;

  const raw = await tauriInvoke('call_architect', {
    req: {
      model:        'claude-sonnet-4-6',
      maxTokens:    600,
      systemPrompt: DRAFT_SYSTEM_PROMPT_PROMPT,
      messages:     [{ role: 'user', content: instruction }],
      apiKey,
    },
  });

  return raw.trim();
}

export async function callArchitectGenerate(apiKey, description) {
  const raw = await tauriInvoke('call_architect', {
    req: {
      model:        'claude-sonnet-4-6',
      maxTokens:    8192,
      systemPrompt: ARCHITECT_GENERATE_PROMPT,
      messages:     [{ role: 'user', content: description.trim() }],
      apiKey,
    },
  });

  const text  = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  let parsed;
  try {
    parsed = JSON.parse(fence ? fence[1] : text);
  } catch (e) {
    if (e.message?.includes('Unterminated') || e.message?.includes('Unexpected end')) {
      throw new Error('The pipeline was too large to generate in one response. Try a simpler description with fewer nodes, or break it into smaller parts.');
    }
    throw new Error('Generation failed: ' + e.message);
  }

  // Normalise: ensure every node has required fields with safe defaults
  parsed.nodes = (parsed.nodes || []).map((n, idx) => ({
    id:           n.id           || `node_${idx}`,
    type:         n.type         || 'agent',
    name:         n.name         || `Node ${idx + 1}`,
    role:         n.role         || '',
    systemPrompt: n.systemPrompt || '',
    inputSchema:  n.inputSchema  || {},
    outputSchema: n.outputSchema || {},
    position:     n.position     || { x: 100 + idx * 240, y: 300 },
  }));

  parsed.edges = (parsed.edges || []).map((e, idx) => ({
    id:    e.id    || `e_${idx}`,
    from:  e.from  || '',
    to:    e.to    || '',
    label: e.label || '',
  })).filter(e => e.from && e.to);

  return parsed;
}

export function parseGraph(text) {
  const cleaned    = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr    = fenceMatch ? fenceMatch[1].trim() : cleaned;
  return JSON.parse(jsonStr);
}
