# Orchestration Canvas — User Manual

**Version 0.3.0**

---

## Table of Contents

1. [What Is Orchestration Canvas?](#1-what-is-orchestration-canvas)
2. [Quickstart — Your First Pipeline in 5 Minutes](#2-quickstart--your-first-pipeline-in-5-minutes)
3. [Interface Overview](#3-interface-overview)
4. [Node Types](#4-node-types)
5. [Building a Pipeline](#5-building-a-pipeline)
6. [AI Features — Architect, Draft & Infer](#6-ai-features--architect-draft--infer)
7. [LLM Providers](#7-llm-providers)
8. [Data Sources](#8-data-sources)
9. [Memory Nodes](#9-memory-nodes)
10. [Output Nodes](#10-output-nodes)
11. [Running a Pipeline](#11-running-a-pipeline)
12. [Human-in-Loop Review](#12-human-in-loop-review)
13. [Starter Templates](#13-starter-templates)
14. [InfraNodus Integration](#14-infranodus-integration)
15. [Export, Import & Run History](#15-export-import--run-history)
16. [Keyboard Shortcuts & Tips](#16-keyboard-shortcuts--tips)
17. [Troubleshooting](#17-troubleshooting)
18. [Template Input Guide](#18-template-input-guide)

---

## 1. What Is Orchestration Canvas?

Orchestration Canvas is a desktop application for designing and running **multi-agent AI pipelines**. You arrange nodes on a visual canvas, connect them with edges, write a prompt, and click **Run** — the app executes every node in order, streaming output token-by-token, and renders the final result in a designed document layout.

Think of it as a flowchart builder where every box is an AI agent that can reason, remember, route, and produce structured output.

**Key capabilities:**

| Capability | Details |
|---|---|
| Visual pipeline design | Drag-and-drop canvas with 9 node types |
| AI pipeline generation | Describe what you want in plain English — Architect builds the graph |
| AI-assisted authoring | Draft system prompts, infer schemas, generate test inputs with one click |
| Multi-provider LLM support | Claude, GPT-4o, Gemini, Mistral, Ollama (local) |
| Live streaming output | Token-by-token preview with blinking cursor |
| Persistent memory | Local session memory or Letta (MemGPT) cloud/self-hosted |
| Data source injection | Feed files, folders, URLs, or databases into any node |
| Structured output rendering | Brief, Report, Data Table, Slides, Markdown Doc, and more |
| Human-in-loop | Pause the pipeline and require a human approval to continue |
| InfraNodus integration | Generate knowledge graphs from node output |

---

## 2. Quickstart — Your First Pipeline in 5 Minutes

### Step 1 — Enter your API key

In the **top bar**, paste your **Anthropic API key** (starts with `sk-ant-`). It is stored locally on your machine only.

### Step 2 — Describe your pipeline

The **Architect** panel opens automatically on an empty canvas. Type what you want the pipeline to do in plain English:

> A research assistant that searches the web, summarises findings, and writes a briefing document

Click **✦ Build Pipeline**. Architect calls Claude, designs the graph, and shows you a preview. Click **Apply to Canvas** to place the nodes.

Alternatively, click any of the **example prompt buttons** on the empty canvas to pre-fill the Architect with a common starting point.

### Step 3 — Write your prompt

Switch to **Run** mode using the toggle in the top bar. The left panel changes to a **Prompt** input. Type the question or task for this run:

> What are the main bottlenecks in transformer-based language model inference?

Click **✦ Suggest input** if you want Architect to generate a sample prompt tailored to your pipeline.

### Step 4 — Click Run Pipeline

Press **▶ Run Pipeline**. The **Output** panel opens on the right and each node streams its output in real time.

### Step 5 — Read the output

When the last node completes, the Output panel renders the formatted result.

---

### Quickstart — Build manually (3 minutes)

1. **Clear the canvas** — click the trash icon in the top bar.
2. **Drag three nodes** from the **Library** panel: Orchestrator, Agent (rename it "Analyst"), Output.
3. **Connect them** — hover over a node until handles appear, then drag edge to edge: Orchestrator → Analyst → Output.
4. **Configure the Analyst node** — click to open Node Designer. Set System prompt, Provider, Model.
5. **Write a prompt** in Run mode's Prompt panel.
6. **Click Run Pipeline**.

---

## 3. Interface Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│  TOP BAR   [ Design | Run ] [ Templates ] [ API Key ] [ Export ] …   │
├──────────┬───────────────────────────────────────────┬───────────────┤
│          │                                           │               │
│  LEFT    │              CANVAS                       │   RIGHT       │
│  PANEL   │   (nodes + edges + minimap)               │   PANEL       │
│          │                                           │               │
│  Context │                                           │  Architect    │
│  ──────  │                                           │  ──────────   │
│  Library │                                           │  Node         │
│  ──────  │                                           │  Designer     │
│  History │                                           │  ──────────   │
│          │                                           │  Output       │
│          │                                           │  Panel        │
└──────────┴───────────────────────────────────────────┴───────────────┘
```

### Top Bar

| Element | Purpose |
|---|---|
| **Design / Run** | Toggle between pipeline editing and execution mode |
| **Templates** | Load one of the starter pipelines |
| **API Key** | Enter your Anthropic API key |
| **Export / Import** | Save or load your pipeline as a JSON file |
| **Preferences** | App-wide settings |
| **▶ Run Pipeline** | Execute the current graph |
| **■ Stop** | Cancel a running pipeline |
| **Undo / Redo** | Ctrl+Z / Ctrl+Y |

### Left Panel (Design mode)

**Context** — A plain-text area for background information that you want available across the pipeline. This is separate from the per-run prompt.

**Library** — All 9 node types available to drag onto the canvas.

**Run History** — A log of previous runs. Click any entry to replay its output.

### Left Panel (Run mode)

**Prompt** — Write the initial input for this run. Click **✦ Suggest input** to have AI generate a sample prompt for your pipeline.

### Canvas

The main working area. Pan, zoom, drag nodes, connect handles, select and delete. A **Minimap** in the bottom-right corner shows the full graph at a glance. The canvas scrolls to its centre on launch, and all generated or loaded pipelines are automatically centred.

### Right Panel — Architect

A five-tab AI assistant:

| Tab | What it does |
|---|---|
| **Build** | Generate a complete pipeline from a plain-English description |
| **Diagnose** | List structural issues: missing prompts, cycles, orphaned nodes |
| **Ask** | Answer questions about your pipeline design |
| **Suggest** | Recommend improvements to the current graph |
| **Fix** | Auto-patch nodes that have validation errors |

### Right Panel — Node Designer

When you click a node on the canvas, the Node Designer opens. It shows all configurable fields for that node type plus AI-assist buttons (✦ Draft, ✦ Improve, ✦ Infer).

### Right Panel — Output Panel

During and after a run, the Output Panel shows live streaming output for each node with status badges and an expand/collapse toggle.

---

## 4. Node Types

### 🔵 Orchestrator

The entry point of your pipeline. It receives the initial prompt, coordinates downstream nodes, and handles high-level task decomposition. Every pipeline should begin with one.

### 🟢 Agent

A general-purpose LLM node. Agents do the primary work: analysis, writing, summarisation, classification, extraction, translation.

### 🟡 Tool

Represents an external service call — a REST API, database query, or webhook. Documents the endpoint and schema; at runtime forwards its input to the endpoint and passes the response downstream.

### 🔵 Memory

Persists and retrieves state across runs. Backends: local (session) or Letta (persistent cloud/self-hosted).

### 🟠 Router

Conditional branching. Examines input and directs flow to one downstream branch based on a plain-language condition. Unselected branches are marked Skipped.

### 🩵 Evaluator

Scores or judges upstream output against criteria you define. Returns a score and reasoning. Use as a quality gate.

### 🔴 Human Review

Pauses the pipeline and surfaces a review modal. Execution does not continue until you Approve or Reject. Can be bypassed during testing — see [Section 12](#12-human-in-loop-review).

### 💙 InfraNodus

Sends text to the InfraNodus API and returns a knowledge graph with top concepts, structural gaps, and research questions. Output includes an interactive constellation visualisation.

### 🟡 Output

A terminal node that renders the final pipeline result in a rich document layout. Does not call an LLM — formats and displays what arrives from upstream.

---

## 5. Building a Pipeline

### Adding nodes

Drag any item from the **Library** panel onto the canvas.

### Renaming nodes

Click a node → edit the **Name** field in the Node Designer.

### Connecting nodes

Hover over a node — connection handles appear on its edges. Drag from the **bottom handle** of one node to the **top handle** of another. Click an edge to select it and type a label.

### Deleting

Select a node or edge and press **Delete** or **Backspace**. Multi-select with Shift+click, then delete in one action.

### Execution order

The pipeline runs in **topological order**. A Router splits the graph into branches; only the matching branch executes.

### Validation bar

A bar at the bottom of the canvas shows warnings for disconnected nodes, missing fields, or cycles. Resolve errors before running.

---

## 6. AI Features — Architect, Draft & Infer

### Build tab — Generate a pipeline from description

Open the **Architect** panel (⬡ button in the top bar) and switch to the **Build** tab.

Type a plain-English description of what you want the pipeline to do:

> A competitive intelligence pipeline that monitors competitor pricing, analyses positioning changes, and produces a weekly digest with action recommendations

Click **✦ Build Pipeline**. Architect calls Claude, designs the full graph (nodes, edges, positions, system prompts, schemas), and shows you a node list preview. If it looks right, click **Apply to Canvas**. Nodes are automatically centred on the canvas.

**Tips:**
- Be specific about what the output should look like: *"…and produces a .html file"*, *"…classified by urgency"*
- Mention the domain, audience, or constraints you care about
- If the first result has too many nodes, describe a simpler version

### ✦ Draft / ✦ Improve — AI-written system prompts

Click any Agent or Orchestrator node to open the Node Designer. Next to the **System Prompt** field you will see:

- **✦ Draft** — appears when the field is empty. Click to generate a system prompt tailored to this node's role and its position in the graph.
- **✦ Improve** — appears when the field already has content. Click to rewrite the existing prompt for clarity, specificity, and format.

A preview appears below the field. Click **Apply** to stamp it in, or **Discard** to keep what you had.

### ✦ Infer — Auto-generate schemas

In the Node Designer for any Agent or Orchestrator, click **✦ Infer** next to the **Input/Output Schema** fields. Architect infers 2–4 typed fields based on the node's name, role, and system prompt.

### ✦ Suggest input — Generate a test prompt

In **Run mode**, if the Prompt field is empty, click **✦ Suggest input** (appears above the text area). Architect reads your pipeline graph and generates a concrete, realistic test input appropriate for that pipeline.

---

## 7. LLM Providers

Each LLM node (Orchestrator, Agent, Router, Evaluator) can be assigned its own provider and model independently.

### Claude (Anthropic) — default

Uses the **global API key** from the top bar.

| Model | Best for |
|---|---|
| Claude Sonnet 4.6 | Default — excellent balance of speed and quality |
| Claude Opus 4.6 | Hardest reasoning tasks, complex long-form analysis |
| Claude Haiku 4.5 | Fast, cost-efficient, high-volume tasks |

### OpenAI

Requires an **OpenAI API key** (`sk-...`) entered in the node's provider settings. Available models: GPT-4o, GPT-4o Mini, GPT-4 Turbo, o1 Mini.

### Gemini (Google)

Requires a **Google AI Studio API key**. Available models: Gemini 2.0 Flash, Gemini 1.5 Pro, Gemini 1.5 Flash.

### Mistral AI

Requires a **Mistral API key**. Available models: Mistral Large, Mistral Small, Codestral.

### Ollama (Local — no API key required)

Runs entirely on your machine. Requires [Ollama](https://ollama.com) to be installed and running.

1. Install Ollama: `brew install ollama` (macOS)
2. Pull a model: `ollama pull llama3.2`
3. In the node designer set Provider to **Ollama**, URL to `http://localhost:11434`, and pick the model

> **Tip:** Mix providers. Use Claude Opus on the Orchestrator where deep reasoning matters, and a local Ollama model on cheaper triage or formatting nodes.

---

## 8. Data Sources

Any node can have one or more **data sources** attached. At runtime, the content of each source is prepended to the node's input.

### Adding a data source

1. Click a node → scroll to **Data Sources** → **+ Add Source**
2. Choose the source type and fill in the path, URL, or connection string
3. Set the **Access Mode**: Read, Write, or Read+Write

### Source types

| Type | What it does |
|---|---|
| 📄 **File** | Reads any file: CSV, JSON, TXT, Markdown, etc. (50 KB cap) |
| 📁 **Folder** | Reads all files in a directory and concatenates contents |
| 📊 **Spreadsheet** | Reads an Excel `.xlsx` file; optionally specify a sheet |
| 🌐 **URL / API** | Fetches a URL at runtime |
| 🗄️ **Database** | Connects to a SQL/NoSQL database and returns schema/metadata |

---

## 9. Memory Nodes

Memory nodes persist information across pipeline runs.

### Local memory (default)

In-process, zero-config. Cleared when the app restarts. Good for prototyping.

### Letta memory (persistent)

[Letta](https://letta.com) (formerly MemGPT) supports:

- **Archival (vector search)** — semantic retrieval from a vector database. Best for knowledge bases.
- **Core Block (in-context)** — a named text block always in the agent's context. Best for user profiles or persistent facts.

#### Setting up Letta

```bash
# Self-hosted (free)
pip install letta
letta server   # starts on http://localhost:8283
```

Or sign up at [app.letta.com](https://app.letta.com) and copy your API key.

#### Configuring the node

1. Click the Memory node → set **Memory Backend** to **Letta**
2. Fill in API URL, API Key, Agent ID, Memory Mode, and (for Core Block) Block Name

---

## 10. Output Nodes

Output nodes render the final result in a polished document layout. Always the last node; does not call an LLM.

### Templates

| Template | Best for |
|---|---|
| 📄 **Brief** | Executive summary + key findings + recommendations + next steps |
| 📊 **Report** | Long-form structured report |
| 🔬 **Research Summary** | Topic, abstract, key concepts, identified gaps, research questions |
| 🗃️ **Data Table** | Structured JSON rendered as a formatted HTML table |
| 🎞️ **Slide Deck** | Paginated slide-style output |
| ✏️ **Markdown Doc** | Full markdown renderer |
| ⚙️ **Custom** | Define your own sections |

### Designs (visual themes)

| Design | Style |
|---|---|
| **Dark Minimal** | Slate-grey background, blue accents, monospace body |
| **Editorial Light** | Warm off-white, serif headings, print-ready feel |
| **Brand** | Gradient header, amber accents — presentation-ready |
| **Raw Markdown** | GitHub-style plain markdown |

---

## 11. Running a Pipeline

### Before you run

- **API key** must be set in the top bar
- **Validation Bar** should show no red errors
- **Prompt** panel should contain a meaningful input

### Node statuses

| Status | Meaning |
|---|---|
| ○ Pending | Waiting to execute |
| ⟳ Running | Calling its LLM or tool; output is streaming |
| ⏸ Awaiting Review | Human-in-loop node waiting for your approval |
| ✓ Done | Completed successfully |
| ✕ Error | Failed — expand the row to read the error message |
| ⊘ Skipped | Branch not taken by a Router node |

### Live streaming

While a node is Running, its output streams token-by-token. The Output Panel scrolls automatically to keep the active node visible.

### Stopping a run

Click **■ Stop** at any time. If the pipeline is currently paused at a Human Review checkpoint, clicking Stop will automatically reject the review and cancel the run.

---

## 12. Human-in-Loop Review

When the pipeline reaches a **Human Review** node, execution pauses and a modal dialog appears over the canvas.

The modal shows:
- The **instructions** written in the node designer
- The **content** produced by the upstream node — what you are reviewing
- An optional **feedback** text field
- **Approve** and **Reject** buttons

**Approve** — the pipeline continues. Any feedback text is passed as context to the next node.

**Reject** — the pipeline stops. Your feedback is recorded in run history.

**Stop Run** — clicking the Stop button while a review is pending automatically rejects the review and cancels the run.

### Bypass Review (auto-approve during testing)

If you are iterating on a pipeline and do not want to manually approve every run:

1. Click the Human Review node to open the Node Designer
2. Check **Bypass Review (auto-approve during runs)**

When bypass is enabled, the review modal never appears — the node is automatically approved and the pipeline continues uninterrupted. Disable bypass before using the pipeline in production.

### Timeout

Set **Timeout (minutes)** in the node designer. If no action is taken within that time:

| On Timeout setting | Behaviour |
|---|---|
| Auto-approve | Pipeline continues as if approved |
| Auto-reject | Pipeline stops as if rejected |
| Escalate | Pipeline stops and marks an escalation |

Set timeout to **0** to wait indefinitely (default).

---

## 13. Starter Templates

Open the **Templates** drawer from the top bar. Each template is a complete, runnable pipeline with pre-filled system prompts, schemas, and an example brief.

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

All templates load centred on the canvas. Every field is editable after loading.

> **Writing a good brief matters more than any other single factor.** See [Section 18](#18-template-input-guide) for the optimal input for every template.

---

## 14. InfraNodus Integration

[InfraNodus](https://infranodus.com) turns text into a knowledge graph, surfacing the most connected concepts, structural gaps, and research questions.

### Adding an InfraNodus node

1. Drag an **InfraNodus** node from the Library onto the canvas
2. Connect it to an upstream Agent or Orchestrator
3. Open the Node Designer → enter your **InfraNodus API key** (infranodus.com → Settings → API)
4. Choose an **analysis operation**: Topics, Gaps, Research Questions, Bridges, Latent Topics, etc.

### Viewing the graph

When the node completes, a **🌌 Visualize** button appears in the Output Panel. Click it to open the interactive constellation graph.

---

## 15. Export, Import & Run History

### Exporting a pipeline

Click **Export** in the top bar. Your entire pipeline — nodes, edges, positions, system prompts, schemas, all settings — is saved as a `.json` file.

### Importing a pipeline

Click **Import** and select a `.json` export file. The current canvas is replaced, with nodes centred automatically.

### Run History

The **History** tab in the left panel shows a timestamped log of every run. Click any entry to load a read-only replay.

---

## 16. Keyboard Shortcuts & Tips

| Action | Shortcut |
|---|---|
| Undo | Ctrl+Z |
| Redo | Ctrl+Y |
| Delete selected node or edge | Delete or Backspace |
| Multi-select | Shift+click nodes |
| Pan canvas | Click and drag on background |
| Zoom in / out | Ctrl+scroll |

### Tips

**Use the Architect Build tab first.** For any non-trivial pipeline, describing it in plain English and letting Architect generate the structure is faster and produces better results than dragging nodes manually.

**Name your nodes clearly.** Node names appear in the Output Panel and run history. "Analyst Agent" is far more useful than "Agent 3".

**Use ✦ Draft for every system prompt.** Even if you plan to edit it, the AI-drafted prompt gives you a correct starting structure specific to this node's role in your pipeline.

**Bypass Human Review during development.** Enable the bypass toggle on Human Review nodes while you are iterating, then disable it before using the pipeline for real work.

**Mix providers.** Put a fast, cheap model (Haiku, GPT-4o Mini) on early triage or formatting nodes, and reserve a powerful model (Opus, GPT-4o) only for the final synthesis node.

**Data sources are additive.** Multiple sources attached to one node are concatenated and prepended to the input. Keep total context below roughly 100 KB.

---

## 17. Troubleshooting

### "Execution requires the Tauri desktop app"

You opened the app in a browser window instead of the desktop app. Run `npm run tauri dev` during development, or open the installed `.dmg` directly.

### A node shows ✕ Error

Click the node row in the Output Panel to expand it and read the error.

| Error | Fix |
|---|---|
| API key missing or invalid | Check the top bar key, or the per-node key for non-Claude providers |
| Generation failed: pipeline too large | Simplify the description — fewer nodes — or break into smaller pipelines |
| Letta server not responding | Run `letta server` in your terminal and retry |
| Ollama model not found | Run `ollama pull <model-name>` in your terminal |
| LLM rate limit | Wait a few seconds and re-run |
| Network timeout | Check your internet connection or local server |

### Stop Run does not respond

If the pipeline is stuck at a Human Review node, click **■ Stop** — it will automatically reject the pending review and cancel the run. If Stop still appears unresponsive, there may be a long-running LLM call in progress; wait a few seconds for the current HTTP request to time out (120 s maximum).

### Human Review modal does not appear

- Ensure you are running the **Tauri desktop app** (not the browser dev server)
- Check that the Human Review node has **Bypass Review** unchecked in its Node Designer

### The Output node shows nothing

- Ensure the Output node has at least one incoming edge and all upstream nodes completed successfully
- Try switching the template to **Markdown Doc** — it renders any plain text

### Canvas is blank after import

Check that the `.json` file contains a top-level `nodes` array and an `edges` array.

### GitHub Actions build takes 15–20 minutes

Expected on the first run — Rust compiles the entire dependency tree from scratch. Subsequent runs use the cache and typically finish in 4–6 minutes.

---

## 18. Template Input Guide

The quality of a pipeline run is almost entirely determined by what you put in the Prompt panel. This section gives you the optimal input structure for every template.

A general rule: **be specific about context, constraints, and what you will use the output for.** The more the agents know, the better calibrated their output.

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

---

### Code Review System

**What it needs:** A PR URL or pasted diff, the language, and what to prioritise.

```
PR: https://github.com/myorg/api/pull/247
Language: TypeScript / Node.js

Context: This PR adds JWT refresh token rotation. Security is the top priority —
please pay particular attention to token invalidation logic and any race conditions.
```

---

### Content Creation Pipeline

**What it needs:** Topic, audience, format, tone, word count, and what to avoid.

```
Topic: Why most B2B SaaS onboarding fails in the first 7 days
Audience: SaaS founders and heads of product at 50–500 person companies
Format: blog post
Tone: Direct, practitioner voice — not academic, not hype
Word count: 1,200
Must include: the "activation moment" concept, a 3-step framework
Avoid: generic advice about "personalisation"
```

---

### RAG Pipeline

**What it needs:** A specific, answerable question. Configure the Vector Search Tool node with your actual endpoint before running.

```
Question: What does our employee handbook say about the approval process for
expenses over £500?

Top K: 5
```

---

### Data Processing Pipeline

**What it needs:** Source description, transformation rules, validation criteria, and target destination.

```
Source: Salesforce export — accounts and contacts CSV, ~12,000 rows

Transformation rules:
- Merge first_name + last_name into full_name
- Normalise country codes to ISO 3166-1 alpha-2
- Derive tier: revenue > 100k = enterprise, > 10k = mid-market, else SMB

Validation: email present and valid, account_id not null, revenue positive

Target: PostgreSQL table: crm.accounts (upsert on account_id)
```

---

### Multi-Agent Debate

**What it needs:** A clear arguable proposition (not a question), context, and number of rounds.

```
Proposition: Organisations should eliminate annual performance reviews entirely
and replace them with continuous feedback only.

Context: 200-person professional services firm considering this change.
We want the strongest arguments on both sides.

Rounds: 1
```

---

### DevOps Monitor

**What it needs:** Alert payload with service name, environment, current metrics, and recent deployments.

```
Alert: HTTP 5xx error rate on checkout-service exceeded 5% threshold (currently 12%)
Service: checkout-service
Environment: production
Recent deployments: v2.4.1 deployed at 14:32 UTC (35 minutes ago)
Current metrics: p99 latency 4.2s (up from 340ms baseline), error rate 12%
```

---

### Implementation Leadership

**What it needs:** Initiative name and goal, budget and timeline numbers, team composition, known risks.

```
Initiative: Launch a self-serve customer onboarding portal to replace manual
white-glove process.

Outcome: Customers go live without CSM touchpoint for deals under £10k ARR.
Reduce time-to-value from 14 days to 3 days.

Constraints:
- Budget: £180k total
- Timeline: 5 months
- Team: 2 engineers (part-time), 1 PM, 1 designer (contractor)
- Dependency: Legal sign-off on data handling required before build starts

Known risks: engineering team has no experience with Auth0
```

---

### Stakeholder Alignment

**What it needs:** The specific ask, who the stakeholders are with known positions, existing tensions.

```
Proposal: Move customer data infrastructure from on-premise to AWS over 18 months.
The ask: £2.4M investment approved by Executive Committee.

Stakeholders:
- CEO (supportive but worried about migration risk)
- CFO (sceptical — wants ROI, Year 1 cost neutral)
- CTO (champion — led the proposal)
- Head of Security (compliance concerns during transition)

Known tensions: CFO and CTO have clashed on infrastructure investment before.
Security team has veto power if compliance cannot be demonstrated upfront.
```

---

### Strategic Judgment

**What it needs:** The decision framed as a choice, relevant context with real numbers, what you are optimising for, options already on the table, and what the output will be used for.

```
Decision: Expand into US now, wait 12 months until UK profitability, or pursue
partnership/licensing route.

Context: UK B2B SaaS, £3.2M ARR, 80% YoY growth, pre-profitability, 18 months
runway. Inbound interest from 3 US enterprise prospects.

Goals: Preserve runway, capture market share. Not optimising for quick exit.

Options already on the table:
1. Hire US VP of Sales now, open San Francisco office
2. Wait until Q3 next year when we project profitability

Output will be used for: Board presentation in 3 weeks.
```

---

*Orchestration Canvas is built with [Tauri](https://tauri.app), [React](https://react.dev), and [Rust](https://www.rust-lang.org).*
