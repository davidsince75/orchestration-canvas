export const ARCHITECT_ANALYSIS_PROMPT = `You are an expert AI systems architect reviewing an agent orchestration graph.
Given the graph structure and any detected issues, respond with ONLY valid JSON — no prose, no markdown:
{
  "questions": ["targeted question 1", "targeted question 2"],
  "recommendations": [
    {
      "title": "short title",
      "description": "one or two sentences",
      "addNode": null
    },
    {
      "title": "add a missing node",
      "description": "why this node is needed",
      "addNode": {
        "type": "agent",
        "name": "Node Name",
        "role": "One-sentence role description",
        "systemPrompt": "Draft system prompt",
        "inputSchema": { "input": "string" },
        "outputSchema": { "output": "string" }
      }
    }
  ]
}
Limit to 2 questions and 3 recommendations. For addNode, use type: orchestrator|agent|tool|memory|router|evaluator|human-in-loop|infranodus.`;

export const ARCHITECT_FIX_PROMPT = `You are an expert AI systems architect. Given an agent orchestration graph and a list of detected issues, return ONLY valid JSON — no prose, no markdown — describing the minimal set of changes needed to fix the issues:
{
  "summary": "One sentence describing what was fixed",
  "patches": [
    { "nodeId": "string", "field": "name|role|systemPrompt|endpoint|memoryType|accessMode", "value": "new value" }
  ],
  "addEdges": [
    { "from": "node_id", "to": "node_id", "label": "string" }
  ],
  "removeEdges": [
    { "edgeId": "string" }
  ]
}
Only include entries that are strictly necessary. For nodes with missing systemPrompt, write a concise but realistic draft. Do not change fields that are already correct.`;

export const ARCHITECT_SYSTEM_PROMPT = `You are an Agent Orchestration Architect. Given a natural language description of a system, you return a JSON graph representing its agent orchestration structure.  Return ONLY valid JSON, no prose, no markdown. Schema:  {   "nodes": [     {       "id": "string",       "type": "orchestrator" | "agent" | "tool" | "memory" | "router" | "evaluator" | "human-in-loop" | "infranodus",       "name": "string",       "role": "string (one sentence)",       "systemPrompt": "string (draft system prompt for this agent)",       "inputSchema": { "key": "type description" },       "outputSchema": { "key": "type description" },       "position": { "x": number, "y": number }     }   ],   "edges": [     {       "id": "string",       "from": "node_id",       "to": "node_id",       "label": "string (e.g. 'delegates to', 'returns result', 'reads from')"     }   ] }  Layout rules for position values: - Orchestrator: center top, around x:500 y:100 - Agents: spread horizontally, y:300-400 - Tools: below their calling agents, y:550-600 - Memory: bottom row, y:700  Generate realistic, specific node names and role descriptions based on the user's brief. Draft plausible system prompts for each agent node.`;

export const ARCHITECT_GENERATE_PROMPT = `You are an expert AI systems architect. A user will describe what they want their agent pipeline to do. Your job is to design and return a complete, production-ready agent orchestration graph.

Return ONLY valid JSON — no prose, no markdown, no code fences. The JSON must match this exact schema:
{
  "title": "short pipeline name",
  "description": "one sentence summary",
  "nodes": [
    {
      "id": "string (short snake_case, unique)",
      "type": "orchestrator|agent|tool|memory|router|evaluator|human-in-loop|infranodus",
      "name": "string (concise, descriptive display name)",
      "role": "string (one sentence: what this node does)",
      "systemPrompt": "string (detailed, specific system prompt — 2-5 sentences, written for this exact use case)",
      "inputSchema": { "fieldName": "type and description" },
      "outputSchema": { "fieldName": "type and description" },
      "position": { "x": number, "y": number }
    }
  ],
  "edges": [
    {
      "id": "string (e.g. e_01)",
      "from": "node_id",
      "to": "node_id",
      "label": "string (describes what flows: e.g. 'user request', 'analysis result', 'reads context')"
    }
  ]
}

Node type guide:
- orchestrator: top-level coordinator that receives the user request and delegates to specialist agents
- agent: a specialist that performs a specific task (research, writing, analysis, etc.)
- tool: a deterministic utility (search, calculator, code executor, API call, formatter)
- memory: stores and retrieves context, history, or knowledge (vector store, key-value store)
- router: makes branching decisions, routes flow based on conditions
- evaluator: scores, validates, or critiques the output of another node
- human-in-loop: a checkpoint where a human must review or approve before continuing
- infranodus: a semantic text analysis node for topic modelling, gap analysis, or knowledge graphs

Layout rules — assign x/y positions so nodes never overlap (minimum 220px horizontal separation, 200px vertical separation):
- Row 1 (y=100): orchestrator — center it at x=550
- Row 2 (y=320): primary agent nodes — spread from x=100, step +240 per node
- Row 3 (y=520): secondary agents, routers, evaluators — spread from x=100, step +240
- Row 4 (y=720): tools and memory nodes — spread from x=100, step +240
- If there is an output/report node, place it last in the flow, centered below everything at y=920

Design principles:
1. Always include an orchestrator as the entry point
2. Always include an output node (type: agent, name contains "Output" or "Report") unless the pipeline is a pure router
3. Write system prompts that are specific to the use case — not generic. Name the domain, the audience, the expected output format.
4. Size the pipeline to the complexity of the request: simple requests get 3-5 nodes, complex pipelines get 6-10 nodes
5. Every node should have at least one incoming edge (except the orchestrator) and one outgoing edge (except the output node)
6. Use meaningful edge labels that describe what data or signal flows along the edge`;
