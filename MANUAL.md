# Orchestration Canvas — User Manual

**Version 0.1.0**

---

## Table of Contents

1. [What Is Orchestration Canvas?](#1-what-is-orchestration-canvas)
2. [Quickstart — Your First Pipeline in 5 Minutes](#2-quickstart--your-first-pipeline-in-5-minutes)
3. [Interface Overview](#3-interface-overview)
4. [Node Types](#4-node-types)
5. [Building a Pipeline](#5-building-a-pipeline)
6. [LLM Providers](#6-llm-providers)
7. [Data Sources](#7-data-sources)
8. [Memory Nodes](#8-memory-nodes)
9. [Output Nodes](#9-output-nodes)
10. [Running a Pipeline](#10-running-a-pipeline)
11. [Human-in-Loop Review](#11-human-in-loop-review)
12. [Starter Templates](#12-starter-templates)
13. [InfraNodus Integration](#13-infranodus-integration)
14. [Export, Import & Run History](#14-export-import--run-history)
15. [Keyboard Shortcuts & Tips](#15-keyboard-shortcuts--tips)
16. [Troubleshooting](#16-troubleshooting)
17. [Template Input Guide](#17-template-input-guide)

---

## 1. What Is Orchestration Canvas?

Orchestration Canvas is a desktop application for designing and running **multi-agent AI pipelines**. You arrange nodes on a visual canvas, connect them with edges, write a prompt, and click **Run** — the app executes every node in order, streaming output token-by-token, and renders the final result in a designed document layout.

Think of it as a flowchart builder where every box is an AI agent that can reason, remember, route, and produce structured output.

**Key capabilities:**

| Capability | Details |
|---|---|
| Visual pipeline design | Drag-and-drop canvas with 9 node types |
| Multi-provider LLM support | Claude, GPT-4o, Gemini, Mistral, Ollama (local) |
| Live streaming output | Token-by-token preview with blinking cursor |
| Persistent memory | Local session memory or Letta (MemGPT) cloud/self-hosted |
| Data source injection | Feed files, folders, URLs, or databases into any node |
| Structured output rendering | Brief, Report, Data Table, Slides, Markdown Doc, and more |
| Human-in-loop | Pause the pipeline and require a human approval to continue |
| InfraNodus integration | Generate knowledge graphs from node output |

---

## 2. Quickstart — Your First Pipeline in 5 Minutes

This section gets you from zero to a running pipeline as fast as possible.

### Step 1 — Enter your API key

In the **top bar**, find the key icon and paste your **Anthropic API key** (starts with `sk-ant-`). It is stored locally on your machine only and never sent anywhere except Anthropic's API.

### Step 2 — Load a starter template

Click the **Templates** button in the top bar. Choose **Research Assistant**. The canvas will populate with a pre-built pipeline of 6 nodes already wired together.

### Step 3 — Write your brief

The **Brief** panel (left side) contains a pre-filled prompt. Replace it with your actual question, for example:

> What are the main bottlenecks in transformer-based language model inference?

### Step 4 — Click Run Pipeline

Press **▶ Run Pipeline** at the bottom of the Brief panel. The **Output** panel (right side) opens and each node lights up in sequence, streaming its output in real time.

### Step 5 — Read the output

When the last node completes, the Output panel renders a formatted **Research Brief** with an executive summary, key findings, recommendations, and next steps.

That is it. You have run your first pipeline.

---

### Quickstart — Build from scratch (3 minutes)

If you prefer to build manually rather than use a template:

1. **Clear the canvas** — click the trash icon in the top bar.

2. **Drag three nodes** from the **Library** panel onto the canvas:
   - One **Orchestrator**
   - One **Agent** (rename it "Analyst")
   - One **Output**

3. **Connect them** — hover over the bottom edge of a node until a blue handle appears, then drag it to the top of the next node:
   - Orchestrator → Analyst
   - Analyst → Output

4. **Configure the Analyst node** — click it to open the Node Designer. Set:
   - **System prompt:** `You are a concise analyst. Given a question, provide a 3-paragraph analysis with a clear conclusion.`
   - **Provider:** Claude (Anthropic)
   - **Model:** Claude Sonnet 4.6

5. **Write a brief** in the Brief panel.

6. **Click Run Pipeline**.

---

## 3. Interface Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  TOP BAR   [ Templates ] [ API Key ] [ Export ] [ Prefs ]  [ ▶ ]│
├──────────┬──────────────────────────────────────┬───────────────┤
│          │                                      │               │
│  LEFT    │           CANVAS                     │   RIGHT       │
│  PANEL   │   (nodes + edges + minimap)          │   PANEL       │
│          │                                      │               │
│  Brief   │                                      │  Node         │
│  ──────  │                                      │  Designer     │
│  Library │                                      │  ──────────   │
│  ──────  │                                      │  Output       │
│  History │                                      │  Panel        │
│          │                                      │               │
└──────────┴──────────────────────────────────────┴───────────────┘
```

### Top Bar

| Element | Purpose |
|---|---|
| **Templates** | Load one of 8 starter pipelines |
| **API Key** | Enter your Anthropic API key (global; used by all Claude nodes) |
| **Export / Import** | Save or load your pipeline as a JSON file |
| **Preferences** | App-wide settings |
| **▶ Run Pipeline** | Execute the current graph with the current brief |
| **■ Stop** | Cancel a running pipeline |
| **Undo / Redo** | Step through edit history (Ctrl+Z / Ctrl+Y) |

### Left Panel

**Brief** — A plain-text area where you write the initial prompt. This is fed as input to the first node when you run the pipeline. Think of it as the question or task for the entire pipeline.

**Library** — All 9 node types available to drag onto the canvas. Each entry shows the type, label, and a short description.

**Run History** — A log of previous runs. Click any entry to replay its output.

### Canvas

The main working area. You can:
- **Pan** — click and drag on the background
- **Zoom** — Ctrl+scroll or pinch
- **Select a node** — click it to open the Node Designer
- **Move nodes** — drag by their header
- **Delete** — select and press Delete or Backspace
- **Connect nodes** — drag from the output handle of one node to the input handle of another

A **Minimap** in the bottom-right corner shows the full graph at a glance. Click it to jump to that region.

### Right Panel — Node Designer

When you click a node, the Node Designer opens on the right and shows all configurable fields for that node type: system prompt, provider, model, data sources, memory settings, output template, and so on.

### Right Panel — Output Panel

During and after a run, the Output Panel replaces the Node Designer and shows live streaming output for each node in the graph.

---

## 4. Node Types

### 🟣 Orchestrator

The entry point of your pipeline. It receives the initial brief, coordinates downstream nodes, and is typically responsible for the high-level reasoning about how to decompose the task. Every pipeline should begin with one.

Configure: Role, System prompt, Input/Output schema, Provider, Model.

### 🔵 Agent

A general-purpose LLM node. Agents do the primary work: analysis, writing, summarisation, classification, extraction, translation — anything you can describe in a system prompt.

Configure the same fields as Orchestrator, plus **Data Sources** (see Section 7).

### 🔧 Tool

Represents an external service call — a REST API, a database query, or a webhook. Tool nodes document the endpoint and schema. At runtime the node forwards its input to the configured endpoint and passes the response downstream.

Configure: Endpoint (e.g. `POST /api/search`), Input/Output schema.

### 💾 Memory

Persists and retrieves state across pipeline runs. Two backends are available:

- **Local** — in-process session memory, cleared when the app closes
- **Letta** — cloud or self-hosted MemGPT for truly persistent, searchable memory (see Section 8)

### 🔀 Router

A conditional branching node. The Router examines its input and directs flow to one of its connected downstream nodes based on a condition you define in plain language. Useful for "if urgent → escalate, else → auto-reply" style logic.

Configure: Routing condition, branch labels on each outbound edge.

### ⚖️ Evaluator

Scores or judges the output of an upstream node against criteria you define. Returns a score and a reasoning string. Use it as a quality gate before presenting output to the user.

Configure: Evaluation criteria (accuracy, tone, completeness, safety, etc.), pass threshold.

### 👤 Human Review

Pauses the pipeline and surfaces a review dialog. Execution will not continue until you click **Approve** or **Reject**. If you reject, you can provide written feedback that is injected into the next node's context.

Configure: Instructions for the reviewer, Timeout in minutes (0 = wait forever).

### 🌐 InfraNodus

Sends its input text to the InfraNodus API, which builds a knowledge graph and returns the top concepts, structural gaps, and research questions. Output automatically includes an interactive constellation visualisation in the Output Panel.

Configure: InfraNodus API key, Analysis mode.

### 📄 Output

A terminal node that renders the final pipeline output in a rich document layout. Output nodes do not call an LLM — they format and display what they receive from upstream nodes.

Configure: Template (Brief, Report, Data Table, etc.), Design (Dark Minimal, Editorial Light, etc.).

See Section 9 for full details.

---

## 5. Building a Pipeline

### Adding nodes

Drag any item from the **Library** panel onto the canvas. The node appears at the drop location.

### Renaming nodes

Click a node to open the Node Designer, then edit the **Name** field at the top.

### Connecting nodes

Hover over a node — connection handles (small circles) appear on its edges. Drag from the **bottom handle** of one node to the **top handle** of another to create a directed edge. Edges can be labelled: click an edge to select it and type a label in the inspector.

### Deleting

Select a node or edge and press **Delete** or **Backspace**.

### Execution order

The pipeline runs in **topological order** — nodes with no upstream dependencies run first. A Router node splits the graph into branches; only the matching branch executes, and the others are marked Skipped.

### Validation bar

A bar at the bottom of the canvas shows warnings for problems such as disconnected nodes, missing required fields, or cycles. Resolve all warnings before running.

---

## 6. LLM Providers

Each LLM node (Orchestrator, Agent, Router, Evaluator) can be assigned its own provider and model independently.

### Claude (Anthropic) — default

Uses the **global API key** from the top bar. No per-node key needed.

| Model | Best for |
|---|---|
| Claude Sonnet 4.6 | Default — excellent balance of speed and quality |
| Claude Opus 4.6 | Hardest reasoning tasks, complex long-form analysis |
| Claude Haiku 4.5 | Fast, cost-efficient, high-volume tasks |

### OpenAI

Requires an **OpenAI API key** (`sk-...`) entered in the node's provider settings.

Available models: GPT-4o, GPT-4o Mini, GPT-4 Turbo, o1 Mini.

### Gemini (Google)

Requires a **Google AI Studio API key**. Available models: Gemini 2.0 Flash, Gemini 1.5 Pro, Gemini 1.5 Flash.

### Mistral AI

Requires a **Mistral API key**. Available models: Mistral Large, Mistral Small, Codestral.

### Ollama (Local — no API key required)

Runs entirely on your machine. Requires [Ollama](https://ollama.com) to be installed and running.

1. Install Ollama: `brew install ollama` (macOS) or download from ollama.com
2. Pull a model: `ollama pull llama3.2`
3. In the node designer set Provider to **Ollama**, URL to `http://localhost:11434`, and pick the model

Available models: Llama 3.2, Llama 3.1, Mistral 7B, Gemma 2, Phi-3, DeepSeek R1, Qwen 2.5.

> **Tip:** Mix providers within a single pipeline. Use Claude Opus on the Orchestrator where deep reasoning matters, and a local Ollama model on cheaper triage or formatting nodes.

---

## 7. Data Sources

Any node can have one or more **data sources** attached. At runtime, the content of each source is prepended to the node's input — the LLM sees your data as context before generating its response.

### Adding a data source

1. Click a node to open the Node Designer
2. Scroll to **Data Sources** and click **+ Add Source**
3. Choose the source type and fill in the path, URL, or connection string
4. Set the **Access Mode**: Read, Write, or Read+Write

### Source types

| Type | What it does |
|---|---|
| 📄 **File** | Reads any file: CSV, JSON, TXT, Markdown, etc. (50 KB cap per file) |
| 📁 **Folder** | Reads all files in a directory and concatenates their contents |
| 📊 **Spreadsheet** | Reads an Excel `.xlsx` file; optionally specify a sheet name |
| 🌐 **URL / API** | Fetches a URL at runtime — REST API, webhook, or public dataset |
| 🗄️ **Database** | Connects to a SQL/NoSQL database and returns table schema and metadata |

### Access modes

- **Read** — data is fetched and injected into the node's context before it runs
- **Write** — the node's output is written back to the source after it runs
- **Read+Write** — both

---

## 8. Memory Nodes

Memory nodes persist information across pipeline runs — not just within a single execution, but across separate sessions on different days.

### Local memory (default)

In-process, zero-config memory. Fast to set up but cleared when the app restarts. Good for prototyping or within-session state.

Configure: Memory Type (Working, Long-term, Episodic), Access Mode.

### Letta memory (persistent)

[Letta](https://letta.com) (formerly MemGPT) is a memory management system for LLM agents. It supports two modes:

**Archival (vector search)** — stores passages in a vector database and retrieves the most semantically relevant ones when queried. Best for knowledge bases and prior research.

**Core Block (in-context)** — stores a named text block that is always in the agent's context window. Best for user profiles, preferences, or persistent facts.

#### Setting up Letta

**Option A — Self-hosted (free):**
```bash
pip install letta
letta server   # starts on http://localhost:8283
```

**Option B — Letta Cloud:**
Sign up at [app.letta.com](https://app.letta.com) and copy your API key.

#### Configuring the node

1. Click the Memory node to open the Node Designer
2. Set **Memory Backend** to **Letta**
3. Fill in:
   - **API URL** — `http://localhost:8283` (self-hosted) or `https://api.letta.com` (cloud)
   - **API Key** — leave blank for self-hosted; paste your key for cloud
   - **Agent ID** — the Letta agent this node stores memory for (e.g. `agent-abc123`)
   - **Memory Mode** — Archival or Core Block
   - **Block Name** — (Core Block only) the label of the block, e.g. `user_profile`

---

## 9. Output Nodes

Output nodes render the final result of your pipeline in a polished document layout. They are always the last node in a pipeline and do not call an LLM — they format and display whatever arrives from upstream.

### Templates

| Template | Best for |
|---|---|
| 📄 **Brief** | Executive summary + key findings + recommendations + next steps |
| 📊 **Report** | Long-form structured report: introduction, methodology, analysis, conclusion |
| 🔬 **Research Summary** | Topic, abstract, key concepts, identified gaps, research questions |
| 🗃️ **Data Table** | Renders structured JSON as a formatted, sortable HTML table |
| 🎞️ **Slide Deck** | Paginated slide-style output — each section renders as a full-screen card |
| ✏️ **Markdown Doc** | Full markdown renderer — headings, lists, code blocks, and links |
| ⚙️ **Custom** | Define your own sections — mix text, markdown, list, and table blocks |

### Designs (visual themes)

| Design | Style |
|---|---|
| **Dark Minimal** | Obsidian background, indigo accents, monospace body — default |
| **Editorial Light** | Warm off-white, serif headings, generous spacing — print-ready feel |
| **Brand** | Indigo/violet gradient header, amber accents — presentation-ready |
| **Raw Markdown** | GitHub-style plain markdown, no decorative chrome |

### Configuration

In the Node Designer for an Output node:
- **Template** — the document structure to use
- **Design** — the visual theme to apply
- **Show Raw Output** — also display the unformatted source text below the rendered view
- **Show InfraNodus Viz** — display the constellation graph if an InfraNodus node feeds into this output

### Copying output

- **Copy** button — appears on each node row in the Output Panel
- **Copy All** — top-right corner of the Output Panel; copies every node output joined together

---

## 10. Running a Pipeline

### Before you run

- Your **API key** must be set in the top bar
- The **Validation Bar** should show no red warnings
- The **Brief** panel should contain a meaningful prompt

### Node statuses

Click **▶ Run Pipeline**. Each node transitions through:

| Status | Meaning |
|---|---|
| ○ Pending | Waiting to execute |
| ⟳ Running | Calling its LLM or tool; live output is streaming |
| ✓ Done | Completed successfully |
| ✕ Error | Failed — expand the row to read the error message |
| ⊘ Skipped | Branch not taken by a Router node |

### Live streaming

While a node is Running, its output streams token-by-token with a blinking purple cursor. The Output Panel scrolls automatically to keep the active node visible.

When the node finishes, the cursor disappears and the status changes to Done. For Output nodes, the full rendered document appears at this point.

### Stopping a run

Click **■ Stop** at any time. The in-progress node is cancelled and all remaining nodes are marked Skipped.

---

## 11. Human-in-Loop Review

When the pipeline reaches a **Human Review** node, execution pauses and a modal dialog appears.

The modal shows:
- The **instructions** written in the node designer
- The **content** produced by the upstream node — what you are reviewing
- An optional **feedback** text field
- **Approve** and **Reject** buttons

**Approve** — the pipeline continues. Any text in the feedback field is passed as additional context to the next node.

**Reject** — the pipeline stops and the run is marked cancelled. Your feedback is recorded in the run history.

If you set a **Timeout** (e.g. 30 minutes) in the node designer, the review auto-approves after that time if no action is taken.

---

## 12. Starter Templates

Open the **Templates** drawer from the top bar. Each template is a complete, runnable pipeline.

| Template | What it does |
|---|---|
| **Research Assistant** | Question → web search → summarise → memory → Research Brief |
| **Customer Support Pipeline** | Ticket → triage → knowledge base → draft reply → Markdown Doc |
| **Code Review System** | PR diff → bug analysis → security check → coverage evaluation → Report |
| **Content Pipeline** | Brief → draft → edit → SEO optimise → Markdown Doc |
| **RAG Pipeline** | Query → retrieve documents → rank → synthesise → Research Brief |
| **Data Analysis Pipeline** | Ingest → clean → analyse → visualise → Data Table |
| **Multi-Agent Debate** | Topic → Agent A (for) → Agent B (against) → judge → Report |
| **DevOps Monitor** | Alert → log analysis → diagnosis → fix recommendation → Report |
| **Implementation Leadership** | Initiative → scope & milestones + risks + resource plan → feasibility stress-test → Execution Plan |
| **Stakeholder Alignment** | Proposal → stakeholder map + objection analysis → tailored messaging → human review → Alignment Brief |
| **Strategic Judgment** | Decision → options + consequences + devil's advocate → synthesis → Strategic Brief |

All templates include pre-filled system prompts, schemas, and example briefs. Every field is editable after loading.

> **Writing a good brief matters more than any other single factor.** See [Section 17](#17-template-input-guide) for the optimal input for every template.

---

## 13. InfraNodus Integration

[InfraNodus](https://infranodus.com) turns text into a knowledge graph, surfacing the most connected concepts, structural gaps, and research questions that are not immediately obvious from reading the text.

### Adding an InfraNodus node

1. Drag an **InfraNodus** node from the Library onto the canvas
2. Connect it to an upstream Agent or Orchestrator
3. Open the Node Designer and enter your **InfraNodus API key** (infranodus.com → Settings → API)
4. Choose an **analysis operation**: Topics, Gaps, Research Questions, Bridges, Latent Topics, etc.

### Viewing the graph

When the node completes, a **🌌 Visualize** button appears in the Output Panel. Click it to open the interactive constellation graph — concept nodes sized by centrality, connected by co-occurrence edges.

The visualisation also appears automatically inside an Output node if **Show InfraNodus Viz** is enabled.

---

## 14. Export, Import & Run History

### Exporting a pipeline

Click **Export** in the top bar. Your entire pipeline — nodes, edges, positions, system prompts, schemas, and all settings — is saved as a `.json` file. Share this file and anyone can import it exactly as you built it.

### Importing a pipeline

Click **Import** and select a `.json` export file. The current canvas is replaced with the imported pipeline.

### Run History

The **History** tab in the left panel shows a timestamped log of every pipeline run with:
- Date and time
- Run status (done / error / cancelled)
- Pipeline name

Click any entry to load a read-only replay of that run's output in the Output Panel.

---

## 15. Keyboard Shortcuts & Tips

| Action | Shortcut |
|---|---|
| Undo | Ctrl+Z |
| Redo | Ctrl+Y |
| Delete selected node or edge | Delete or Backspace |
| Pan canvas | Click and drag on the background |
| Zoom in / out | Ctrl+scroll |
| Reset zoom to fit | Double-click the canvas background |

### Tips

**Name your nodes clearly.** Node names appear in the Output Panel and run history. "Analyst Agent" is far more useful than "Agent 3".

**Be precise in system prompts.** State the expected output format explicitly — for example: *"Respond with a JSON array of strings, no additional prose."* The more specific you are, the more predictable the output.

**Mix providers.** Put a fast, cheap model (Haiku, GPT-4o Mini, Gemma 2) on early triage or formatting nodes, and reserve a powerful model (Opus, GPT-4o) only for the node that produces the final synthesis.

**Test one node at a time.** While building, create a minimal two-node pipeline (one Agent, one Output) to verify your system prompt works before wiring up the full graph.

**Data sources are additive.** Multiple sources attached to one node are concatenated in order and prepended to the input. Keep total context below roughly 100 KB for best results.

**Save regularly.** Use Export to save your pipeline as a `.json` file. The app does not yet auto-save.

---

## 16. Troubleshooting

### "Execution requires the Tauri desktop app"

You opened the app in a browser window instead of the desktop app. Either run `npm run tauri dev` during development, or install and open the `.dmg` directly.

### A node shows ✕ Error

Click the node row in the Output Panel to expand it and read the error. Common causes:

| Error | Fix |
|---|---|
| API key missing or invalid | Check the top bar key, or the per-node key for non-Claude providers |
| Letta server not responding | Run `letta server` in your terminal and retry |
| Ollama model not found | Run `ollama pull <model-name>` in your terminal |
| LLM rate limit | Wait a few seconds and re-run |
| Network timeout | Check your internet connection or local server |

### Letta memory not persisting

- Confirm the Letta server is running (`letta server`)
- Verify the **Agent ID** in the node designer matches an agent that exists in your Letta instance
- For Letta Cloud, double-check your API key and that the base URL is `https://api.letta.com`

### The Output node shows nothing

- Ensure the Output node has at least one incoming edge and all upstream nodes completed successfully
- Try switching the template to **Markdown Doc** — it renders any plain text without requiring structured JSON

### Canvas is blank after import

Check that the `.json` file contains a top-level `nodes` array and an `edges` array. If not, the file may be corrupted or is not a valid pipeline export.

### GitHub Actions build takes 15–20 minutes

This is expected on the first run — Rust compiles the entire dependency tree from scratch. Subsequent runs use the cache and typically finish in 4–6 minutes.

---

## 17. Template Input Guide

The quality of a pipeline run is almost entirely determined by what you put in the Brief panel. This section gives you the optimal input structure for every template — what information to provide, and why each piece matters.

A general rule applies to all templates: **be specific about context, constraints, and what you will use the output for.** The agents read your brief before doing anything — the more they know, the better calibrated their output.

---

### Research Assistant

**What it needs:** A specific, answerable research question and a desired depth.

```
Research question: What are the most effective interventions for reducing employee
burnout in remote-first tech companies?

Depth: deep

Focus on evidence from 2020 onwards. I want peer-reviewed sources where possible,
not just opinion pieces.
```

**Why specificity matters:** The Web Search Agent generates 2–3 search queries from your question. "Tell me about burnout" produces shallow queries. "What interventions reduce burnout in remote-first tech companies" produces targeted ones that retrieve far better sources.

---

### Customer Support Pipeline

**What it needs:** A realistic support ticket with user context and the channel it arrived on.

```
Ticket: My subscription renewed yesterday for £149 but I cancelled it three weeks ago.
I have the cancellation confirmation email. I want a full refund immediately.

User ID: usr_48291
Channel: email
Prior tickets: 0
```

**Why channel and history matter:** The Triage Agent uses the channel to calibrate tone (email = formal, chat = conversational) and the prior ticket count to assess urgency. Without them it defaults to generic middle-ground responses.

---

### Code Review System

**What it needs:** A PR URL or pasted diff, the language, and what to prioritise.

```
PR: https://github.com/myorg/api/pull/247
Repo: myorg/api
Branch: feature/auth-refresh-tokens
Language: TypeScript / Node.js

Context: This PR adds JWT refresh token rotation. Security is the top priority —
please pay particular attention to token invalidation logic and any race conditions
in the rotation flow.
```

**Why the priority instruction matters:** Without it, the Code Analysis Agent gives equal weight to style violations, bugs, and security issues. Telling it what matters most focuses the findings where they count.

---

### Content Creation Pipeline

**What it needs:** A full content brief — topic, audience, format, tone, word count, and what to avoid.

```
Topic: Why most B2B SaaS onboarding fails in the first 7 days — and what to do about it
Audience: SaaS founders and heads of product at 50–500 person companies
Format: blog post
Tone: Direct, practitioner voice — not academic, not hype. Like a smart colleague
explaining something they have figured out.
Word count: 1,200
Must include: the "activation moment" concept, at least one concrete example,
a 3-step framework in the conclusion
Avoid: generic advice about "personalisation"
```

**Why tone and "avoid" matter most:** These two fields have the largest impact on output quality. Without them the Writer Agent produces polished but generic content. With them it has an editorial compass.

---

### RAG Pipeline

**What it needs:** A specific, answerable question. Also: configure the Vector Search Tool node with your actual endpoint before running.

```
Question: What does our employee handbook say about the approval process for
expenses over £500?

Top K: 5
```

**Important:** This template only produces useful output once you have wired the Vector Search Tool node to a real vector database containing your documents. Without that connection, treat it as a design pattern to build on rather than a ready-to-run pipeline.

---

### Data Processing Pipeline

**What it needs:** Source description, transformation rules as concrete instructions, validation criteria, and the target destination.

```
Source: Salesforce export — accounts and contacts CSV, approximately 12,000 rows
Batch size: 500

Transformation rules:
- Merge first_name + last_name into full_name
- Normalise country codes to ISO 3166-1 alpha-2
- Derive tier field: revenue > 100k = enterprise, > 10k = mid-market, else SMB

Validation:
- email must be present and valid format
- account_id must not be null
- revenue must be a positive number

Target: PostgreSQL table: crm.accounts (upsert on account_id)
```

**Why concrete rules matter:** Vague transformation rules like "clean the data" produce vague outputs. The Transformer and Validator agents need specific, testable criteria to produce specific, testable results.

---

### Multi-Agent Debate

**What it needs:** A clear arguable proposition (not a question), context about what the conclusion will be used for, and the number of debate rounds.

```
Proposition: Organisations should eliminate annual performance reviews entirely
and replace them with continuous feedback only.

Context: We are a 200-person professional services firm considering changing our
performance management approach. We want to understand the strongest arguments
on both sides before deciding.

Rounds: 1
```

**Why proposition framing matters:** The Advocate Agent needs something to argue *for*, not a question to answer. "Should organisations eliminate performance reviews?" produces a balanced essay. "Organisations should eliminate performance reviews" produces a genuine advocacy — and a genuine critique from the Devil's Advocate.

---

### DevOps Monitor

**What it needs:** An alert payload with service name, environment, current metrics, and — critically — any recent deployments.

```
Alert: HTTP 5xx error rate on checkout-service exceeded 5% threshold (currently 12%)
Service: checkout-service
Environment: production
Recent deployments: v2.4.1 deployed at 14:32 UTC (35 minutes ago)
Current metrics: p99 latency 4.2s (up from 340ms baseline), error rate 12%,
CPU normal, memory normal
On-call engineer: @sarah-ops
```

**Why recent deployments matter most:** The Diagnostic Agent specifically looks for deployment correlation when forming its root cause hypothesis. Without this information it falls back to generic infrastructure checks and produces a much weaker diagnosis.

---

### Implementation Leadership

**What it needs:** The initiative name and goal, real budget and timeline numbers, team composition, and any known risks or dependencies.

```
Initiative: Launch a self-serve customer onboarding portal to replace our current
manual white-glove process.

Outcome: Customers can go live without a CSM touchpoint for deals under £10k ARR.
Reduce time-to-value from 14 days to 3 days.

Constraints:
- Budget: £180k total
- Timeline: must be live within 5 months
- Team: 2 engineers (part-time), 1 product manager, 1 designer (contractor)
- Dependency: Legal sign-off on data handling required before build starts

Known risks: engineering team has no experience with our identity provider (Auth0)
```

**Why real numbers matter:** The Feasibility Evaluator scores the plan from 0–10 and identifies failure modes. Vague constraints like "limited budget" produce a vague score. Real numbers produce a real assessment — including whether the timeline is achievable with the team described.

---

### Stakeholder Alignment

**What it needs:** The specific ask (what you need them to agree to), who the stakeholders are with their known positions, and any existing tensions.

```
Proposal: Move our entire customer data infrastructure from on-premise servers to AWS.
Timeline: 18 months.

The key ask: Approval from the Executive Committee to proceed with a £2.4M investment
and a 6-month migration of production systems.

Stakeholder groups:
- CEO (sponsor — supportive but worried about risk during migration)
- CFO (sceptical — wants ROI case, wants Year 1 cost neutral)
- CTO (champion — led the proposal)
- Head of Security (concerned about compliance during transition)
- VP of Engineering (anxious about workload on his teams)
- Head of Customer Success (worried about downtime affecting customers)

Known tensions: CFO and CTO have clashed before on infrastructure investment.
Security team has veto power if compliance cannot be demonstrated upfront.
```

**Why existing tensions and veto power matter:** The Concern & Objection Analyst distinguishes between stated objections and real underlying concerns. The more specific you are about who holds veto power and where past conflicts exist, the more targeted and credible the messaging strategy becomes.

---

### Strategic Judgment

**What it needs:** The actual decision framed as a choice, the relevant context with real numbers, what you are optimising for, options already on the table, and what the output will be used for.

```
Decision: Whether to expand into the US market now, wait 12 months until we reach
profitability in the UK, or pursue a partnership/licensing route instead.

Context: UK-based B2B SaaS, £3.2M ARR, growing 80% YoY, currently pre-profitability
with 18 months runway. We have inbound interest from 3 US enterprise prospects.
Two competitors entered the US last year — one is struggling, one is growing fast.

Goals: Preserve runway. Capture market share before the category gets crowded.
We are not optimising for a quick exit — we want to build a durable business.

Options already on the table:
1. Hire a US-based VP of Sales now and open a San Francisco office
2. Wait until Q3 next year when we project profitability

What this will be used for: Board presentation in 3 weeks.
```

**Why "what this will be used for" matters:** The Decision Synthesiser calibrates the language, formality, and framing of its recommendation based on the audience. Board presentation language is precise and concise. Internal team discussion language is exploratory. Without this context it defaults to a middle ground that fits neither well.

**Why listing options already on the table matters:** The Options Generator is instructed to go *beyond* the obvious options. If you do not tell it what you have already considered, it will spend time restating them rather than finding the creative reframe or the path nobody has named yet.

---

*Orchestration Canvas is built with [Tauri](https://tauri.app), [React](https://react.dev), and [Rust](https://www.rust-lang.org).*
