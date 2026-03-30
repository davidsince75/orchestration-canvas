/**
 * LLM pricing data (USD per 1 000 000 tokens).
 * input = cost per 1M input tokens
 * output = cost per 1M output tokens
 * Source: official provider pricing pages (as of 2025).
 * Update these when providers change rates.
 */

const MODEL_PRICING = {
  // Anthropic Claude
  'claude-sonnet-4-6':          { input: 3.00,  output: 15.00 },
  'claude-opus-4-6':            { input: 15.00, output: 75.00 },
  'claude-haiku-4-5-20251001':  { input: 0.80,  output: 4.00  },

  // OpenAI
  'gpt-4o':       { input: 2.50,  output: 10.00 },
  'gpt-4o-mini':  { input: 0.15,  output: 0.60  },
  'gpt-4-turbo':  { input: 10.00, output: 30.00 },
  'o1-mini':      { input: 1.10,  output: 4.40  },

  // Google Gemini
  'gemini-2.0-flash':  { input: 0.10,  output: 0.40  },
  'gemini-1.5-pro':    { input: 3.50,  output: 10.50 },
  'gemini-1.5-flash':  { input: 0.075, output: 0.30  },

  // Mistral
  'mistral-large-latest':  { input: 3.00,  output: 9.00  },
  'mistral-small-latest':  { input: 0.10,  output: 0.30  },
  'codestral-latest':      { input: 0.20,  output: 0.60  },

  // Ollama — local, no API cost
  'llama3.2':    { input: 0, output: 0 },
  'llama3.1':    { input: 0, output: 0 },
  'mistral':     { input: 0, output: 0 },
  'gemma2':      { input: 0, output: 0 },
  'phi3':        { input: 0, output: 0 },
  'deepseek-r1': { input: 0, output: 0 },
  'qwen2.5':     { input: 0, output: 0 },
};

/** Default token assumptions when no per-node overrides are set. */
export const DEFAULTS = {
  inputTokens:  500,
  outputTokens: 1000,
  callsPerRun:  1,
};

/**
 * Estimate cost for a single model call.
 * @param {string}  modelId
 * @param {number}  inputTokens
 * @param {number}  outputTokens
 * @returns {number} cost in USD
 */
function estimateCallCost(modelId, inputTokens, outputTokens) {
  const pricing = MODEL_PRICING[modelId];
  if (!pricing) return 0;
  return (pricing.input * inputTokens + pricing.output * outputTokens) / 1_000_000;
}

/**
 * Compute per-node and total estimates for a graph.
 * @param {object} graph  — { nodes, edges }
 * @param {Map}    overrides — nodeId → { inputTokens, outputTokens, callsPerRun }
 * @returns {{ rows: Array, totalPerRun: number, totalPerDay: number }}
 */
export function estimateGraphCost(graph, overrides = new Map()) {
  const rows = (graph.nodes || []).map(node => {
    const model  = node.llmModel || 'claude-sonnet-4-6';
    const over   = overrides.get(node.id) || {};
    const inTok  = over.inputTokens  ?? DEFAULTS.inputTokens;
    const outTok = over.outputTokens ?? DEFAULTS.outputTokens;
    const calls  = over.callsPerRun  ?? DEFAULTS.callsPerRun;
    const unitCost = estimateCallCost(model, inTok, outTok);
    const totalCost = unitCost * calls;

    return {
      id: node.id,
      name: node.name || node.id,
      type: node.type,
      provider: node.llmProvider || 'claude-api',
      model,
      inTok,
      outTok,
      calls,
      unitCost,
      totalCost,
    };
  });

  const totalPerRun = rows.reduce((s, r) => s + r.totalCost, 0);
  return { rows, totalPerRun, totalPerDay: totalPerRun * 100 };
}
