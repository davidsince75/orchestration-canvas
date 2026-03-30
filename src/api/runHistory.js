/**
 * SQL queries for run history. Reuses the shared getDb singleton from db.js.
 */
import { getDb } from '../utils/db.js';

export async function loadRuns() {
  const db = await getDb();
  if (!db) return [];
  return db.select(
    'SELECT id, created_at, status, graph_snapshot, initial_prompt FROM runs ORDER BY created_at DESC LIMIT 50'
  );
}

export async function loadRunNodes(runId) {
  const db = await getDb();
  if (!db) return [];
  return db.select(
    'SELECT node_id, status, output, error, started_at, finished_at FROM run_nodes WHERE run_id = $1 ORDER BY rowid',
    [runId]
  );
}

export async function clearHistory() {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('clear_run_history');
  } catch {
    throw new Error('Requires Tauri runtime');
  }
}
