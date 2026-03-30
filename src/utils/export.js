// ── helpers ─────────────────────────────────────────────────────────────────

/** Simple topological sort (Kahn's algorithm) – returns nodes in exec order. */
function topoSort(nodes, edges) {
  const inDeg = Object.fromEntries(nodes.map(n => [n.id, 0]));
  const adj   = Object.fromEntries(nodes.map(n => [n.id, []]));
  for (const e of edges) {
    if (inDeg[e.to]   !== undefined) inDeg[e.to]++;
    if (adj[e.from])                 adj[e.from].push(e.to);
  }
  const queue  = nodes.map(n => n.id).filter(id => inDeg[id] === 0);
  const sorted = [];
  while (queue.length) {
    const curr = queue.shift();
    sorted.push(curr);
    for (const nxt of adj[curr] || []) {
      if (--inDeg[nxt] === 0) queue.push(nxt);
    }
  }
  // any nodes not reached (cycles) appended at end
  const seen = new Set(sorted);
  for (const n of nodes) if (!seen.has(n.id)) sorted.push(n.id);
  return sorted.map(id => nodes.find(n => n.id === id)).filter(Boolean);
}

/** Convert a node name to a safe PascalCase identifier. */
function toPascal(name) {
  return (name || 'Node')
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .split(/[\s_-]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

/** Convert a node name to snake_case. */
function toSnake(name) {
  return (name || 'node')
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

// ── Python scaffold ──────────────────────────────────────────────────────────

function pythonImportsFor(nodes) {
  const providers = new Set(nodes.map(n => n.llmProvider || 'claude-api'));
  const lines = ['import os'];
  if (providers.has('claude-api'))  lines.push('import anthropic');
  if (providers.has('openai'))      lines.push('import openai');
  if (providers.has('gemini'))      lines.push('import google.generativeai as genai');
  if (providers.has('mistral'))     lines.push('from mistralai.client import MistralClient');
  if (providers.has('ollama'))      lines.push('import requests  # ollama via REST');
  if (nodes.some(n => n.type === 'infranodus')) lines.push('import requests');
  lines.push('from typing import Optional');
  return lines.join('\n');
}

function pythonClassFor(node) {
  const cls   = toPascal(node.name);
  const prov  = node.llmProvider || 'claude-api';
  const model = node.llmModel    || 'claude-sonnet-4-6';
  const sysPr = (node.systemPrompt || '').replace(/`/g, "'").replace(/\\/g, '\\\\');
  const lines = [];

  lines.push(`class ${cls}:`);
  lines.push(`    """${node.type} — ${node.name || node.id}"""`);
  lines.push('');

  switch (node.type) {
    case 'tool':
      lines.push('    def run(self, input_text: str) -> str:');
      lines.push('        # TODO: implement tool logic');
      lines.push('        return input_text');
      break;

    case 'memory':
      lines.push('    def __init__(self):');
      lines.push('        self._store: dict = {}');
      lines.push('');
      lines.push('    def store(self, key: str, value: str) -> None:');
      lines.push('        self._store[key] = value');
      lines.push('');
      lines.push('    def retrieve(self, key: str) -> Optional[str]:');
      lines.push('        return self._store.get(key)');
      lines.push('');
      lines.push('    def run(self, input_text: str) -> str:');
      lines.push('        return input_text  # passthrough');
      break;

    case 'router': {
      const routes = (node.routerRoutes || '').split('\n').filter(Boolean);
      lines.push('    ROUTES = [');
      routes.forEach(r => lines.push(`        "${r.split('→')[0]?.trim() || r}",`));
      if (!routes.length) lines.push('        # add your route names here');
      lines.push('    ]');
      lines.push('');
      lines.push('    def run(self, input_text: str) -> str:');
      lines.push('        # TODO: classify input and return a route name from ROUTES');
      lines.push('        return self.ROUTES[0] if self.ROUTES else "default"');
      break;
    }

    case 'evaluator':
      lines.push(`    CRITERIA = """${node.evalCriteria || 'Define evaluation criteria here'}"""`);
      lines.push(`    PASS_THRESHOLD = ${node.evalThreshold ?? 7}`);
      lines.push('');
      lines.push('    def run(self, input_text: str) -> str:');
      lines.push('        # TODO: evaluate input against CRITERIA, return score + verdict');
      lines.push('        return input_text');
      break;

    case 'human-in-loop':
      lines.push('    def run(self, input_text: str) -> str:');
      lines.push(`        instructions = """${node.hilInstructions || 'Review the content and type APPROVE or REJECT:'}"""`);
      lines.push('        print(f"\\n[HUMAN REVIEW REQUIRED]\\n{instructions}\\n{input_text}\\n")');
      lines.push('        decision = input("Decision (APPROVE/REJECT): ").strip().upper()');
      lines.push('        if decision != "APPROVE":');
      lines.push('            raise RuntimeError(f"Human reviewer rejected: {input_text[:80]}")');
      lines.push('        return input_text');
      break;

    case 'infranodus':
      lines.push('    _API_KEY = os.environ.get("INFRANODUS_API_KEY", "")');
      lines.push(`    _OPERATION = "${node.infranodusOp || 'analyze-text'}"`);
      lines.push(`    _GRAPH_NAME = "${node.infranodusGraph || 'my-graph'}"`);
      lines.push('');
      lines.push('    def run(self, input_text: str) -> str:');
      lines.push('        resp = requests.post(');
      lines.push('            "https://infranodus.com/api/v1/graphAndStatements",');
      lines.push('            headers={"Authorization": f"Bearer {self._API_KEY}"},');
      lines.push('            json={"statement": input_text, "context": self._GRAPH_NAME},');
      lines.push('            timeout=30,');
      lines.push('        )');
      lines.push('        resp.raise_for_status()');
      lines.push('        return str(resp.json())');
      break;

    default: {
      // orchestrator / agent — LLM call
      switch (prov) {
        case 'openai':
          lines.push('    _client = openai.OpenAI(api_key=os.environ.get("OPENAI_API_KEY", ""))');
          lines.push(`    _MODEL  = "${model}"`);
          lines.push(`    SYSTEM_PROMPT = """${sysPr}"""`);
          lines.push('');
          lines.push('    def run(self, input_text: str) -> str:');
          lines.push('        resp = self._client.chat.completions.create(');
          lines.push('            model=self._MODEL,');
          lines.push('            messages=[');
          lines.push('                {"role": "system",  "content": self.SYSTEM_PROMPT},');
          lines.push('                {"role": "user",    "content": input_text},');
          lines.push('            ],');
          lines.push('        )');
          lines.push('        return resp.choices[0].message.content');
          break;
        case 'gemini':
          lines.push(`    _MODEL  = "${model}"`);
          lines.push(`    SYSTEM_PROMPT = """${sysPr}"""`);
          lines.push('');
          lines.push('    def run(self, input_text: str) -> str:');
          lines.push('        genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))');
          lines.push('        model = genai.GenerativeModel(self._MODEL)');
          lines.push('        resp  = model.generate_content(f"{self.SYSTEM_PROMPT}\\n\\n{input_text}")');
          lines.push('        return resp.text');
          break;
        case 'mistral':
          lines.push('    _client = MistralClient(api_key=os.environ.get("MISTRAL_API_KEY", ""))');
          lines.push(`    _MODEL  = "${model}"`);
          lines.push(`    SYSTEM_PROMPT = """${sysPr}"""`);
          lines.push('');
          lines.push('    def run(self, input_text: str) -> str:');
          lines.push('        from mistralai.models.chat_completion import ChatMessage');
          lines.push('        resp = self._client.chat(');
          lines.push('            model=self._MODEL,');
          lines.push('            messages=[');
          lines.push('                ChatMessage(role="system",  content=self.SYSTEM_PROMPT),');
          lines.push('                ChatMessage(role="user",    content=input_text),');
          lines.push('            ],');
          lines.push('        )');
          lines.push('        return resp.choices[0].message.content');
          break;
        case 'ollama':
          lines.push(`    _BASE_URL = "${node.ollamaUrl || 'http://localhost:11434'}"`);
          lines.push(`    _MODEL    = "${model}"`);
          lines.push(`    SYSTEM_PROMPT = """${sysPr}"""`);
          lines.push('');
          lines.push('    def run(self, input_text: str) -> str:');
          lines.push('        resp = requests.post(');
          lines.push('            f"{self._BASE_URL}/api/chat",');
          lines.push('            json={');
          lines.push('                "model": self._MODEL,');
          lines.push('                "stream": False,');
          lines.push('                "messages": [');
          lines.push('                    {"role": "system",  "content": self.SYSTEM_PROMPT},');
          lines.push('                    {"role": "user",    "content": input_text},');
          lines.push('                ],');
          lines.push('            },');
          lines.push('            timeout=120,');
          lines.push('        )');
          lines.push('        resp.raise_for_status()');
          lines.push('        return resp.json()["message"]["content"]');
          break;
        default: // claude-api
          lines.push('    _client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))');
          lines.push(`    _MODEL  = "${model}"`);
          lines.push(`    SYSTEM_PROMPT = """${sysPr}"""`);
          lines.push('');
          lines.push('    def run(self, input_text: str) -> str:');
          lines.push('        msg = self._client.messages.create(');
          lines.push('            model=self._MODEL,');
          lines.push('            max_tokens=4096,');
          lines.push('            system=self.SYSTEM_PROMPT,');
          lines.push('            messages=[{"role": "user", "content": input_text}],');
          lines.push('        )');
          lines.push('        return msg.content[0].text');
      }
    }
  }
  return lines.join('\n');
}

export function exportPython(graph) {
  const nodes  = graph.nodes || [];
  const edges  = graph.edges || [];
  const sorted = topoSort(nodes, edges);

  const sep = '\n# ' + '─'.repeat(57) + '\n';

  const header = [
    '"""',
    'Agent Orchestration Scaffold',
    'Generated by Agent Orchestrator Design UI',
    `Date: ${new Date().toISOString().slice(0, 10)}`,
    '',
    'Install dependencies:',
    '  pip install anthropic openai google-generativeai mistralai requests',
    '"""',
  ].join('\n');

  const imports = pythonImportsFor(nodes);

  const classes = sorted.map(n => pythonClassFor(n)).join('\n\n\n');

  // pipeline runner
  const insts = sorted.map(n => `    ${toSnake(n.name)} = ${toPascal(n.name)}()`).join('\n');
  const calls  = [];
  if (sorted.length) {
    calls.push(`    result = ${toSnake(sorted[0].name)}.run(user_input)`);
    for (let i = 1; i < sorted.length; i++) {
      calls.push(`    result = ${toSnake(sorted[i].name)}.run(result)`);
    }
  } else {
    calls.push('    result = user_input');
  }

  const pipeline = [
    'def run_pipeline(user_input: str) -> str:',
    insts,
    '',
    ...calls,
    '    return result',
  ].join('\n');

  const main = [
    'if __name__ == "__main__":',
    '    output = run_pipeline("Your input here")',
    '    print(output)',
  ].join('\n');

  return [header, imports, sep + '# Node Classes' + sep, classes, sep + '# Pipeline' + sep, pipeline, '', main].join('\n');
}

// ── TypeScript scaffold ──────────────────────────────────────────────────────

function tsImportsFor(nodes) {
  const providers = new Set(nodes.map(n => n.llmProvider || 'claude-api'));
  const lines = [];
  if (providers.has('claude-api')) lines.push("import Anthropic from '@anthropic-ai/sdk';");
  if (providers.has('openai'))     lines.push("import OpenAI from 'openai';");
  if (providers.has('gemini'))     lines.push("import { GoogleGenerativeAI } from '@google/generative-ai';");
  if (providers.has('mistral'))    lines.push("import MistralClient from '@mistralai/mistralai';");
  if (providers.has('ollama') || nodes.some(n => n.type === 'infranodus')) {
    lines.push("// node-fetch or global fetch (Node 18+)");
  }
  return lines.join('\n');
}

function tsClassFor(node) {
  const cls   = toPascal(node.name);
  const prov  = node.llmProvider || 'claude-api';
  const model = node.llmModel    || 'claude-sonnet-4-6';
  const sysPr = (node.systemPrompt || '').replace(/`/g, "'").replace(/\\/g, '\\\\');
  const lines = [];

  lines.push(`/** ${node.type} — ${node.name || node.id} */`);
  lines.push(`class ${cls} {`);

  switch (node.type) {
    case 'tool':
      lines.push('  async run(input: string): Promise<string> {');
      lines.push('    // TODO: implement tool logic');
      lines.push('    return input;');
      lines.push('  }');
      break;

    case 'memory':
      lines.push('  private store = new Map<string, string>();');
      lines.push('');
      lines.push('  set(key: string, value: string): void { this.store.set(key, value); }');
      lines.push('  get(key: string): string | undefined { return this.store.get(key); }');
      lines.push('');
      lines.push('  async run(input: string): Promise<string> { return input; }');
      break;

    case 'router': {
      const routes = (node.routerRoutes || '').split('\n').filter(Boolean);
      const routeNames = routes.map(r => `'${r.split('→')[0]?.trim() || r}'`).join(' | ') || 'string';
      lines.push(`  async run(input: string): Promise<${routeNames}> {`);
      lines.push('    // TODO: classify input and return appropriate route');
      const first = routes[0]?.split('→')[0]?.trim() || 'default';
      lines.push(`    return '${first}';`);
      lines.push('  }');
      break;
    }

    case 'evaluator':
      lines.push(`  private criteria = \`${node.evalCriteria || 'Define evaluation criteria here'}\`;`);
      lines.push(`  private passThreshold = ${node.evalThreshold ?? 7};`);
      lines.push('');
      lines.push('  async run(input: string): Promise<string> {');
      lines.push('    // TODO: evaluate input against this.criteria, return score + verdict');
      lines.push('    return input;');
      lines.push('  }');
      break;

    case 'human-in-loop':
      lines.push(`  private instructions = \`${node.hilInstructions || 'Review and APPROVE or REJECT:'}\`;`);
      lines.push('');
      lines.push('  async run(input: string): Promise<string> {');
      lines.push('    // In a real app, present this to a human via UI/webhook/email');
      lines.push('    console.log(`\\n[HUMAN REVIEW]\\n${this.instructions}\\n${input}\\n`);');
      lines.push('    // Simulate approval — replace with real gate');
      lines.push('    return input;');
      lines.push('  }');
      break;

    case 'infranodus':
      lines.push(`  private readonly apiKey = process.env.INFRANODUS_API_KEY ?? '';`);
      lines.push(`  private readonly operation = '${node.infranodusOp || 'analyze-text'}';`);
      lines.push(`  private readonly graphName = '${node.infranodusGraph || 'my-graph'}';`);
      lines.push('');
      lines.push('  async run(input: string): Promise<string> {');
      lines.push('    const res = await fetch(');
      lines.push("      'https://infranodus.com/api/v1/graphAndStatements',");
      lines.push('      {');
      lines.push("        method: 'POST',");
      lines.push("        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },");
      lines.push('        body: JSON.stringify({ statement: input, context: this.graphName }),');
      lines.push('      },');
      lines.push('    );');
      lines.push('    if (!res.ok) throw new Error(`InfraNodus error: ${res.status}`);');
      lines.push('    return JSON.stringify(await res.json());');
      lines.push('  }');
      break;

    default: {
      switch (prov) {
        case 'openai':
          lines.push(`  private client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });`);
          lines.push(`  private model  = '${model}';`);
          lines.push(`  private systemPrompt = \`${sysPr}\`;`);
          lines.push('');
          lines.push('  async run(input: string): Promise<string> {');
          lines.push('    const res = await this.client.chat.completions.create({');
          lines.push('      model: this.model,');
          lines.push('      messages: [');
          lines.push('        { role: "system", content: this.systemPrompt },');
          lines.push('        { role: "user",   content: input },');
          lines.push('      ],');
          lines.push('    });');
          lines.push('    return res.choices[0].message.content ?? "";');
          lines.push('  }');
          break;
        case 'gemini':
          lines.push(`  private ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');`);
          lines.push(`  private model = '${model}';`);
          lines.push(`  private systemPrompt = \`${sysPr}\`;`);
          lines.push('');
          lines.push('  async run(input: string): Promise<string> {');
          lines.push('    const model  = this.ai.getGenerativeModel({ model: this.model });');
          lines.push('    const result = await model.generateContent(`${this.systemPrompt}\\n\\n${input}`);');
          lines.push('    return result.response.text();');
          lines.push('  }');
          break;
        case 'mistral':
          lines.push(`  private client = new MistralClient(process.env.MISTRAL_API_KEY ?? '');`);
          lines.push(`  private model  = '${model}';`);
          lines.push(`  private systemPrompt = \`${sysPr}\`;`);
          lines.push('');
          lines.push('  async run(input: string): Promise<string> {');
          lines.push('    const res = await this.client.chat({');
          lines.push('      model: this.model,');
          lines.push('      messages: [');
          lines.push('        { role: "system", content: this.systemPrompt },');
          lines.push('        { role: "user",   content: input },');
          lines.push('      ],');
          lines.push('    });');
          lines.push('    return res.choices[0].message.content ?? "";');
          lines.push('  }');
          break;
        case 'ollama':
          lines.push(`  private baseUrl = '${node.ollamaUrl || 'http://localhost:11434'}';`);
          lines.push(`  private model   = '${model}';`);
          lines.push(`  private systemPrompt = \`${sysPr}\`;`);
          lines.push('');
          lines.push('  async run(input: string): Promise<string> {');
          lines.push('    const res = await fetch(`${this.baseUrl}/api/chat`, {');
          lines.push("      method: 'POST',");
          lines.push("      headers: { 'Content-Type': 'application/json' },");
          lines.push('      body: JSON.stringify({');
          lines.push('        model: this.model, stream: false,');
          lines.push('        messages: [');
          lines.push('          { role: "system", content: this.systemPrompt },');
          lines.push('          { role: "user",   content: input },');
          lines.push('        ],');
          lines.push('      }),');
          lines.push('    });');
          lines.push('    if (!res.ok) throw new Error(`Ollama error: ${res.status}`);');
          lines.push('    const data = await res.json();');
          lines.push('    return data.message.content;');
          lines.push('  }');
          break;
        default: // claude-api
          lines.push(`  private client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });`);
          lines.push(`  private model  = '${model}';`);
          lines.push(`  private systemPrompt = \`${sysPr}\`;`);
          lines.push('');
          lines.push('  async run(input: string): Promise<string> {');
          lines.push('    const msg = await this.client.messages.create({');
          lines.push('      model:     this.model,');
          lines.push('      max_tokens: 4096,');
          lines.push('      system:    this.systemPrompt,');
          lines.push('      messages:  [{ role: "user", content: input }],');
          lines.push('    });');
          lines.push('    return (msg.content[0] as Anthropic.TextBlock).text;');
          lines.push('  }');
      }
    }
  }

  lines.push('}');
  return lines.join('\n');
}

export function exportTypeScript(graph) {
  const nodes  = graph.nodes || [];
  const edges  = graph.edges || [];
  const sorted = topoSort(nodes, edges);

  const sep = '\n// ' + '─'.repeat(57) + '\n';

  const header = [
    '/**',
    ' * Agent Orchestration Scaffold',
    ' * Generated by Agent Orchestrator Design UI',
    ` * Date: ${new Date().toISOString().slice(0, 10)}`,
    ' *',
    ' * Install dependencies:',
    ' *   npm install @anthropic-ai/sdk openai @google/generative-ai @mistralai/mistralai',
    ' */',
  ].join('\n');

  const imports = tsImportsFor(nodes);

  const classes = sorted.map(n => tsClassFor(n)).join('\n\n');

  // pipeline runner
  const insts = sorted.map(n => `  const ${toSnake(n.name)} = new ${toPascal(n.name)}();`).join('\n');
  const calls  = [];
  if (sorted.length) {
    calls.push(`  let result = await ${toSnake(sorted[0].name)}.run(userInput);`);
    for (let i = 1; i < sorted.length; i++) {
      calls.push(`  result = await ${toSnake(sorted[i].name)}.run(result);`);
    }
  } else {
    calls.push('  const result = userInput;');
  }

  const pipeline = [
    'async function runPipeline(userInput: string): Promise<string> {',
    insts,
    '',
    ...calls,
    '  return result;',
    '}',
  ].join('\n');

  const main = [
    '// Entry point',
    "runPipeline('Your input here')",
    '  .then(console.log)',
    '  .catch(console.error);',
  ].join('\n');

  return [header, imports, sep + '// Node Classes' + sep, classes, sep + '// Pipeline' + sep, pipeline, '', main].join('\n');
}

// ── Anthropic SDK multi-agent scaffold ───────────────────────────────────────

export function exportAnthropicSDK(graph) {
  const nodes  = graph.nodes || [];
  const edges  = graph.edges || [];
  const sorted = topoSort(nodes, edges);
  const date   = new Date().toISOString().slice(0, 10);
  const sep    = '\n# ' + '─'.repeat(57) + '\n';

  const lines = [];
  lines.push('"""');
  lines.push('Anthropic SDK Multi-Agent Scaffold');
  lines.push('Generated by Agent Orchestrator Design UI');
  lines.push(`Date: ${date}`);
  lines.push('');
  lines.push('Install:  pip install anthropic');
  lines.push('Docs:     https://docs.anthropic.com/en/docs/agents-and-tools/overview');
  lines.push('"""');
  lines.push('');
  lines.push('import os');
  lines.push('import anthropic');
  lines.push('from typing import Optional');
  lines.push('');
  lines.push('client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))');
  lines.push('');

  lines.push(sep + '# Agent definitions' + sep);

  sorted.forEach(node => {
    const name     = toPascal(node.name);
    const model    = node.llmModel || 'claude-sonnet-4-6';
    const sysPr    = (node.systemPrompt || '').replace(/"""/g, "'''");
    const isLLM    = ['orchestrator', 'agent'].includes(node.type);

    lines.push(`# ── ${node.name} (${node.type}) ──`);

    if (node.type === 'tool') {
      lines.push(`def ${toSnake(node.name)}_tool(input_text: str) -> str:`);
      lines.push(`    """Tool: ${node.name}"""`);
      lines.push('    # TODO: implement tool logic');
      lines.push('    return input_text');
      lines.push('');
      lines.push(`${toSnake(node.name)}_definition = {`);
      lines.push(`    "name": "${toSnake(node.name)}",`);
      lines.push(`    "description": "${node.role || node.name}",`);
      lines.push('    "input_schema": {');
      lines.push('        "type": "object",');
      lines.push('        "properties": {"input": {"type": "string"}},');
      lines.push('        "required": ["input"],');
      lines.push('    },');
      lines.push('}');
    } else if (isLLM) {
      lines.push(`def run_${toSnake(node.name)}(input_text: str, tools: list = []) -> str:`);
      lines.push(`    """${node.type}: ${node.name}"""`);
      lines.push(`    system = """${sysPr}"""`);
      lines.push(`    messages = [{"role": "user", "content": input_text}]`);
      lines.push(`    response = client.messages.create(`);
      lines.push(`        model="${model}",`);
      lines.push('        max_tokens=4096,');
      lines.push('        system=system,');
      lines.push('        tools=tools,');
      lines.push('        messages=messages,');
      lines.push('    )');
      lines.push('    # Handle tool_use blocks if any tools are provided');
      lines.push('    for block in response.content:');
      lines.push('        if block.type == "text":');
      lines.push('            return block.text');
      lines.push('    return ""');
    } else {
      lines.push(`def run_${toSnake(node.name)}(input_text: str) -> str:`);
      lines.push(`    """${node.type}: ${node.name}"""`);
      lines.push('    # TODO: implement logic');
      lines.push('    return input_text');
    }
    lines.push('');
  });

  lines.push(sep + '# Pipeline' + sep);
  lines.push('def run_pipeline(user_input: str) -> str:');
  if (sorted.length) {
    lines.push(`    result = run_${toSnake(sorted[0].name)}(user_input)`);
    for (let i = 1; i < sorted.length; i++) {
      const fn = sorted[i].type === 'tool'
        ? `${toSnake(sorted[i].name)}_tool`
        : `run_${toSnake(sorted[i].name)}`;
      lines.push(`    result = ${fn}(result)`);
    }
  } else {
    lines.push('    result = user_input');
  }
  lines.push('    return result');
  lines.push('');
  lines.push('');
  lines.push('if __name__ == "__main__":');
  lines.push('    print(run_pipeline("Your input here"))');

  return lines.join('\n');
}

// ── LangGraph scaffold ───────────────────────────────────────────────────────

export function exportLangGraph(graph) {
  const nodes  = graph.nodes || [];
  const edges  = graph.edges || [];
  const sorted = topoSort(nodes, edges);
  const date   = new Date().toISOString().slice(0, 10);
  const sep    = '\n# ' + '─'.repeat(57) + '\n';

  const lines = [];
  lines.push('"""');
  lines.push('LangGraph Scaffold');
  lines.push('Generated by Agent Orchestrator Design UI');
  lines.push(`Date: ${date}`);
  lines.push('');
  lines.push('Install:  pip install langgraph langchain-anthropic langchain-openai');
  lines.push('Docs:     https://langchain-ai.github.io/langgraph/');
  lines.push('"""');
  lines.push('');
  lines.push('import os');
  lines.push('from typing import TypedDict, Annotated');
  lines.push('from langgraph.graph import StateGraph, END');
  lines.push('from langchain_anthropic import ChatAnthropic');
  lines.push('from langchain_core.messages import HumanMessage, SystemMessage');
  lines.push('');
  lines.push('# ── State ──────────────────────────────────────────────────');
  lines.push('class GraphState(TypedDict):');
  lines.push('    input:    str');
  lines.push('    output:   str');
  lines.push('    messages: list');
  lines.push('');

  lines.push(sep + '# Node functions' + sep);

  const providers = new Set(nodes.map(n => n.llmProvider || 'claude-api'));
  if (providers.has('claude-api')) {
    lines.push('llm_claude = ChatAnthropic(');
    lines.push('    model="claude-sonnet-4-6",');
    lines.push('    anthropic_api_key=os.environ.get("ANTHROPIC_API_KEY", ""),');
    lines.push(')');
    lines.push('');
  }
  if (providers.has('openai')) {
    lines.push('from langchain_openai import ChatOpenAI');
    lines.push('llm_openai = ChatOpenAI(model="gpt-4o", api_key=os.environ.get("OPENAI_API_KEY", ""))');
    lines.push('');
  }

  sorted.forEach(node => {
    const fnName = toSnake(node.name);
    const model  = node.llmModel    || 'claude-sonnet-4-6';
    const prov   = node.llmProvider || 'claude-api';
    const sysPr  = (node.systemPrompt || '').replace(/"""/g, "'''");
    const llmVar = prov === 'openai' ? 'llm_openai' : 'llm_claude';

    lines.push(`def node_${fnName}(state: GraphState) -> GraphState:`);
    lines.push(`    """${node.type}: ${node.name}"""`);

    if (['orchestrator', 'agent'].includes(node.type)) {
      lines.push(`    system = """${sysPr}"""`);
      lines.push(`    response = ${llmVar}.invoke([`);
      lines.push('        SystemMessage(content=system),');
      lines.push('        HumanMessage(content=state["output"] or state["input"]),');
      lines.push('    ])');
      lines.push('    return {**state, "output": response.content}');
    } else if (node.type === 'router') {
      lines.push('    # Return state; routing decision handled by conditional edge');
      lines.push('    return state');
    } else if (node.type === 'human-in-loop') {
      lines.push('    # Interrupt for human review — langgraph handles via interrupt()');
      lines.push('    from langgraph.types import interrupt');
      lines.push('    human_decision = interrupt({"content": state["output"] or state["input"]})');
      lines.push('    if human_decision.get("approved"):');
      lines.push('        return state');
      lines.push('    raise ValueError("Human reviewer rejected the content")');
    } else {
      lines.push('    # TODO: implement node logic');
      lines.push('    return state');
    }
    lines.push('');
  });

  // Build graph
  lines.push(sep + '# Graph assembly' + sep);
  lines.push('def build_graph() -> StateGraph:');
  lines.push('    builder = StateGraph(GraphState)');
  lines.push('');
  sorted.forEach(node => {
    lines.push(`    builder.add_node("${toSnake(node.name)}", node_${toSnake(node.name)})`);
  });
  lines.push('');

  // Edges from graph
  if (sorted.length > 0) {
    lines.push(`    builder.set_entry_point("${toSnake(sorted[0].name)}")`);
    edges.forEach(e => {
      const fromNode = nodes.find(n => n.id === e.from);
      const toNode   = nodes.find(n => n.id === e.to);
      if (!fromNode || !toNode) return;
      const fromFn = toSnake(fromNode.name);
      const toFn   = toSnake(toNode.name);
      if (fromNode.type === 'router') {
        lines.push(`    # builder.add_conditional_edges("${fromFn}", route_${fromFn}, {...})`);
      } else {
        lines.push(`    builder.add_edge("${fromFn}", "${toFn}")`);
      }
    });
    // Add END edge for last node
    const lastNode = sorted[sorted.length - 1];
    if (lastNode) {
      lines.push(`    builder.add_edge("${toSnake(lastNode.name)}", END)`);
    }
  }
  lines.push('    return builder.compile()');
  lines.push('');
  lines.push('');
  lines.push('if __name__ == "__main__":');
  lines.push('    graph = build_graph()');
  lines.push('    initial_state: GraphState = {"input": "Your input here", "output": "", "messages": []}');
  lines.push('    result = graph.invoke(initial_state)');
  lines.push('    print(result["output"])');

  return lines.join('\n');
}

// ── CrewAI scaffold ──────────────────────────────────────────────────────────

export function exportCrewAI(graph) {
  const nodes  = graph.nodes || [];
  const edges  = graph.edges || [];
  const sorted = topoSort(nodes, edges);
  const date   = new Date().toISOString().slice(0, 10);
  const sep    = '\n# ' + '─'.repeat(57) + '\n';

  const lines = [];
  lines.push('"""');
  lines.push('CrewAI Scaffold');
  lines.push('Generated by Agent Orchestrator Design UI');
  lines.push(`Date: ${date}`);
  lines.push('');
  lines.push('Install:  pip install crewai crewai-tools');
  lines.push('Docs:     https://docs.crewai.com/');
  lines.push('"""');
  lines.push('');
  lines.push('import os');
  lines.push('from crewai import Agent, Task, Crew, Process');
  lines.push('from crewai_tools import BaseTool');
  lines.push('');

  lines.push(sep + '# Tools' + sep);
  const toolNodes = nodes.filter(n => n.type === 'tool');
  toolNodes.forEach(node => {
    const cls = toPascal(node.name);
    lines.push(`class ${cls}Tool(BaseTool):`);
    lines.push(`    name: str = "${node.name}"`);
    lines.push(`    description: str = "${(node.role || node.name).replace(/"/g, "'")}"`);
    lines.push('');
    lines.push('    def _run(self, input_text: str) -> str:');
    lines.push('        # TODO: implement tool logic');
    lines.push('        return input_text');
    lines.push('');
  });

  lines.push(sep + '# Agents' + sep);
  const agentNodes = sorted.filter(n => ['orchestrator', 'agent'].includes(n.type));
  agentNodes.forEach(node => {
    const varName = toSnake(node.name);
    const model   = node.llmModel || 'claude-sonnet-4-6';
    const role    = (node.role || node.name).replace(/'/g, "\\'");
    const goal    = (node.systemPrompt || `Complete tasks as ${node.name}`).split('\n')[0].replace(/'/g, "\\'");
    const backstory = (node.systemPrompt || '').replace(/'/g, "\\'").slice(0, 200);

    // Collect tools for this agent
    const agentTools = edges
      .filter(e => e.from === node.id)
      .map(e => nodes.find(n => n.id === e.to))
      .filter(n => n?.type === 'tool')
      .map(n => `${toPascal(n.name)}Tool()`);

    lines.push(`${varName} = Agent(`);
    lines.push(`    role="${role}",`);
    lines.push(`    goal="${goal}",`);
    lines.push(`    backstory="${backstory || role}",`);
    lines.push(`    llm="anthropic/${model}",`);
    if (agentTools.length) {
      lines.push(`    tools=[${agentTools.join(', ')}],`);
    }
    lines.push('    verbose=True,');
    lines.push(')');
    lines.push('');
  });

  lines.push(sep + '# Tasks' + sep);
  agentNodes.forEach((node, idx) => {
    const varName = toSnake(node.name);
    const prevVar = idx > 0 ? `context=[task_${toSnake(agentNodes[idx - 1].name)}]` : '';
    lines.push(`task_${varName} = Task(`);
    lines.push(`    description="${(node.role || node.name).replace(/"/g, "'")}",`);
    lines.push(`    expected_output="Completed output from ${node.name}",`);
    lines.push(`    agent=${varName},`);
    if (prevVar) lines.push(`    ${prevVar},`);
    lines.push(')');
    lines.push('');
  });

  lines.push(sep + '# Crew' + sep);
  const agentList = agentNodes.map(n => toSnake(n.name)).join(', ');
  const taskList  = agentNodes.map(n => `task_${toSnake(n.name)}`).join(', ');
  const hasOrchestrator = nodes.some(n => n.type === 'orchestrator');

  lines.push('crew = Crew(');
  lines.push(`    agents=[${agentList}],`);
  lines.push(`    tasks=[${taskList}],`);
  lines.push(`    process=Process.${ hasOrchestrator ? 'hierarchical' : 'sequential' },`);
  if (hasOrchestrator) {
    const orch = nodes.find(n => n.type === 'orchestrator');
    lines.push(`    manager_agent=${toSnake(orch.name)},`);
  }
  lines.push('    verbose=True,');
  lines.push(')');
  lines.push('');
  lines.push('');
  lines.push('if __name__ == "__main__":');
  lines.push('    result = crew.kickoff(inputs={"input": "Your input here"})');
  lines.push('    print(result.raw)');

  return lines.join('\n');
}

export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportMermaid(graph) {
  const safe = s => (s || '').replace(/"/g, "'").replace(/[[\]]/g, m => m === '[' ? '(' : ')');
  const lines = ['flowchart TD'];
  (graph.nodes || []).forEach(n => {
    lines.push(`  ${n.id}["${safe(n.name)}"]:::${n.type}`);
  });
  (graph.edges || []).forEach(e => {
    const lbl = e.label ? ` -->|"${safe(e.label)}"| ` : ' --> ';
    lines.push(`  ${e.from}${lbl}${e.to}`);
  });
  lines.push('');
  lines.push('  classDef orchestrator fill:#1e1530,stroke:#d0bfff,color:#e8e8e8');
  lines.push('  classDef agent fill:#0f1f13,stroke:#b2f2bb,color:#e8e8e8');
  lines.push('  classDef tool fill:#1f1c0f,stroke:#fff3bf,color:#e8e8e8');
  lines.push('  classDef memory fill:#0f1f1c,stroke:#c3fae8,color:#e8e8e8');
  lines.push('  classDef router fill:#1f0d00,stroke:#fb923c,color:#e8e8e8');
  lines.push('  classDef evaluator fill:#001a1f,stroke:#22d3ee,color:#e8e8e8');
  lines.push('  classDef human-in-loop fill:#1f0009,stroke:#fb7185,color:#e8e8e8');
  lines.push('  classDef infranodus fill:#0d0e1f,stroke:#818cf8,color:#e8e8e8');
  return lines.join('\n');
}
