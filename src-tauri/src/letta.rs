/// Letta (formerly MemGPT) persistent memory API client.
///
/// Provides four async functions covering the two memory modes Letta supports:
///
/// - **Archival** (vector/long-term): `archival_insert` + `archival_search`
/// - **Core block** (in-context, named segment): `core_block_update` + `core_block_read`
///
/// All functions parse responses defensively and return user-friendly error
/// messages. A 10-second per-request timeout is applied separately from the
/// 120-second LLM timeout used elsewhere.

const LETTA_TIMEOUT_SECS: u64 = 10;

// ── Header helper ─────────────────────────────────────────────────────────────

/// Build a reqwest request builder with optional Bearer auth and a short
/// per-request timeout suited to fast memory operations.
fn letta_client() -> reqwest::Client {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(LETTA_TIMEOUT_SECS))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new())
}

fn add_auth(req: reqwest::RequestBuilder, api_key: &str) -> reqwest::RequestBuilder {
    if api_key.is_empty() {
        req
    } else {
        req.bearer_auth(api_key)
    }
}

// ── Archival memory ───────────────────────────────────────────────────────────

/// Insert `content` into a Letta agent's archival (vector) memory.
///
/// Returns a short confirmation string on success, e.g. `"Stored 1 passage"`.
pub async fn archival_insert(
    _client:  &reqwest::Client,
    base_url: &str,
    api_key:  &str,
    agent_id: &str,
    content:  &str,
) -> Result<String, String> {
    let client = letta_client();
    let url = format!("{base_url}/v1/agents/{agent_id}/archival");

    let req = add_auth(
        client
            .post(&url)
            .header("content-type", "application/json"),
        api_key,
    );

    let resp = req
        .json(&serde_json::json!({ "text": content }))
        .send()
        .await
        .map_err(|e| format!("Letta server at {base_url} did not respond: {e}"))?;

    let status = resp.status();
    let json: serde_json::Value = resp
        .json()
        .await
        .unwrap_or(serde_json::Value::Null);

    if !status.is_success() {
        let msg = json
            .pointer("/detail")
            .or_else(|| json.pointer("/message"))
            .or_else(|| json.pointer("/error"))
            .and_then(|v| v.as_str())
            .unwrap_or("Unknown Letta error");
        return Err(format!("Letta archival insert failed ({status}): {msg}"));
    }

    // Response may be an array of inserted passages or an object
    let count = if let Some(arr) = json.as_array() {
        arr.len()
    } else {
        1
    };
    Ok(format!("Stored {count} passage(s) in archival memory"))
}

/// Search a Letta agent's archival memory for passages relevant to `query`.
///
/// Returns a formatted multi-line string of results, or a fallback message
/// when nothing is found.
pub async fn archival_search(
    _client:  &reqwest::Client,
    base_url: &str,
    api_key:  &str,
    agent_id: &str,
    query:    &str,
    limit:    u32,
) -> Result<String, String> {
    let client = letta_client();
    let encoded_query = urlencoding_encode(query);
    let url = format!(
        "{base_url}/v1/agents/{agent_id}/archival?query={encoded_query}&limit={limit}"
    );

    let req = add_auth(client.get(&url), api_key);

    let resp = req
        .send()
        .await
        .map_err(|e| format!("Letta server at {base_url} did not respond: {e}"))?;

    let status = resp.status();
    let json: serde_json::Value = resp
        .json()
        .await
        .unwrap_or(serde_json::Value::Null);

    if !status.is_success() {
        let msg = json
            .pointer("/detail")
            .or_else(|| json.pointer("/message"))
            .and_then(|v| v.as_str())
            .unwrap_or("Unknown Letta error");
        return Err(format!("Letta archival search failed ({status}): {msg}"));
    }

    // Parse results: either a top-level array or an object with a "passages" / "results" key
    let passages: Vec<String> = if let Some(arr) = json.as_array() {
        extract_passages(arr)
    } else if let Some(arr) = json
        .get("passages")
        .or_else(|| json.get("results"))
        .and_then(|v| v.as_array())
    {
        extract_passages(arr)
    } else {
        vec![]
    };

    if passages.is_empty() {
        Ok("No relevant memories found in Letta archival storage.".to_string())
    } else {
        Ok(passages.join("\n\n"))
    }
}

fn extract_passages(arr: &[serde_json::Value]) -> Vec<String> {
    arr.iter()
        .enumerate()
        .filter_map(|(i, p)| {
            let text = p
                .get("text")
                .or_else(|| p.get("content"))
                .or_else(|| p.get("passage"))
                .and_then(|v| v.as_str())?;
            Some(format!("[Memory {}] {}", i + 1, text))
        })
        .collect()
}

// ── Core block memory ─────────────────────────────────────────────────────────

/// Upsert a named core memory block on a Letta agent.
///
/// Core blocks are always in the agent's context window. Upserting replaces
/// the block's value entirely.
pub async fn core_block_update(
    _client:     &reqwest::Client,
    base_url:    &str,
    api_key:     &str,
    agent_id:    &str,
    block_label: &str,
    value:       &str,
) -> Result<String, String> {
    let client = letta_client();
    let url = format!("{base_url}/v1/agents/{agent_id}/memory/blocks");

    let req = add_auth(
        client
            .post(&url)
            .header("content-type", "application/json"),
        api_key,
    );

    let resp = req
        .json(&serde_json::json!({
            "label": block_label,
            "value": value,
        }))
        .send()
        .await
        .map_err(|e| format!("Letta server at {base_url} did not respond: {e}"))?;

    let status = resp.status();
    if !status.is_success() {
        let json: serde_json::Value = resp
            .json()
            .await
            .unwrap_or(serde_json::Value::Null);
        let msg = json
            .pointer("/detail")
            .or_else(|| json.pointer("/message"))
            .and_then(|v| v.as_str())
            .unwrap_or("Unknown Letta error");
        return Err(format!("Letta core block update failed ({status}): {msg}"));
    }

    Ok(format!("Core memory block '{block_label}' updated"))
}

/// Retrieve the value of a named core memory block from a Letta agent.
///
/// Returns the block's text value, or an error if the block doesn't exist.
pub async fn core_block_read(
    _client:     &reqwest::Client,
    base_url:    &str,
    api_key:     &str,
    agent_id:    &str,
    block_label: &str,
) -> Result<String, String> {
    let client = letta_client();
    let url = format!("{base_url}/v1/agents/{agent_id}/memory");

    let req = add_auth(client.get(&url), api_key);

    let resp = req
        .send()
        .await
        .map_err(|e| format!("Letta server at {base_url} did not respond: {e}"))?;

    let status = resp.status();
    let json: serde_json::Value = resp
        .json()
        .await
        .unwrap_or(serde_json::Value::Null);

    if !status.is_success() {
        let msg = json
            .pointer("/detail")
            .or_else(|| json.pointer("/message"))
            .and_then(|v| v.as_str())
            .unwrap_or("Unknown Letta error");
        return Err(format!("Letta memory fetch failed ({status}): {msg}"));
    }

    // Memory response shape varies: may be { "memory": { "blocks": [...] } }
    // or a top-level array, or { "blocks": [...] }
    let blocks_iter: Box<dyn Iterator<Item = &serde_json::Value>> = if let Some(arr) = json
        .get("memory")
        .and_then(|m| m.get("blocks"))
        .and_then(|v| v.as_array())
    {
        Box::new(arr.iter())
    } else if let Some(arr) = json.get("blocks").and_then(|v| v.as_array()) {
        Box::new(arr.iter())
    } else if let Some(arr) = json.as_array() {
        Box::new(arr.iter())
    } else {
        return Err(format!(
            "Could not parse Letta memory response — unexpected shape from {base_url}"
        ));
    };

    for block in blocks_iter {
        let label = block
            .get("label")
            .or_else(|| block.get("name"))
            .and_then(|v| v.as_str())
            .unwrap_or("");
        if label == block_label {
            let value = block
                .get("value")
                .or_else(|| block.get("text"))
                .or_else(|| block.get("content"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            return Ok(value.to_string());
        }
    }

    Err(format!(
        "Letta core block '{block_label}' not found on agent {agent_id}"
    ))
}

// ── URL encoding helper (no extra dep) ───────────────────────────────────────

/// Percent-encodes a string for use in URL query parameters.
/// Only encodes characters that would break a query string.
fn urlencoding_encode(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    for byte in input.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9'
            | b'-' | b'_' | b'.' | b'~' => out.push(byte as char),
            b' ' => out.push('+'),
            b => out.push_str(&format!("%{b:02X}")),
        }
    }
    out
}
