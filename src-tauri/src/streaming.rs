/// Live token streaming for each LLM provider.
///
/// Each function calls its provider's streaming endpoint, emits
/// `run:node-token` Tauri events as text chunks arrive (batched every 50 ms
/// to avoid flooding the IPC bridge), and returns the full concatenated
/// response when the stream ends.
///
/// On any streaming error the functions fall back gracefully and return
/// whatever text was accumulated up to that point (which may be empty, in
/// which case callers should fall back to the non-streaming path).
use std::time::{Duration, Instant};
use tauri::Emitter;

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Emit a `run:node-token` event, silently swallowing errors (the UI degrades
/// gracefully if an individual event is lost).
fn emit_token(app: &tauri::AppHandle, run_id: &str, node_id: &str, token: &str) {
    let _ = app.emit(
        "run:node-token",
        serde_json::json!({
            "runId":  run_id,
            "nodeId": node_id,
            "token":  token,
        }),
    );
}

/// Flush `buf` as a token event if non-empty, then clear it.
fn flush(app: &tauri::AppHandle, run_id: &str, node_id: &str, buf: &mut String) {
    if !buf.is_empty() {
        emit_token(app, run_id, node_id, buf);
        buf.clear();
    }
}

// ── Anthropic (Claude) SSE streaming ─────────────────────────────────────────

/// Stream a Claude response. Returns the full text on success or an error
/// string on failure. Never panics.
pub async fn anthropic_stream(
    client:  &reqwest::Client,
    api_key: &str,
    body:    serde_json::Value,
    app:     &tauri::AppHandle,
    run_id:  &str,
    node_id: &str,
) -> Result<String, String> {
    use futures_util::StreamExt;

    let mut body = body;
    body["stream"] = serde_json::Value::Bool(true);

    let resp = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let json: serde_json::Value = resp
            .json()
            .await
            .unwrap_or(serde_json::Value::Null);
        let msg = json
            .pointer("/error/message")
            .and_then(|v| v.as_str())
            .unwrap_or("Unknown API error");
        return Err(format!("Anthropic API error {status}: {msg}"));
    }

    let mut full  = String::new();
    let mut batch = String::new();
    let mut last_flush = Instant::now();
    let flush_interval = Duration::from_millis(50);

    let mut stream = resp.bytes_stream();
    let mut line_buf = String::new();

    while let Some(chunk) = stream.next().await {
        let bytes = chunk.map_err(|e| format!("Stream read error: {e}"))?;
        let text  = String::from_utf8_lossy(&bytes);

        for ch in text.chars() {
            if ch == '\n' {
                let line = line_buf.trim().to_string();
                line_buf.clear();

                if let Some(data) = line.strip_prefix("data: ") {
                    if data == "[DONE]" { break; }
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                        // content_block_delta carries the actual text token
                        if json.get("type").and_then(|t| t.as_str()) == Some("content_block_delta") {
                            if let Some(token) = json
                                .pointer("/delta/text")
                                .and_then(|v| v.as_str())
                            {
                                full.push_str(token);
                                batch.push_str(token);
                            }
                        }
                    }
                }

                // Flush batch every 50 ms
                if last_flush.elapsed() >= flush_interval {
                    flush(app, run_id, node_id, &mut batch);
                    last_flush = Instant::now();
                }
            } else {
                line_buf.push(ch);
            }
        }
    }

    // Flush any remaining tokens
    flush(app, run_id, node_id, &mut batch);

    Ok(full)
}

// ── OpenAI-compatible SSE streaming (OpenAI, Mistral) ────────────────────────

pub async fn openai_stream(
    client:   &reqwest::Client,
    base_url: &str,
    api_key:  &str,
    model:    &str,
    system:   &str,
    user_msg: &str,
    app:      &tauri::AppHandle,
    run_id:   &str,
    node_id:  &str,
) -> Result<String, String> {
    use futures_util::StreamExt;

    let resp = client
        .post(format!("{base_url}/v1/chat/completions"))
        .bearer_auth(api_key)
        .header("content-type", "application/json")
        .json(&serde_json::json!({
            "model":  model,
            "stream": true,
            "messages": [
                { "role": "system", "content": system },
                { "role": "user",   "content": user_msg },
            ],
        }))
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let json: serde_json::Value = resp.json().await.unwrap_or(serde_json::Value::Null);
        let msg = json.pointer("/error/message")
            .and_then(|v| v.as_str()).unwrap_or("Unknown API error");
        return Err(format!("API error {status}: {msg}"));
    }

    let mut full  = String::new();
    let mut batch = String::new();
    let mut last_flush = Instant::now();
    let flush_interval = Duration::from_millis(50);

    let mut stream = resp.bytes_stream();
    let mut line_buf = String::new();

    while let Some(chunk) = stream.next().await {
        let bytes = chunk.map_err(|e| format!("Stream read error: {e}"))?;
        let text  = String::from_utf8_lossy(&bytes);

        for ch in text.chars() {
            if ch == '\n' {
                let line = line_buf.trim().to_string();
                line_buf.clear();

                if let Some(data) = line.strip_prefix("data: ") {
                    if data.trim() == "[DONE]" { break; }
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                        if let Some(token) = json
                            .pointer("/choices/0/delta/content")
                            .and_then(|v| v.as_str())
                        {
                            full.push_str(token);
                            batch.push_str(token);
                        }
                    }
                }

                if last_flush.elapsed() >= flush_interval {
                    flush(app, run_id, node_id, &mut batch);
                    last_flush = Instant::now();
                }
            } else {
                line_buf.push(ch);
            }
        }
    }

    flush(app, run_id, node_id, &mut batch);
    Ok(full)
}

// ── Google Gemini SSE streaming ───────────────────────────────────────────────

pub async fn gemini_stream(
    client:   &reqwest::Client,
    api_key:  &str,
    model:    &str,
    system:   &str,
    user_msg: &str,
    app:      &tauri::AppHandle,
    run_id:   &str,
    node_id:  &str,
) -> Result<String, String> {
    use futures_util::StreamExt;

    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse&key={api_key}"
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

    if !resp.status().is_success() {
        let status = resp.status();
        let json: serde_json::Value = resp.json().await.unwrap_or(serde_json::Value::Null);
        let msg = json.pointer("/error/message")
            .and_then(|v| v.as_str()).unwrap_or("Unknown API error");
        return Err(format!("Gemini API error {status}: {msg}"));
    }

    let mut full  = String::new();
    let mut batch = String::new();
    let mut last_flush = Instant::now();
    let flush_interval = Duration::from_millis(50);

    let mut stream = resp.bytes_stream();
    let mut line_buf = String::new();

    while let Some(chunk) = stream.next().await {
        let bytes = chunk.map_err(|e| format!("Stream read error: {e}"))?;
        let text  = String::from_utf8_lossy(&bytes);

        for ch in text.chars() {
            if ch == '\n' {
                let line = line_buf.trim().to_string();
                line_buf.clear();

                if let Some(data) = line.strip_prefix("data: ") {
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                        if let Some(token) = json
                            .pointer("/candidates/0/content/parts/0/text")
                            .and_then(|v| v.as_str())
                        {
                            full.push_str(token);
                            batch.push_str(token);
                        }
                    }
                }

                if last_flush.elapsed() >= flush_interval {
                    flush(app, run_id, node_id, &mut batch);
                    last_flush = Instant::now();
                }
            } else {
                line_buf.push(ch);
            }
        }
    }

    flush(app, run_id, node_id, &mut batch);
    Ok(full)
}

// ── Ollama NDJSON streaming ───────────────────────────────────────────────────

pub async fn ollama_stream(
    client:   &reqwest::Client,
    base_url: &str,
    model:    &str,
    system:   &str,
    user_msg: &str,
    app:      &tauri::AppHandle,
    run_id:   &str,
    node_id:  &str,
) -> Result<String, String> {
    use futures_util::StreamExt;

    // Ollama streams NDJSON by default when stream=true
    let resp = client
        .post(format!("{base_url}/api/chat"))
        .header("content-type", "application/json")
        .json(&serde_json::json!({
            "model":  model,
            "stream": true,
            "messages": [
                { "role": "system", "content": system },
                { "role": "user",   "content": user_msg },
            ],
        }))
        .send()
        .await
        .map_err(|e| format!("Ollama network error: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let json: serde_json::Value = resp.json().await.unwrap_or(serde_json::Value::Null);
        let msg = json.get("error").and_then(|v| v.as_str()).unwrap_or("Unknown Ollama error");
        return Err(format!("Ollama error {status}: {msg}"));
    }

    let mut full  = String::new();
    let mut batch = String::new();
    let mut last_flush = Instant::now();
    let flush_interval = Duration::from_millis(50);

    let mut stream = resp.bytes_stream();
    let mut line_buf = String::new();

    while let Some(chunk) = stream.next().await {
        let bytes = chunk.map_err(|e| format!("Ollama stream read error: {e}"))?;
        let text  = String::from_utf8_lossy(&bytes);

        for ch in text.chars() {
            if ch == '\n' {
                let line = line_buf.trim().to_string();
                line_buf.clear();

                if line.is_empty() { continue; }

                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&line) {
                    // Each NDJSON line: { "message": { "content": "..." }, "done": false }
                    if let Some(token) = json
                        .pointer("/message/content")
                        .and_then(|v| v.as_str())
                    {
                        full.push_str(token);
                        batch.push_str(token);
                    }
                    if json.get("done").and_then(|v| v.as_bool()).unwrap_or(false) {
                        break;
                    }
                }

                if last_flush.elapsed() >= flush_interval {
                    flush(app, run_id, node_id, &mut batch);
                    last_flush = Instant::now();
                }
            } else {
                line_buf.push(ch);
            }
        }
    }

    flush(app, run_id, node_id, &mut batch);
    Ok(full)
}
