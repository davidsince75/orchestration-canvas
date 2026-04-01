use std::collections::{HashMap, HashSet, VecDeque};
use std::sync::Mutex;
use tauri::{Emitter, Manager};
use tauri_plugin_dialog::{DialogExt, FilePath};
use tokio::sync::{watch, oneshot};

mod streaming;
mod letta;

// ── Cancellation registry ─────────────────────────────────────────────────────

struct CancelRegistry(Mutex<HashMap<String, watch::Sender<bool>>>);

// ── Human-in-loop review registry ────────────────────────────────────────────

struct HumanReviewDecision {
    approved: bool,
    feedback: String,
}

/// Keyed by "{run_id}:{node_id}". Sender is consumed when the reviewer responds.
struct HumanReviewRegistry(Mutex<HashMap<String, oneshot::Sender<HumanReviewDecision>>>);

// ── Shared memory store ───────────────────────────────────────────────────────

/// App-level key/value store shared across nodes within a single run.
/// Cleared at the start of each run_graph invocation.
struct SharedMemoryStore(Mutex<HashMap<String, String>>);

// ── Payload types ─────────────────────────────────────────────────────────────

#[derive(serde::Deserialize)]
struct ArchitectRequest {
    model:         String,
    #[serde(rename = "maxTokens")]
    max_tokens:    u32,
    #[serde(rename = "systemPrompt")]
    system_prompt: String,
    messages:      Vec<serde_json::Value>,
    #[serde(rename = "apiKey")]
    api_key:       String,
}

#[derive(serde::Deserialize, Clone, Debug)]
struct GraphNode {
    id:            String,
    name:          String,
    /// Node type: orchestrator|agent|tool|memory|router|evaluator|human-in-loop|infranodus
    #[serde(rename = "type", default)]
    node_type:     String,
    #[serde(rename = "systemPrompt", default)]
    system_prompt: String,
    // ── LLM routing fields ────────────────────────────────────────────────────
    /// "claude-api" | "openai" | "gemini" | "mistral" | "ollama"
    #[serde(rename = "llmProvider", default)]
    llm_provider:  String,
    #[serde(rename = "llmModel", default)]
    llm_model:     String,
    /// Per-node API key for non-Claude providers
    #[serde(rename = "llmApiKey", default)]
    llm_api_key:   String,
    /// Ollama base URL
    #[serde(rename = "llmOllamaUrl", default)]
    llm_ollama_url: String,
    // ── Router fields ─────────────────────────────────────────────────────────
    #[serde(rename = "routerMode", default)]
    router_mode:    String,
    #[serde(rename = "routerDefault", default)]
    router_default: String,
    // ── Evaluator fields ──────────────────────────────────────────────────────
    #[serde(rename = "evaluatorCriteria", default)]
    evaluator_criteria: String,
    #[serde(rename = "evaluatorScoring", default)]
    evaluator_scoring:  String,
    #[serde(rename = "evaluatorThreshold", default)]
    evaluator_threshold: Option<u8>,
    // ── Human-in-loop fields ──────────────────────────────────────────────────
    #[serde(rename = "humanPrompt", default)]
    human_prompt:     String,
    #[serde(rename = "humanTimeout", default)]
    human_timeout:    u64,
    #[serde(rename = "humanOnTimeout", default)]
    human_on_timeout: String,
    // ── InfraNodus fields ─────────────────────────────────────────────────────
    #[serde(rename = "infranodusApiKey", default)]
    infranodus_api_key:   String,
    #[serde(rename = "infranodusOperation", default)]
    infranodus_operation: String,
    #[serde(rename = "infranodusGraphName", default)]
    infranodus_graph_name: String,
    #[serde(rename = "infranodusPrivacy", default)]
    infranodus_privacy: bool,
    // ── Memory node fields ────────────────────────────────────────────────────
    /// "working" | "long-term" | "queue"
    #[allow(dead_code)]
    #[serde(rename = "memoryType", default)]
    memory_type: String,
    /// "read" | "write" | "read-write"
    #[serde(rename = "accessMode", default)]
    access_mode: String,
    /// "local" (pass-through) | "letta"
    #[serde(rename = "memoryBackend", default)]
    memory_backend: String,
    // ── Letta fields ──────────────────────────────────────────────────────────
    #[serde(rename = "lettaApiUrl", default)]
    letta_api_url: String,
    #[serde(rename = "lettaApiKey", default)]
    letta_api_key: String,
    #[serde(rename = "lettaAgentId", default)]
    letta_agent_id: String,
    /// "archival" | "core-block"
    #[serde(rename = "lettaMemoryMode", default)]
    letta_memory_mode: String,
    #[serde(rename = "lettaBlockName", default)]
    letta_block_name: String,
    // ── Data sources ──────────────────────────────────────────────────────────
    #[serde(rename = "dataSources", default)]
    data_sources: Vec<DataSource>,
    // ── Tool node fields ──────────────────────────────────────────────────────
    /// Legacy REST endpoint field (kept for backwards compatibility)
    #[serde(default)]
    endpoint: String,
    /// "rest" | "bash" | "file_read" | "file_write" | "grep"
    #[serde(rename = "toolType", default)]
    tool_type: String,
    #[serde(rename = "toolRestUrl", default)]
    tool_rest_url: String,
    #[serde(rename = "toolRestBody", default)]
    tool_rest_body: String,
    #[serde(rename = "toolBashCmd", default)]
    tool_bash_cmd: String,
    #[serde(rename = "toolFilePath", default)]
    tool_file_path: String,
    #[serde(rename = "toolGrepPattern", default)]
    tool_grep_pattern: String,
    // ── Shared memory fields ──────────────────────────────────────────────────
    /// Keys to read from the shared memory store and inject into this node's context
    #[serde(rename = "sharedMemoryReads", default)]
    shared_memory_reads: Vec<String>,
    /// Keys to write this node's output into after it completes
    #[serde(rename = "sharedMemoryWrites", default)]
    shared_memory_writes: Vec<String>,
}

#[derive(serde::Deserialize, Clone, Debug, Default)]
struct DataSource {
    #[allow(dead_code)]
    #[serde(default)]
    id: String,
    /// "file" | "folder" | "spreadsheet" | "url" | "database"
    #[serde(rename = "type", default)]
    source_type: String,
    #[serde(default)]
    label: String,
    #[serde(default)]
    path: String,
    #[serde(default)]
    url: String,
    #[serde(rename = "connectionString", default)]
    connection_string: String,
    #[serde(default)]
    table: String,
    #[allow(dead_code)]
    #[serde(default)]
    sheet: String,
    /// "read" | "write" | "read-write"
    #[serde(rename = "accessMode", default)]
    access_mode: String,
}

#[derive(serde::Deserialize, Clone, Debug)]
struct GraphEdge {
    from:  String,
    to:    String,
    #[serde(default)]
    label: String,
}

#[derive(serde::Deserialize, Debug)]
struct GraphPayload {
    nodes: Vec<GraphNode>,
    edges: Vec<GraphEdge>,
}

// ── SQLite helpers ────────────────────────────────────────────────────────────

const MIGRATIONS: &str = "
CREATE TABLE IF NOT EXISTS runs (
  id             TEXT PRIMARY KEY,
  created_at     TEXT NOT NULL,
  status         TEXT NOT NULL,
  graph_snapshot TEXT NOT NULL,
  initial_prompt TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS run_nodes (
  id          TEXT PRIMARY KEY,
  run_id      TEXT NOT NULL REFERENCES runs(id),
  node_id     TEXT NOT NULL,
  status      TEXT NOT NULL,
  output      TEXT,
  error       TEXT,
  started_at  TEXT,
  finished_at TEXT
);
";

fn open_db(app: &tauri::AppHandle) -> Result<rusqlite::Connection, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    let db_path = data_dir.join("orchestration.db");
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    conn.execute_batch("PRAGMA journal_mode=WAL;").map_err(|e| e.to_string())?;
    conn.execute_batch(MIGRATIONS).map_err(|e| e.to_string())?;
    Ok(conn)
}

fn now_iso() -> String {
    // Simple ISO-8601 without chrono: use std SystemTime
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    // Format as seconds since epoch as a sortable string (JS can parse this)
    secs.to_string()
}

// ── Data source reader ────────────────────────────────────────────────────────

/// Read all readable data sources attached to a node and return them as a
/// formatted context block to prepend to the node's input message.
///
/// Limits: 50 KB per file, 5 files per folder, 50 KB for URL responses.
async fn read_data_sources(
    sources: &[DataSource],
    client:  &reqwest::Client,
) -> String {
    const FILE_CAP: usize  = 50_000;
    const URL_CAP:  usize  = 50_000;
    const DIR_MAX:  usize  = 5;

    let readable: Vec<&DataSource> = sources.iter()
        .filter(|s| s.access_mode != "write")
        .collect();

    if readable.is_empty() {
        return String::new();
    }

    let mut parts: Vec<String> = Vec::new();

    for src in &readable {
        let label = if src.label.is_empty() { &src.source_type } else { &src.label };

        match src.source_type.as_str() {
            "file" | "spreadsheet" => {
                if src.path.is_empty() { continue; }
                match std::fs::read_to_string(&src.path) {
                    Ok(text) => {
                        let snippet = if text.len() > FILE_CAP {
                            format!("{}\n[... truncated at {} bytes]", &text[..FILE_CAP], FILE_CAP)
                        } else {
                            text
                        };
                        parts.push(format!("=== Data source: {} ({}) ===\n{}", label, src.path, snippet));
                    }
                    Err(e) => {
                        parts.push(format!("=== Data source: {} ({}) [ERROR] ===\n{}", label, src.path, e));
                    }
                }
            }

            "folder" => {
                if src.path.is_empty() { continue; }
                match std::fs::read_dir(&src.path) {
                    Ok(entries) => {
                        let mut file_parts: Vec<String> = Vec::new();
                        let mut count = 0usize;
                        for entry in entries.flatten() {
                            if count >= DIR_MAX { break; }
                            let path = entry.path();
                            if path.is_file() {
                                if let Ok(text) = std::fs::read_to_string(&path) {
                                    let snippet = if text.len() > FILE_CAP {
                                        format!("{}\n[... truncated]", &text[..FILE_CAP])
                                    } else {
                                        text
                                    };
                                    file_parts.push(format!(
                                        "--- {} ---\n{}",
                                        path.file_name().unwrap_or_default().to_string_lossy(),
                                        snippet,
                                    ));
                                    count += 1;
                                }
                            }
                        }
                        if file_parts.is_empty() {
                            parts.push(format!("=== Data source: {} ({}) ===\n[empty folder or no readable files]", label, src.path));
                        } else {
                            parts.push(format!("=== Data source: {} ({}) — {} file(s) ===\n{}", label, src.path, count, file_parts.join("\n\n")));
                        }
                    }
                    Err(e) => {
                        parts.push(format!("=== Data source: {} ({}) [ERROR] ===\n{}", label, src.path, e));
                    }
                }
            }

            "url" => {
                if src.url.is_empty() { continue; }
                match client.get(&src.url).send().await {
                    Ok(resp) => {
                        match resp.text().await {
                            Ok(text) => {
                                let snippet = if text.len() > URL_CAP {
                                    format!("{}\n[... truncated at {} bytes]", &text[..URL_CAP], URL_CAP)
                                } else {
                                    text
                                };
                                parts.push(format!("=== Data source: {} ({}) ===\n{}", label, src.url, snippet));
                            }
                            Err(e) => {
                                parts.push(format!("=== Data source: {} ({}) [ERROR reading body] ===\n{}", label, src.url, e));
                            }
                        }
                    }
                    Err(e) => {
                        parts.push(format!("=== Data source: {} ({}) [FETCH ERROR] ===\n{}", label, src.url, e));
                    }
                }
            }

            "database" => {
                // Provide connection metadata as context — live queries require a DB driver
                let db_info = if src.table.is_empty() {
                    format!("Connection: {}", src.connection_string)
                } else {
                    format!("Connection: {}\nTable/Collection: {}", src.connection_string, src.table)
                };
                parts.push(format!("=== Data source: {} [database — metadata only] ===\n{}\nNote: live database queries are not yet supported; use a tool node to query the database.", label, db_info));
            }

            _ => {}
        }
    }

    if parts.is_empty() {
        String::new()
    } else {
        format!("{}\n\n", parts.join("\n\n"))
    }
}

// ── Topological sort (Kahn's algorithm) ──────────────────────────────────────

fn topological_sort(nodes: &[GraphNode], edges: &[GraphEdge]) -> Result<Vec<String>, String> {
    let node_ids: HashSet<&str> = nodes.iter().map(|n| n.id.as_str()).collect();

    // in-degree and adjacency
    let mut in_degree: HashMap<&str, usize> = nodes.iter().map(|n| (n.id.as_str(), 0)).collect();
    let mut adj: HashMap<&str, Vec<&str>> = nodes.iter().map(|n| (n.id.as_str(), vec![])).collect();

    for edge in edges {
        if !node_ids.contains(edge.from.as_str()) || !node_ids.contains(edge.to.as_str()) {
            continue; // skip dangling edges
        }
        *in_degree.entry(edge.to.as_str()).or_insert(0) += 1;
        adj.entry(edge.from.as_str()).or_default().push(edge.to.as_str());
    }

    let mut queue: VecDeque<&str> = in_degree
        .iter()
        .filter(|(_, &deg)| deg == 0)
        .map(|(&id, _)| id)
        .collect();

    let mut order = Vec::with_capacity(nodes.len());
    while let Some(id) = queue.pop_front() {
        order.push(id.to_string());
        if let Some(neighbors) = adj.get(id) {
            for &nb in neighbors {
                let deg = in_degree.entry(nb).or_insert(0);
                *deg = deg.saturating_sub(1);
                if *deg == 0 {
                    queue.push_back(nb);
                }
            }
        }
    }

    if order.len() != nodes.len() {
        return Err("Graph contains a cycle — cannot execute".to_string());
    }
    Ok(order)
}

// ── Topological levels (parallel-wave decomposition) ─────────────────────────
//
// Returns the nodes grouped into "waves" where each wave contains nodes that
// have no dependency on any other node in the same wave — all nodes in a wave
// can execute concurrently.

fn topological_levels(nodes: &[GraphNode], edges: &[GraphEdge]) -> Result<Vec<Vec<String>>, String> {
    let node_ids: HashSet<&str> = nodes.iter().map(|n| n.id.as_str()).collect();

    let mut in_degree: HashMap<&str, usize> = nodes.iter().map(|n| (n.id.as_str(), 0)).collect();
    let mut adj: HashMap<&str, Vec<&str>>   = nodes.iter().map(|n| (n.id.as_str(), vec![])).collect();

    for edge in edges {
        if !node_ids.contains(edge.from.as_str()) || !node_ids.contains(edge.to.as_str()) {
            continue;
        }
        *in_degree.entry(edge.to.as_str()).or_insert(0) += 1;
        adj.entry(edge.from.as_str()).or_default().push(edge.to.as_str());
    }

    let mut levels: Vec<Vec<String>> = Vec::new();
    let mut current: Vec<&str> = in_degree.iter()
        .filter(|(_, &d)| d == 0)
        .map(|(&id, _)| id)
        .collect();
    let mut total = 0usize;

    while !current.is_empty() {
        levels.push(current.iter().map(|s| s.to_string()).collect());
        total += current.len();
        let mut next: Vec<&str> = Vec::new();
        for id in &current {
            if let Some(neighbors) = adj.get(id) {
                for &nb in neighbors {
                    let deg = in_degree.entry(nb).or_insert(0);
                    *deg = deg.saturating_sub(1);
                    if *deg == 0 {
                        next.push(nb);
                    }
                }
            }
        }
        current = next;
    }

    if total != nodes.len() {
        return Err("Graph contains a cycle — cannot execute".to_string());
    }
    Ok(levels)
}

// ── Anthropic API helpers ─────────────────────────────────────────────────────

/// Low-level helper: sends a complete request body, returns content[0].text.
async fn anthropic_post(
    client:  &reqwest::Client,
    api_key: &str,
    body:    serde_json::Value,
) -> Result<String, String> {
    let resp = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?;

    let status = resp.status();
    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {e}"))?;

    if !status.is_success() {
        let msg = json
            .pointer("/error/message")
            .and_then(|v| v.as_str())
            .unwrap_or("Unknown API error");
        return Err(format!("Anthropic API error {status}: {msg}"));
    }

    json.pointer("/content/0/text")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Unexpected response shape from API".to_string())
        .map(|s| s.to_string())
}

/// OpenAI-compatible chat completions — non-streaming fallback.
#[allow(dead_code)]
async fn openai_post(
    client:    &reqwest::Client,
    base_url:  &str,
    api_key:   &str,
    model:     &str,
    system:    &str,
    user_msg:  &str,
) -> Result<String, String> {
    let resp = client
        .post(format!("{base_url}/v1/chat/completions"))
        .bearer_auth(api_key)
        .header("content-type", "application/json")
        .json(&serde_json::json!({
            "model": model,
            "messages": [
                { "role": "system",  "content": system },
                { "role": "user",    "content": user_msg },
            ],
        }))
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?;

    let status = resp.status();
    let json: serde_json::Value = resp.json().await
        .map_err(|e| format!("Failed to parse response: {e}"))?;

    if !status.is_success() {
        let msg = json.pointer("/error/message")
            .and_then(|v| v.as_str()).unwrap_or("Unknown API error");
        return Err(format!("API error {status}: {msg}"));
    }

    json.pointer("/choices/0/message/content")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Unexpected response shape".to_string())
        .map(|s| s.to_string())
}

/// Google Gemini generateContent — non-streaming fallback.
#[allow(dead_code)]
async fn gemini_post(
    client:   &reqwest::Client,
    api_key:  &str,
    model:    &str,
    system:   &str,
    user_msg: &str,
) -> Result<String, String> {
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    );
    let resp = client
        .post(&url)
        .header("content-type", "application/json")
        .json(&serde_json::json!({
            "systemInstruction": { "parts": [{ "text": system }] },
            "contents": [{ "role": "user", "parts": [{ "text": user_msg }] }],
        }))
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?;

    let status = resp.status();
    let json: serde_json::Value = resp.json().await
        .map_err(|e| format!("Failed to parse response: {e}"))?;

    if !status.is_success() {
        let msg = json.pointer("/error/message")
            .and_then(|v| v.as_str()).unwrap_or("Unknown API error");
        return Err(format!("Gemini API error {status}: {msg}"));
    }

    json.pointer("/candidates/0/content/parts/0/text")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Unexpected Gemini response shape".to_string())
        .map(|s| s.to_string())
}

/// Ollama /api/chat — non-streaming fallback.
#[allow(dead_code)]
async fn ollama_post(
    client:    &reqwest::Client,
    base_url:  &str,
    model:     &str,
    system:    &str,
    user_msg:  &str,
) -> Result<String, String> {
    let url = format!("{base_url}/api/chat");
    let resp = client
        .post(&url)
        .header("content-type", "application/json")
        .json(&serde_json::json!({
            "model":  model,
            "stream": false,
            "messages": [
                { "role": "system",  "content": system },
                { "role": "user",    "content": user_msg },
            ],
        }))
        .send()
        .await
        .map_err(|e| format!("Ollama network error: {e}"))?;

    let status = resp.status();
    let json: serde_json::Value = resp.json().await
        .map_err(|e| format!("Failed to parse Ollama response: {e}"))?;

    if !status.is_success() {
        let msg = json.get("error").and_then(|v| v.as_str()).unwrap_or("Unknown Ollama error");
        return Err(format!("Ollama error {status}: {msg}"));
    }

    json.pointer("/message/content")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Unexpected Ollama response shape".to_string())
        .map(|s| s.to_string())
}

/// InfraNodus knowledge graph analysis, routed by operation type.
async fn infranodus_post(
    client:      &reqwest::Client,
    api_key:     &str,
    text:        &str,
    graph_name:  &str,
    do_not_save: bool,
    operation:   &str,
) -> Result<String, String> {
    let uid = if graph_name.is_empty() { "canvas-temp" } else { graph_name };

    // ── Step 1: always build/refresh the graph ────────────────────────────────
    let resp = client
        .post("https://infranodus.com/api/v1/graphAndStatements")
        .bearer_auth(api_key)
        .header("content-type", "application/json")
        .json(&serde_json::json!({
            "text":      text,
            "uid":       uid,
            "aiTopics":  true,
            "doNotSave": do_not_save,
        }))
        .send()
        .await
        .map_err(|e| format!("InfraNodus network error: {e}"))?;

    let status = resp.status();
    let json: serde_json::Value = resp.json().await
        .map_err(|e| format!("Failed to parse InfraNodus response: {e}"))?;

    if !status.is_success() {
        let msg = json.get("message").or_else(|| json.get("error"))
            .and_then(|v| v.as_str()).unwrap_or("Unknown InfraNodus error");
        return Err(format!("InfraNodus API error {status}: {msg}"));
    }

    // ── Step 2: route by operation ────────────────────────────────────────────
    match operation {

        // ── Viz operations: return raw JSON for frontend D3 constellation ─────
        "full-graph-viz" | "gap-analysis-viz" => {
            return Ok(serde_json::to_string_pretty(&json)
                .unwrap_or_else(|_| "{}".to_string()));
        }

        // ── Research Questions ─────────────────────────────────────────────────
        "research-questions" => {
            // Try dedicated questions endpoint first
            if !graph_name.is_empty() {
                let q_url = format!("https://infranodus.com/api/v1/context/questions?uid={uid}");
                if let Ok(q_resp) = client.get(&q_url).bearer_auth(api_key).send().await {
                    if q_resp.status().is_success() {
                        if let Ok(q_json) = q_resp.json::<serde_json::Value>().await {
                            if let Some(qs) = q_json.get("questions").and_then(|v| v.as_array()) {
                                let list: Vec<String> = qs.iter()
                                    .filter_map(|q| q.as_str().or_else(|| q.get("question").and_then(|v| v.as_str())))
                                    .enumerate()
                                    .map(|(i, q)| format!("{}. {}", i + 1, q))
                                    .collect();
                                if !list.is_empty() {
                                    return Ok(format!("Research Questions:\n\n{}", list.join("\n")));
                                }
                            }
                        }
                    }
                }
            }
            // Fallback: derive questions from graph structure
            let mut parts = Vec::new();
            if let Some(gaps) = json.get("gaps").and_then(|v| v.as_array()) {
                let q: Vec<String> = gaps.iter()
                    .filter_map(|g| g.get("label").and_then(|l| l.as_str()))
                    .take(7)
                    .map(|g| format!("• What is the relationship between {} and the main concepts?", g))
                    .collect();
                if !q.is_empty() { parts.push(format!("Gap-derived questions:\n{}", q.join("\n"))); }
            }
            if let Some(topics) = json.get("aiTopics").and_then(|v| v.as_array()) {
                let q: Vec<String> = topics.iter()
                    .filter_map(|t| t.get("name").and_then(|n| n.as_str()))
                    .take(5)
                    .map(|t| format!("• How does {} connect to the broader subject area?", t))
                    .collect();
                if !q.is_empty() { parts.push(format!("Topic-derived questions:\n{}", q.join("\n"))); }
            }
            return Ok(if parts.is_empty() {
                "No research questions could be generated from this text.".to_string()
            } else {
                parts.join("\n\n")
            });
        }

        // ── Content Gaps ───────────────────────────────────────────────────────
        "content-gaps" => {
            let mut parts = Vec::new();
            if let Some(gaps) = json.get("gaps").and_then(|v| v.as_array()) {
                let names: Vec<String> = gaps.iter()
                    .filter_map(|g| g.get("label").and_then(|l| l.as_str()))
                    .map(|s| format!("• {s}"))
                    .collect();
                if !names.is_empty() {
                    parts.push(format!("Structural gaps (underconnected concepts):\n{}", names.join("\n")));
                }
            }
            if let Some(nodes) = json.get("nodes").and_then(|v| v.as_array()) {
                // Low-betweenness, low-degree nodes are potential gaps
                let low: Vec<&str> = nodes.iter()
                    .filter(|n| {
                        let bet = n.get("betweenness").and_then(|b| b.as_f64()).unwrap_or(0.0);
                        let deg = n.get("degree").or_else(|| n.get("frequency")).and_then(|d| d.as_f64()).unwrap_or(0.0);
                        bet < 0.01 && deg < 2.0
                    })
                    .filter_map(|n| n.get("label").or_else(|| n.get("id")).and_then(|l| l.as_str()))
                    .take(8)
                    .collect();
                if !low.is_empty() {
                    parts.push(format!("Isolated concepts (low connectivity):\n{}", low.iter().map(|s| format!("• {s}")).collect::<Vec<_>>().join("\n")));
                }
            }
            return Ok(if parts.is_empty() {
                "No significant content gaps detected in this text.".to_string()
            } else {
                parts.join("\n\n")
            });
        }

        // ── Topic Clusters ─────────────────────────────────────────────────────
        "topic-clusters" => {
            let mut parts = Vec::new();
            // Use modularity_class groupings from graph nodes
            if let Some(nodes) = json.get("nodes").and_then(|v| v.as_array()) {
                let mut clusters: HashMap<String, Vec<&str>> = HashMap::new();
                for node in nodes {
                    let cluster = node.get("modularity_class")
                        .and_then(|c| c.as_u64())
                        .map(|c| format!("Cluster {}", c + 1))
                        .unwrap_or_else(|| "General".to_string());
                    let label = node.get("label").or_else(|| node.get("id"))
                        .and_then(|l| l.as_str()).unwrap_or("?");
                    clusters.entry(cluster).or_default().push(label);
                }
                let mut sorted_clusters: Vec<(String, Vec<&str>)> = clusters.into_iter().collect();
                sorted_clusters.sort_by_key(|(k, _)| k.clone());
                for (name, terms) in sorted_clusters.iter().take(6) {
                    parts.push(format!("{name}: {}", terms.iter().take(8).cloned().collect::<Vec<_>>().join(", ")));
                }
            }
            // Also include AI topic labels if available
            if let Some(topics) = json.get("aiTopics").and_then(|v| v.as_array()) {
                let labels: Vec<&str> = topics.iter()
                    .filter_map(|t| t.get("name").and_then(|n| n.as_str()))
                    .collect();
                if !labels.is_empty() {
                    parts.push(format!("\nAI-labelled topics: {}", labels.join(" · ")));
                }
            }
            return Ok(if parts.is_empty() {
                "No topic clusters found.".to_string()
            } else {
                format!("Topic Clusters:\n\n{}", parts.join("\n"))
            });
        }

        // ── SEO Report ─────────────────────────────────────────────────────────
        "seo-report" => {
            // Try dedicated SEO endpoint
            if !graph_name.is_empty() {
                let seo_url = format!("https://infranodus.com/api/v1/seo?uid={uid}");
                if let Ok(seo_resp) = client.get(&seo_url).bearer_auth(api_key).send().await {
                    if seo_resp.status().is_success() {
                        if let Ok(seo_json) = seo_resp.json::<serde_json::Value>().await {
                            if !seo_json.is_null() {
                                return Ok(serde_json::to_string_pretty(&seo_json)
                                    .unwrap_or_else(|_| "SEO analysis complete".to_string()));
                            }
                        }
                    }
                }
            }
            // Fallback: synthesize SEO report from graph data
            let mut parts = Vec::new();
            if let Some(nodes) = json.get("topNodes").and_then(|v| v.as_array()) {
                let keywords: Vec<&str> = nodes.iter()
                    .filter_map(|n| n.get("label").or_else(|| n.get("id")).and_then(|l| l.as_str()))
                    .take(10).collect();
                if !keywords.is_empty() {
                    parts.push(format!("Primary keywords: {}", keywords.join(", ")));
                }
            }
            if let Some(topics) = json.get("aiTopics").and_then(|v| v.as_array()) {
                let topics_list: Vec<&str> = topics.iter()
                    .filter_map(|t| t.get("name").and_then(|n| n.as_str())).collect();
                if !topics_list.is_empty() {
                    parts.push(format!("Topical authority clusters: {}", topics_list.join(", ")));
                }
            }
            if let Some(nodes) = json.get("nodes").and_then(|v| v.as_array()) {
                parts.push(format!("Total concepts indexed: {}", nodes.len()));
            }
            if let Some(links) = json.get("links").and_then(|v| v.as_array()) {
                parts.push(format!("Semantic connections mapped: {}", links.len()));
            }
            return Ok(if parts.is_empty() {
                "SEO analysis complete — no structured data returned.".to_string()
            } else {
                format!("SEO Report:\n\n{}", parts.join("\n"))
            });
        }

        // ── Default: analyze-text — formatted summary ─────────────────────────
        _ => {
            let mut parts: Vec<String> = Vec::new();
            if let Some(nodes) = json.get("topNodes").and_then(|v| v.as_array()) {
                let names: Vec<&str> = nodes.iter()
                    .filter_map(|n| n.get("label").or_else(|| n.get("id")).and_then(|l| l.as_str()))
                    .take(10).collect();
                if !names.is_empty() { parts.push(format!("Key concepts: {}", names.join(", "))); }
            }
            if let Some(topics) = json.get("aiTopics").and_then(|v| v.as_array()) {
                let names: Vec<&str> = topics.iter()
                    .filter_map(|t| t.get("name").and_then(|n| n.as_str()))
                    .take(5).collect();
                if !names.is_empty() { parts.push(format!("AI topics: {}", names.join(", "))); }
            }
            if let Some(gaps) = json.get("gaps").and_then(|v| v.as_array()) {
                let gap_names: Vec<&str> = gaps.iter()
                    .filter_map(|g| g.get("label").and_then(|l| l.as_str()))
                    .take(5).collect();
                if !gap_names.is_empty() { parts.push(format!("Content gaps: {}", gap_names.join(", "))); }
            }
            Ok(if parts.is_empty() {
                serde_json::to_string_pretty(&json).unwrap_or_else(|_| "Analysis complete".to_string())
            } else {
                parts.join("\n")
            })
        }
    }
}

/// Dispatch execution based on node type and LLM provider.
///
/// For node types that call an LLM (orchestrator, agent, and the default
/// catch-all), the streaming variants are used so that `run:node-token`
/// events are emitted in real time.  Non-LLM node types (router, evaluator,
/// human-in-loop, output, infranodus) use the existing non-streaming helpers
/// — their responses are short-lived or structured JSON that doesn't benefit
/// from streaming.
async fn call_node_llm(
    client:         &reqwest::Client,
    node:           &GraphNode,
    global_api_key: &str,
    user_message:   &str,
    app:            &tauri::AppHandle,
    run_id:         &str,
    node_id:        &str,
) -> Result<String, String> {
    match node.node_type.as_str() {
        // ── Router — short JSON response; non-streaming ───────────────────────
        "router" => {
            let mode = if node.router_mode.is_empty() { "llm" } else { &node.router_mode };
            let system = format!(
                "You are a routing agent. Based on the input, select the most appropriate route.\n\
                 Mode: {mode}\n\
                 System context: {base}\n\
                 Available routes (from the node config): select the best match.\n\
                 Default route if unsure: {default}\n\
                 Return ONLY valid JSON: {{\"route\": \"route_name\", \"reason\": \"one sentence\"}}",
                mode = mode,
                base = node.system_prompt,
                default = if node.router_default.is_empty() { "default" } else { &node.router_default },
            );
            let model = if node.llm_model.is_empty() { "claude-haiku-4-5-20251001" } else { &node.llm_model };
            anthropic_post(client, global_api_key, serde_json::json!({
                "model": model, "max_tokens": 256,
                "system": system,
                "messages": [{ "role": "user", "content": user_message }],
            })).await
        }

        // ── Evaluator — structured JSON response; non-streaming ───────────────
        "evaluator" => {
            let scoring = if node.evaluator_scoring.is_empty() { "pass-fail" } else { &node.evaluator_scoring };
            let threshold = node.evaluator_threshold.unwrap_or(7);
            let system = format!(
                "You are an evaluation judge. Assess the input against the following criteria:\n{criteria}\n\n\
                 Scoring method: {scoring}\n\
                 {threshold_note}\
                 Return ONLY valid JSON: {{\"score\": <number or \"pass\"/\"fail\">, \"pass\": <bool>, \"explanation\": \"brief summary\", \"breakdown\": [{{\"criterion\": \"...\", \"score\": \"...\"}}]}}",
                criteria  = node.evaluator_criteria,
                scoring   = scoring,
                threshold_note = if scoring == "score-1-10" {
                    format!("Pass threshold: {}/10\n", threshold)
                } else { String::new() },
            );
            let model = if node.llm_model.is_empty() { "claude-sonnet-4-6" } else { &node.llm_model };
            anthropic_post(client, global_api_key, serde_json::json!({
                "model": model, "max_tokens": 1024,
                "system": system,
                "messages": [{ "role": "user", "content": user_message }],
            })).await
        }

        // ── Human-in-loop — handled in the execution loop, not here ──────────
        "human-in-loop" => {
            let instructions = if node.human_prompt.is_empty() {
                "Please review the above content and approve or reject."
            } else {
                &node.human_prompt
            };
            Ok(format!(
                "⏸ HUMAN REVIEW GATE — {name}\n\
                 Instructions: {instructions}\n\
                 Content for review:\n{content}\n\n\
                 [Auto-approved — interactive human review UI coming in Phase 3]",
                name         = node.name,
                instructions = instructions,
                content      = &user_message[..user_message.len().min(500)],
            ))
        }

        // ── Output — pass-through ─────────────────────────────────────────────
        "output" => {
            Ok(user_message.to_string())
        }

        // ── Memory — local pass-through or Letta persistent memory ───────────
        "memory" => {
            let backend = if node.memory_backend.is_empty() { "local" } else { &node.memory_backend };
            match backend {
                "letta" => {
                    if node.letta_agent_id.is_empty() {
                        return Err(format!(
                            "Memory node \"{}\" requires a Letta Agent ID — configure it in the node editor",
                            node.name
                        ));
                    }
                    let base_url  = if node.letta_api_url.is_empty() { "http://localhost:8283" } else { &node.letta_api_url };
                    let mem_mode  = if node.letta_memory_mode.is_empty() { "archival" } else { &node.letta_memory_mode };
                    let access    = if node.access_mode.is_empty() { "read-write" } else { &node.access_mode };
                    let blk_label = if node.letta_block_name.is_empty() { "pipeline-context" } else { &node.letta_block_name };

                    let mut parts: Vec<String> = Vec::new();

                    // ── READ phase ────────────────────────────────────────────
                    if access == "read" || access == "read-write" {
                        let result = match mem_mode {
                            "core-block" => letta::core_block_read(
                                client, base_url, &node.letta_api_key, &node.letta_agent_id, blk_label,
                            ).await,
                            _ => letta::archival_search(
                                client, base_url, &node.letta_api_key, &node.letta_agent_id, user_message, 5,
                            ).await,
                        };
                        match result {
                            Ok(memories) if !memories.is_empty() =>
                                parts.push(format!("[Letta memories]\n{memories}")),
                            Ok(_)  => {},
                            Err(e) => parts.push(format!("[Letta read error: {e}]")),
                        }
                    }

                    // ── WRITE phase ───────────────────────────────────────────
                    if access == "write" || access == "read-write" {
                        let result = match mem_mode {
                            "core-block" => letta::core_block_update(
                                client, base_url, &node.letta_api_key, &node.letta_agent_id, blk_label, user_message,
                            ).await,
                            _ => letta::archival_insert(
                                client, base_url, &node.letta_api_key, &node.letta_agent_id, user_message,
                            ).await,
                        };
                        match result {
                            Ok(msg) => parts.push(format!("[Letta write: {msg}]")),
                            Err(e)  => parts.push(format!("[Letta write error: {e}]")),
                        }
                    }

                    // Prepend any retrieved memories to the accumulated context
                    if parts.is_empty() {
                        Ok(user_message.to_string())
                    } else {
                        Ok(format!("{}\n\n{}", parts.join("\n"), user_message))
                    }
                }
                // "local" or any unknown value — simple pass-through
                _ => Ok(user_message.to_string()),
            }
        }

        // ── InfraNodus — external API; non-streaming ──────────────────────────
        "infranodus" => {
            if node.infranodus_api_key.is_empty() {
                return Err(format!("InfraNodus node \"{}\" has no API key configured", node.name));
            }
            let op = if node.infranodus_operation.is_empty() { "analyze-text" } else { &node.infranodus_operation };
            infranodus_post(
                client,
                &node.infranodus_api_key,
                user_message,
                &node.infranodus_graph_name,
                node.infranodus_privacy,
                op,
            ).await
        }

        // ── Tool — dispatch by toolType ───────────────────────────────────────
        "tool" => {
            let tool_type = if node.tool_type.is_empty() { "rest" } else { node.tool_type.as_str() };
            match tool_type {
                "bash" => {
                    if node.tool_bash_cmd.is_empty() {
                        return Err(format!("Tool node \"{}\" has no bash command configured", node.name));
                    }
                    let output = tokio::process::Command::new("sh")
                        .arg("-c")
                        .arg(&node.tool_bash_cmd)
                        .output()
                        .await
                        .map_err(|e| format!("Bash execution error: {e}"))?;
                    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
                    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
                    if !output.status.success() && !stderr.is_empty() {
                        Ok(format!("Exit {}\nstdout: {stdout}\nstderr: {stderr}", output.status))
                    } else {
                        Ok(stdout)
                    }
                }
                "file_read" => {
                    if node.tool_file_path.is_empty() {
                        return Err(format!("Tool node \"{}\" has no file path configured", node.name));
                    }
                    std::fs::read_to_string(&node.tool_file_path)
                        .map_err(|e| format!("File read error: {e}"))
                }
                "file_write" => {
                    if node.tool_file_path.is_empty() {
                        return Err(format!("Tool node \"{}\" has no file path configured", node.name));
                    }
                    let bytes = user_message.len();
                    std::fs::write(&node.tool_file_path, user_message)
                        .map_err(|e| format!("File write error: {e}"))?;
                    Ok(format!("Written {} bytes to {}", bytes, node.tool_file_path))
                }
                "grep" => {
                    if node.tool_file_path.is_empty() || node.tool_grep_pattern.is_empty() {
                        return Err(format!(
                            "Tool node \"{}\" requires both a file path and a grep pattern",
                            node.name
                        ));
                    }
                    let content = std::fs::read_to_string(&node.tool_file_path)
                        .map_err(|e| format!("Grep file read error: {e}"))?;
                    let re = regex::Regex::new(&node.tool_grep_pattern)
                        .map_err(|e| format!("Invalid grep pattern: {e}"))?;
                    let matches: Vec<&str> = content.lines()
                        .filter(|line| re.is_match(line))
                        .collect();
                    Ok(format!("{} match(es):\n{}", matches.len(), matches.join("\n")))
                }
                // "rest" and default — HTTP GET to the configured endpoint
                _ => {
                    let url = if !node.tool_rest_url.is_empty() {
                        node.tool_rest_url.as_str()
                    } else {
                        node.endpoint.as_str()
                    };
                    if url.is_empty() {
                        Ok(user_message.to_string())
                    } else {
                        let resp = client.get(url).send().await
                            .map_err(|e| format!("REST tool error: {e}"))?;
                        resp.text().await.map_err(|e| format!("REST body read error: {e}"))
                    }
                }
            }
        }

        // ── All other types — streaming LLM call ──────────────────────────────
        _ => {
            let provider = if node.llm_provider.is_empty() { "claude-api" } else { node.llm_provider.as_str() };
            let model    = if node.llm_model.is_empty() { "claude-sonnet-4-6" } else { node.llm_model.as_str() };
            let system   = node.system_prompt.as_str();

            match provider {
                "claude-api" => {
                    streaming::anthropic_stream(
                        client,
                        global_api_key,
                        serde_json::json!({
                            "model": model, "max_tokens": 4096,
                            "system": system,
                            "messages": [{ "role": "user", "content": user_message }],
                        }),
                        app, run_id, node_id,
                    ).await
                }
                "openai" => {
                    let key = if node.llm_api_key.is_empty() { global_api_key } else { &node.llm_api_key };
                    streaming::openai_stream(
                        client, "https://api.openai.com", key, model, system, user_message,
                        app, run_id, node_id,
                    ).await
                }
                "mistral" => {
                    let key = if node.llm_api_key.is_empty() { global_api_key } else { &node.llm_api_key };
                    streaming::openai_stream(
                        client, "https://api.mistral.ai", key, model, system, user_message,
                        app, run_id, node_id,
                    ).await
                }
                "gemini" => {
                    let key = if node.llm_api_key.is_empty() { global_api_key } else { &node.llm_api_key };
                    streaming::gemini_stream(
                        client, key, model, system, user_message,
                        app, run_id, node_id,
                    ).await
                }
                "ollama" => {
                    let base = if node.llm_ollama_url.is_empty() { "http://localhost:11434" } else { &node.llm_ollama_url };
                    streaming::ollama_stream(
                        client, base, model, system, user_message,
                        app, run_id, node_id,
                    ).await
                }
                _ => Err(format!("Unknown LLM provider: {provider}")),
            }
        }
    }
}

/// Tauri command: generic Anthropic call used by Architect panel and Generate Map.
#[tauri::command]
async fn call_architect(req: ArchitectRequest) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());
    anthropic_post(&client, &req.api_key, serde_json::json!({
        "model":      req.model,
        "max_tokens": req.max_tokens,
        "system":     req.system_prompt,
        "messages":   req.messages,
    })).await
}

// ── Run history command ───────────────────────────────────────────────────────

#[tauri::command]
fn clear_run_history(app: tauri::AppHandle) -> Result<(), String> {
    let conn = open_db(&app)?;
    conn.execute_batch("DELETE FROM run_nodes; DELETE FROM runs;")
        .map_err(|e| e.to_string())
}

// ── File dialog commands ──────────────────────────────────────────────────────

#[tauri::command]
fn save_workflow(app: tauri::AppHandle, content: String) -> Result<bool, String> {
    let Some(file_path) = app
        .dialog()
        .file()
        .add_filter("JSON Workflow", &["json"])
        .blocking_save_file()
    else {
        return Ok(false);
    };

    let path = match file_path {
        FilePath::Path(p) => p,
        _ => return Err("Only local file paths are supported".to_string()),
    };

    std::fs::write(path, content).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
fn load_workflow(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let Some(file_path) = app
        .dialog()
        .file()
        .add_filter("JSON Workflow", &["json"])
        .blocking_pick_file()
    else {
        return Ok(None);
    };

    let path = match file_path {
        FilePath::Path(p) => p,
        _ => return Err("Only local file paths are supported".to_string()),
    };

    let content = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
    Ok(Some(content))
}

// ── Data source path pickers ──────────────────────────────────────────────────

#[tauri::command]
fn pick_file_path(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let Some(file_path) = app
        .dialog()
        .file()
        .blocking_pick_file()
    else {
        return Ok(None);
    };

    let path = match file_path {
        FilePath::Path(p) => p,
        _ => return Err("Only local file paths are supported".to_string()),
    };

    Ok(Some(path.to_string_lossy().to_string()))
}

#[tauri::command]
fn pick_folder_path(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let Some(folder_path) = app
        .dialog()
        .file()
        .blocking_pick_folder()
    else {
        return Ok(None);
    };

    let path = match folder_path {
        FilePath::Path(p) => p,
        _ => return Err("Only local file paths are supported".to_string()),
    };

    Ok(Some(path.to_string_lossy().to_string()))
}

// ── Run graph command ─────────────────────────────────────────────────────────

#[tauri::command]
async fn run_graph(
    app:            tauri::AppHandle,
    graph:          GraphPayload,
    api_key:        String,
    initial_prompt: String,
) -> Result<String, String> {
    // 1. Topological sort (for DB pre-insertion order) + level decomposition
    let order  = topological_sort(&graph.nodes, &graph.edges)?;
    let levels = topological_levels(&graph.nodes, &graph.edges)?;

    // 2. Build a node lookup by id
    let node_map: HashMap<String, GraphNode> = graph
        .nodes
        .iter()
        .cloned()
        .map(|n| (n.id.clone(), n))
        .collect();

    // 3. Generate run_id and persist initial rows
    let run_id = uuid::Uuid::new_v4().to_string();
    let graph_json = serde_json::to_string(&serde_json::json!({
        "nodes": graph.nodes.len(),
        "edges": graph.edges.len(),
    }))
    .unwrap_or_default();

    {
        let conn = open_db(&app)?;
        conn.execute(
            "INSERT INTO runs (id, created_at, status, graph_snapshot, initial_prompt) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![run_id, now_iso(), "running", graph_json, initial_prompt],
        )
        .map_err(|e| e.to_string())?;

        for node_id in &order {
            let row_id = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO run_nodes (id, run_id, node_id, status) VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![row_id, run_id, node_id, "pending"],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    // 4. Create cancellation channel and register sender
    let (cancel_tx, cancel_rx) = watch::channel(false);
    {
        let registry = app.state::<CancelRegistry>();
        let mut map = registry.0.lock().map_err(|e| e.to_string())?;
        map.insert(run_id.clone(), cancel_tx);
    }

    // 5. Spawn execution — returns run_id immediately to frontend
    let run_id_clone       = run_id.clone();
    let app_clone          = app.clone();
    let initial_prompt_ref = initial_prompt.clone();

    tokio::spawn(async move {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(120))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());
        let mut ctx       = String::new(); // accumulated context passed between nodes
        let mut any_error = false;
        let mut cancelled = false;

        // ── Shared memory store — cleared fresh for each run ─────────────────
        let shared_memory: std::sync::Arc<std::sync::Mutex<HashMap<String, String>>> =
            std::sync::Arc::new(std::sync::Mutex::new(HashMap::new()));

        // ── Router branching state ────────────────────────────────────────────
        let mut skipped: HashSet<String> = HashSet::new();
        let mut router_skip_edges: HashSet<(String, String)> = HashSet::new();

        // ── Helper: build user_msg for a node from the current context ────────
        // (defined here as a closure to keep the level loop concise)

        'levels: for level in &levels {
            if *cancel_rx.borrow() { cancelled = true; break 'levels; }

            let has_blocking = level.iter().any(|id| {
                node_map.get(id.as_str())
                    .map(|n| n.node_type == "human-in-loop")
                    .unwrap_or(false)
            });

            // ── Parallel wave: multiple independent nodes, none blocking ─────
            if level.len() > 1 && !has_blocking {
                let ctx_snapshot = ctx.clone();

                // Collect (node_id, node_name, node_type, node_clone, user_msg) for
                // each non-skipped node in this wave.
                let mut wave: Vec<(String, String, String, GraphNode, String)> = Vec::new();

                for node_id in level {
                    let node = match node_map.get(node_id.as_str()) {
                        Some(n) => n,
                        None    => continue,
                    };

                    // Skip check
                    let incoming: Vec<&GraphEdge> = graph.edges.iter()
                        .filter(|e| e.to.as_str() == node_id.as_str())
                        .collect();
                    let should_skip = !incoming.is_empty() && incoming.iter().all(|e| {
                        skipped.contains(e.from.as_str())
                            || router_skip_edges.contains(&(e.from.clone(), e.to.clone()))
                    });
                    if should_skip {
                        skipped.insert(node_id.to_string());
                        let _ = app_clone.emit("run:node-done", serde_json::json!({
                            "runId":  run_id_clone,
                            "nodeId": node_id,
                            "output": "⊘ Skipped — not on selected route",
                        }));
                        if let Ok(conn) = open_db(&app_clone) {
                            let _ = conn.execute(
                                "UPDATE run_nodes SET status = 'cancelled', output = ?1, finished_at = ?2 WHERE run_id = ?3 AND node_id = ?4",
                                rusqlite::params!["Skipped", now_iso(), run_id_clone, node_id],
                            );
                        }
                        continue;
                    }

                    // Emit node-start + DB running
                    let _ = app_clone.emit("run:node-start", serde_json::json!({
                        "runId":  run_id_clone,
                        "nodeId": node_id,
                    }));
                    if let Ok(conn) = open_db(&app_clone) {
                        let _ = conn.execute(
                            "UPDATE run_nodes SET status = 'running', started_at = ?1 WHERE run_id = ?2 AND node_id = ?3",
                            rusqlite::params![now_iso(), run_id_clone, node_id],
                        );
                    }

                    // Build user_msg from the pre-wave ctx snapshot
                    let base_msg = if ctx_snapshot.len() > 10_000 {
                        format!("[...context truncated...]\n{}", &ctx_snapshot[ctx_snapshot.len() - 10_000..])
                    } else if ctx_snapshot.is_empty() {
                        initial_prompt_ref.clone()
                    } else {
                        ctx_snapshot.clone()
                    };

                    // Shared memory reads (synchronous, pre-wave state)
                    let sm_prefix = {
                        if node.shared_memory_reads.is_empty() {
                            String::new()
                        } else if let Ok(guard) = shared_memory.lock() {
                            let parts: Vec<String> = node.shared_memory_reads.iter()
                                .filter_map(|key| guard.get(key).map(|v| format!("[memory:{}] {}", key, v)))
                                .collect();
                            if parts.is_empty() { String::new() }
                            else { format!("=== Shared Memory ===\n{}\n\n", parts.join("\n")) }
                        } else { String::new() }
                    };

                    let ds_prefix = read_data_sources(&node.data_sources, &client).await;
                    let user_msg = format!("{sm_prefix}{ds_prefix}{base_msg}");

                    wave.push((
                        node_id.clone(),
                        node.name.clone(),
                        node.node_type.clone(),
                        node.clone(),
                        user_msg,
                    ));
                }

                // Run the wave concurrently
                let futures: Vec<_> = wave.iter().map(|(nid, _, _, node, user_msg)| {
                    let client2   = client.clone();
                    let app2      = app_clone.clone();
                    let run_id2   = run_id_clone.clone();
                    let node2     = node.clone();
                    let user_msg2 = user_msg.clone();
                    let nid2      = nid.clone();
                    let api_key2  = api_key.clone();
                    async move {
                        call_node_llm(&client2, &node2, &api_key2, &user_msg2, &app2, &run_id2, &nid2).await
                    }
                }).collect();

                let results = futures_util::future::join_all(futures).await;

                // Process results in level order (preserved by join_all)
                for ((node_id, node_name, node_type, node, _), call_result) in wave.iter().zip(results.into_iter()) {
                    match call_result {
                        Ok(output) => {
                            ctx = format!("{}\n\n[{}]: {}", ctx, node_name, output);

                            // Shared memory writes
                            if !node.shared_memory_writes.is_empty() {
                                if let Ok(mut guard) = shared_memory.lock() {
                                    for key in &node.shared_memory_writes {
                                        guard.insert(key.clone(), output.clone());
                                    }
                                }
                            }

                            // Router branching
                            if node_type == "router" {
                                if let Ok(route_json) = serde_json::from_str::<serde_json::Value>(&output) {
                                    if let Some(selected) = route_json.get("route").and_then(|v| v.as_str()) {
                                        let sel_lower = selected.to_lowercase();
                                        for edge in graph.edges.iter().filter(|e| e.from.as_str() == node_id.as_str()) {
                                            let label_lower = edge.label.to_lowercase();
                                            if !label_lower.is_empty()
                                                && !label_lower.contains(&sel_lower)
                                                && !sel_lower.contains(&label_lower) {
                                                router_skip_edges.insert((edge.from.clone(), edge.to.clone()));
                                            }
                                        }
                                    }
                                }
                            }

                            let _ = app_clone.emit("run:node-done", serde_json::json!({
                                "runId":  run_id_clone,
                                "nodeId": node_id,
                                "output": output.clone(),
                            }));
                            if let Ok(conn) = open_db(&app_clone) {
                                let _ = conn.execute(
                                    "UPDATE run_nodes SET status = 'done', output = ?1, finished_at = ?2 WHERE run_id = ?3 AND node_id = ?4",
                                    rusqlite::params![output, now_iso(), run_id_clone, node_id],
                                );
                            }
                        }
                        Err(err) => {
                            any_error = true;
                            let _ = app_clone.emit("run:node-error", serde_json::json!({
                                "runId":  run_id_clone,
                                "nodeId": node_id,
                                "error":  err.clone(),
                            }));
                            if let Ok(conn) = open_db(&app_clone) {
                                let _ = conn.execute(
                                    "UPDATE run_nodes SET status = 'error', error = ?1, finished_at = ?2 WHERE run_id = ?3 AND node_id = ?4",
                                    rusqlite::params![err, now_iso(), run_id_clone, node_id],
                                );
                            }
                        }
                    }
                }
                continue 'levels;
            }

            // ── Sequential path: single node OR level contains a blocking node ─
            for node_id in level {
                let node = match node_map.get(node_id.as_str()) {
                    Some(n) => n,
                    None    => continue,
                };

                // Skip check
                let incoming: Vec<&GraphEdge> = graph.edges.iter()
                    .filter(|e| e.to.as_str() == node_id.as_str())
                    .collect();
                let should_skip = !incoming.is_empty() && incoming.iter().all(|e| {
                    skipped.contains(e.from.as_str())
                        || router_skip_edges.contains(&(e.from.clone(), e.to.clone()))
                });
                if should_skip {
                    skipped.insert(node_id.to_string());
                    let _ = app_clone.emit("run:node-done", serde_json::json!({
                        "runId":  run_id_clone,
                        "nodeId": node_id,
                        "output": "⊘ Skipped — not on selected route",
                    }));
                    if let Ok(conn) = open_db(&app_clone) {
                        let _ = conn.execute(
                            "UPDATE run_nodes SET status = 'cancelled', output = ?1, finished_at = ?2 WHERE run_id = ?3 AND node_id = ?4",
                            rusqlite::params!["Skipped", now_iso(), run_id_clone, node_id],
                        );
                    }
                    continue;
                }

                // emit node-start
                let _ = app_clone.emit("run:node-start", serde_json::json!({
                    "runId":  run_id_clone,
                    "nodeId": node_id,
                }));
                if let Ok(conn) = open_db(&app_clone) {
                    let _ = conn.execute(
                        "UPDATE run_nodes SET status = 'running', started_at = ?1 WHERE run_id = ?2 AND node_id = ?3",
                        rusqlite::params![now_iso(), run_id_clone, node_id],
                    );
                }

                // cap context at ~10k chars to avoid token overflow
                let base_msg = if ctx.len() > 10_000 {
                    format!("[...context truncated...]\n{}", &ctx[ctx.len() - 10_000..])
                } else if ctx.is_empty() {
                    initial_prompt_ref.clone()
                } else {
                    ctx.clone()
                };

                // Shared memory reads
                let sm_prefix = {
                    if node.shared_memory_reads.is_empty() {
                        String::new()
                    } else if let Ok(guard) = shared_memory.lock() {
                        let parts: Vec<String> = node.shared_memory_reads.iter()
                            .filter_map(|key| guard.get(key).map(|v| format!("[memory:{}] {}", key, v)))
                            .collect();
                        if parts.is_empty() { String::new() }
                        else { format!("=== Shared Memory ===\n{}\n\n", parts.join("\n")) }
                    } else { String::new() }
                };

                // Data sources
                let ds_prefix = read_data_sources(&node.data_sources, &client).await;
                let user_msg = format!("{sm_prefix}{ds_prefix}{base_msg}");

                // ── Human-in-loop: block and wait for reviewer response ───────
                let call_result: Result<String, String> = if node.node_type == "human-in-loop" {
                    let instructions = if node.human_prompt.is_empty() {
                        "Please review the content above and approve or reject.".to_string()
                    } else {
                        node.human_prompt.clone()
                    };
                    let preview = &user_msg[..user_msg.len().min(1500)];
                    let review_key = format!("{}:{}", run_id_clone, node_id);

                    let (tx, rx) = oneshot::channel::<HumanReviewDecision>();
                    {
                        let registry = app_clone.state::<HumanReviewRegistry>();
                        if let Ok(mut map) = registry.0.lock() {
                            map.insert(review_key.clone(), tx);
                        };
                    }

                    let _ = app_clone.emit("run:human-review", serde_json::json!({
                        "runId":        run_id_clone,
                        "nodeId":       node_id,
                        "nodeName":     node.name,
                        "instructions": instructions,
                        "content":      preview,
                        "timeoutMins":  node.human_timeout,
                    }));

                    let timeout_secs = if node.human_timeout == 0 { u64::MAX } else { node.human_timeout * 60 };
                    let decision = if timeout_secs == u64::MAX {
                        rx.await.ok()
                    } else {
                        tokio::time::timeout(
                            std::time::Duration::from_secs(timeout_secs),
                            rx,
                        ).await.ok().and_then(|r| r.ok())
                    };

                    {
                        let registry = app_clone.state::<HumanReviewRegistry>();
                        if let Ok(mut map) = registry.0.lock() { map.remove(&review_key); };
                    }

                    match decision {
                        Some(d) if d.approved => {
                            let feedback = if d.feedback.is_empty() { String::new() } else {
                                format!("\n\nReviewer feedback: {}", d.feedback)
                            };
                            Ok(format!(
                                "✓ APPROVED by human reviewer\nNode: {name}\nInstructions: {instructions}\nContent reviewed:\n{preview}{feedback}",
                                name         = node.name,
                                instructions = node.human_prompt,
                                preview      = &user_msg[..user_msg.len().min(500)],
                            ))
                        }
                        Some(d) => {
                            let feedback = if d.feedback.is_empty() { "No reason given.".to_string() } else { d.feedback };
                            Err(format!("✗ REJECTED by human reviewer — {feedback}"))
                        }
                        None => {
                            match node.human_on_timeout.as_str() {
                                "auto-approve" => Ok(format!(
                                    "⏱ Timeout — auto-approved per node configuration\nNode: {}",
                                    node.name
                                )),
                                "auto-reject" => Err(format!(
                                    "⏱ Timeout — auto-rejected per node configuration ({}m)",
                                    node.human_timeout
                                )),
                                _ => Err(format!(
                                    "⏱ Human review timed out after {}m — no response received",
                                    node.human_timeout
                                )),
                            }
                        }
                    }
                } else {
                    call_node_llm(&client, node, &api_key, &user_msg, &app_clone, &run_id_clone, node_id).await
                };

                match call_result {
                    Ok(output) => {
                        ctx = format!("{}\n\n[{}]: {}", ctx, node.name, output);

                        // Shared memory writes
                        if !node.shared_memory_writes.is_empty() {
                            if let Ok(mut guard) = shared_memory.lock() {
                                for key in &node.shared_memory_writes {
                                    guard.insert(key.clone(), output.clone());
                                }
                            }
                        }

                        // Router branching
                        if node.node_type == "router" {
                            if let Ok(route_json) = serde_json::from_str::<serde_json::Value>(&output) {
                                if let Some(selected) = route_json.get("route").and_then(|v| v.as_str()) {
                                    let sel_lower = selected.to_lowercase();
                                    for edge in graph.edges.iter().filter(|e| e.from.as_str() == node_id.as_str()) {
                                        let label_lower = edge.label.to_lowercase();
                                        if !label_lower.is_empty()
                                            && !label_lower.contains(&sel_lower)
                                            && !sel_lower.contains(&label_lower) {
                                            router_skip_edges.insert((edge.from.clone(), edge.to.clone()));
                                        }
                                    }
                                }
                            }
                        }

                        let _ = app_clone.emit("run:node-done", serde_json::json!({
                            "runId":  run_id_clone,
                            "nodeId": node_id,
                            "output": output.clone(),
                        }));
                        if let Ok(conn) = open_db(&app_clone) {
                            let _ = conn.execute(
                                "UPDATE run_nodes SET status = 'done', output = ?1, finished_at = ?2 WHERE run_id = ?3 AND node_id = ?4",
                                rusqlite::params![output, now_iso(), run_id_clone, node_id],
                            );
                        }
                    }
                    Err(err) => {
                        any_error = true;
                        let _ = app_clone.emit("run:node-error", serde_json::json!({
                            "runId":  run_id_clone,
                            "nodeId": node_id,
                            "error":  err.clone(),
                        }));
                        if let Ok(conn) = open_db(&app_clone) {
                            let _ = conn.execute(
                                "UPDATE run_nodes SET status = 'error', error = ?1, finished_at = ?2 WHERE run_id = ?3 AND node_id = ?4",
                                rusqlite::params![err, now_iso(), run_id_clone, node_id],
                            );
                        }
                    }
                }
            }
        }

        // Determine final status and emit completion event
        let final_status = if cancelled { "cancelled" } else if any_error { "error" } else { "done" };

        if cancelled {
            let _ = app_clone.emit("run:cancelled", serde_json::json!({
                "runId": run_id_clone,
            }));
        }

        if let Ok(conn) = open_db(&app_clone) {
            let _ = conn.execute(
                "UPDATE runs SET status = ?1 WHERE id = ?2",
                rusqlite::params![final_status, run_id_clone],
            );
        }

        let _ = app_clone.emit("run:complete", serde_json::json!({
            "runId":  run_id_clone,
            "status": final_status,
        }));

        // Clean up cancellation entry
        let _ = app_clone
            .state::<CancelRegistry>()
            .0
            .lock()
            .map(|mut m| m.remove(&run_id_clone));
    });

    Ok(run_id)
}

// ── Human review response command ─────────────────────────────────────────────

/// Called by the frontend when a human reviewer approves or rejects a node.
#[tauri::command]
fn respond_human_review(
    app:      tauri::AppHandle,
    run_id:   String,
    node_id:  String,
    approved: bool,
    feedback: String,
) -> Result<(), String> {
    let key = format!("{run_id}:{node_id}");
    let registry = app.state::<HumanReviewRegistry>();
    let mut map  = registry.0.lock().map_err(|e| e.to_string())?;
    if let Some(tx) = map.remove(&key) {
        let _ = tx.send(HumanReviewDecision { approved, feedback });
        Ok(())
    } else {
        Err(format!("No pending human review for run={run_id} node={node_id}"))
    }
}

// ── Cancel run command ────────────────────────────────────────────────────────

#[tauri::command]
fn cancel_run(app: tauri::AppHandle, run_id: String) -> Result<(), String> {
    let registry = app.state::<CancelRegistry>();
    let map = registry.0.lock().map_err(|e| e.to_string())?;
    if let Some(tx) = map.get(&run_id) {
        let _ = tx.send(true);
    }
    Ok(())
}

// ── GitHub Gist commands ──────────────────────────────────────────────────────

#[derive(serde::Serialize)]
struct GistResult {
    id:       String,
    html_url: String,
}

/// Create or update a secret GitHub Gist.
#[tauri::command]
async fn create_gist(
    token:       String,
    description: String,
    filename:    String,
    content:     String,
    public:      bool,
) -> Result<GistResult, String> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "description": description,
        "public": public,
        "files": {
            filename: { "content": content }
        }
    });
    let resp = client
        .post("https://api.github.com/gists")
        .header("Authorization", format!("Bearer {token}"))
        .header("Accept", "application/vnd.github+json")
        .header("User-Agent", "OrchestrationCanvas/1.0")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {status}: {text}"));
    }

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    Ok(GistResult {
        id:       json["id"].as_str().unwrap_or("").to_string(),
        html_url: json["html_url"].as_str().unwrap_or("").to_string(),
    })
}

/// Load raw content of a Gist's first file by Gist ID.
#[tauri::command]
async fn load_gist(token: String, gist_id: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    let url = format!("https://api.github.com/gists/{gist_id}");
    let mut req = client
        .get(&url)
        .header("Accept", "application/vnd.github+json")
        .header("User-Agent", "OrchestrationCanvas/1.0")
        .header("X-GitHub-Api-Version", "2022-11-28");
    if !token.is_empty() {
        req = req.header("Authorization", format!("Bearer {token}"));
    }
    let resp = req.send().await.map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {status}: {text}"));
    }

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    // Extract content from the first file
    let files = json["files"].as_object().ok_or("no files in gist")?;
    let first = files.values().next().ok_or("gist has no files")?;

    // Prefer raw_url fetch if content is truncated
    if first["truncated"].as_bool().unwrap_or(false) {
        let raw_url = first["raw_url"].as_str().ok_or("no raw_url")?;
        let raw = client.get(raw_url).send().await.map_err(|e| e.to_string())?;
        return raw.text().await.map_err(|e| e.to_string());
    }

    first["content"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "gist content is empty".to_string())
}

// ── App entry point ───────────────────────────────────────────────────────────

pub fn run() {
    tauri::Builder::default()
        .manage(CancelRegistry(Mutex::new(HashMap::new())))
        .manage(HumanReviewRegistry(Mutex::new(HashMap::new())))
        .manage(SharedMemoryStore(Mutex::new(HashMap::new())))
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            save_workflow, load_workflow,
            call_architect, clear_run_history,
            run_graph, cancel_run,
            respond_human_review,
            pick_file_path, pick_folder_path,
            create_gist, load_gist,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
