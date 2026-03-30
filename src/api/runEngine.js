/**
 * Thin wrappers around Tauri IPC for the execution engine.
 * Falls back gracefully (no-op) when outside Tauri.
 */

async function tauriInvoke(cmd, args) {
  if (!window.__TAURI_INTERNALS__) {
    throw new Error('Execution requires the Tauri runtime — run npm run dev');
  }
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke(cmd, args);
}

async function tauriListen(event, handler) {
  try {
    const { listen } = await import('@tauri-apps/api/event');
    return listen(event, e => handler(e.payload));
  } catch {
    return () => {}; // no-op unlisten when outside Tauri
  }
}

/**
 * Start a graph run. Returns the run_id immediately;
 * subscribe to events BEFORE calling this.
 */
export async function startRun(graph, apiKey, initialPrompt) {
  return tauriInvoke('run_graph', { graph, apiKey, initialPrompt });
}

export function onNodeStart(handler)     { return tauriListen('run:node-start',  handler); }
export function onNodeDone(handler)      { return tauriListen('run:node-done',   handler); }
export function onNodeError(handler)     { return tauriListen('run:node-error',  handler); }
export function onNodeToken(handler)     { return tauriListen('run:node-token',  handler); }
export function onRunComplete(handler)   { return tauriListen('run:complete',    handler); }
export function onRunCancelled(handler)  { return tauriListen('run:cancelled',   handler); }

export async function cancelRun(runId) {
  return tauriInvoke('cancel_run', { runId });
}

/**
 * Send an approve/reject decision for a pending human-in-loop review.
 * @param {string} runId
 * @param {string} nodeId
 * @param {boolean} approved
 * @param {string} feedback
 */
export async function respondHumanReview(runId, nodeId, approved, feedback = '') {
  return tauriInvoke('respond_human_review', { run_id: runId, node_id: nodeId, approved, feedback });
}

export function onHumanReview(handler) { return tauriListen('run:human-review', handler); }
