/**
 * GitHub Gist API helpers.
 * All network calls go through the Tauri Rust backend to avoid CORS issues
 * and keep the token off the renderer process network tab.
 */
import { invoke } from '@tauri-apps/api/core';

const GIST_FILENAME = 'orchestration-canvas.json';
const GIST_DESCRIPTION = 'Orchestration Canvas – saved graph';

/**
 * Save graph + brief as a GitHub Gist.
 * @param {string} token  — GitHub personal access token (gist scope)
 * @param {object} graph
 * @param {string} brief
 * @param {boolean} isPublic — whether the gist should be public
 * @returns {Promise<{ id: string, url: string }>}
 */
export async function saveGist(token, graph, brief, isPublic = false) {
  const payload = JSON.stringify(
    { version: 1, graph, brief, savedAt: new Date().toISOString() },
    null,
    2,
  );
  const result = await invoke('create_gist', {
    token,
    description: GIST_DESCRIPTION,
    filename: GIST_FILENAME,
    content: payload,
    public: isPublic,
  });
  // result is { id, html_url }
  return { id: result.id, url: result.html_url };
}

/**
 * Load a graph from a GitHub Gist by ID.
 * @param {string} token  — GitHub token (may be empty for public gists)
 * @param {string} gistId
 * @returns {Promise<{ graph: object, brief: string }>}
 */
export async function loadGist(token, gistId) {
  const raw = await invoke('load_gist', { token, gist_id: gistId });
  const parsed = JSON.parse(raw);
  return {
    graph: parsed.graph || { nodes: [], edges: [] },
    brief: parsed.brief || '',
  };
}
