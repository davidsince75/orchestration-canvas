/**
 * Persistent key-value store backed by SQLite via tauri-plugin-sql.
 * Falls back to localStorage when running outside Tauri.
 */

const DB_PATH = 'sqlite:orchestration.db';
const INIT_SQL = `
  CREATE TABLE IF NOT EXISTS kv_store (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`;

let _db = null;
let _dbReady = false;

export async function getDb() {
  if (_dbReady) return _db;
  try {
    const { default: Database } = await import('@tauri-apps/plugin-sql');
    _db = await Database.load(DB_PATH);
    await _db.execute(INIT_SQL);
  } catch {
    _db = null; // Tauri not available — fall back to localStorage
  }
  _dbReady = true;
  return _db;
}

export async function dbGet(key) {
  const db = await getDb();
  if (db) {
    const rows = await db.select('SELECT value FROM kv_store WHERE key = $1', [key]);
    return rows[0]?.value ?? null;
  }
  return localStorage.getItem(key);
}

export async function dbSet(key, value) {
  const db = await getDb();
  if (db) {
    await db.execute(
      'INSERT OR REPLACE INTO kv_store (key, value) VALUES ($1, $2)',
      [key, value]
    );
  } else {
    localStorage.setItem(key, value);
  }
}

export async function dbDel(key) {
  const db = await getDb();
  if (db) {
    await db.execute('DELETE FROM kv_store WHERE key = $1', [key]);
  } else {
    localStorage.removeItem(key);
  }
}
