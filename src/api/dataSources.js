/**
 * Tauri IPC helpers for data source file/folder picking.
 * Gracefully no-ops outside the Tauri runtime.
 */

async function tauriInvoke(cmd, args) {
  if (!window.__TAURI_INTERNALS__) return null;
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke(cmd, args);
}

/** Open a native file picker. Returns the selected path string, or null if cancelled. */
export async function pickFilePath() {
  return tauriInvoke('pick_file_path');
}

/** Open a native folder picker. Returns the selected path string, or null if cancelled. */
export async function pickFolderPath() {
  return tauriInvoke('pick_folder_path');
}
