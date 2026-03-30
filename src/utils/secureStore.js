/**
 * Secure key/value store backed by tauri-plugin-store (encrypted, in app data dir).
 * Falls back to localStorage when running outside Tauri (e.g. `npm run dev:frontend`).
 */

let _store = null;
let _storeReady = false;
const STORE_FILE = 'oc_secure.json';

async function getStore() {
  if (_storeReady) return _store;
  try {
    const { load } = await import('@tauri-apps/plugin-store');
    _store = await load(STORE_FILE, { autoSave: true });
  } catch {
    _store = null; // Tauri not available — fall back to localStorage
  }
  _storeReady = true;
  return _store;
}

export async function secureGet(key) {
  const store = await getStore();
  if (store) {
    const val = await store.get(key);
    return val ?? null;
  }
  return localStorage.getItem(key);
}

export async function secureSet(key, value) {
  const store = await getStore();
  if (store) {
    await store.set(key, value);
  } else {
    if (value) {
      localStorage.setItem(key, value);
    } else {
      localStorage.removeItem(key);
    }
  }
}
