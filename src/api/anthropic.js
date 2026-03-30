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
import { ARCHITECT_SYSTEM_PROMPT, ARCHITECT_ANALYSIS_PROMPT, ARCHITECT_FIX_PROMPT } from '../data/systemPrompts.js';

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

export function parseGraph(text) {
  const cleaned    = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr    = fenceMatch ? fenceMatch[1].trim() : cleaned;
  return JSON.parse(jsonStr);
}
