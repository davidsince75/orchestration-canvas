/**
 * Registry of LLM providers and their available models.
 * Used by the Node Designer in ViewportEditor.
 */

export const LLM_PROVIDERS = [
  {
    id:    'claude-api',
    label: 'Claude (Anthropic)',
    note:  'Uses the global Anthropic API key from the top bar.',
    requiresKey: false,
    models: [
      { id: 'claude-sonnet-4-6',          label: 'Claude Sonnet 4.6 (default)' },
      { id: 'claude-opus-4-6',            label: 'Claude Opus 4.6' },
      { id: 'claude-haiku-4-5-20251001',  label: 'Claude Haiku 4.5' },
    ],
  },
  {
    id:    'openai',
    label: 'OpenAI',
    note:  'Requires an OpenAI API key (sk-…).',
    requiresKey: true,
    models: [
      { id: 'gpt-4o',       label: 'GPT-4o' },
      { id: 'gpt-4o-mini',  label: 'GPT-4o Mini' },
      { id: 'gpt-4-turbo',  label: 'GPT-4 Turbo' },
      { id: 'o1-mini',      label: 'o1 Mini' },
    ],
  },
  {
    id:    'gemini',
    label: 'Gemini (Google)',
    note:  'Requires a Google AI Studio API key.',
    requiresKey: true,
    models: [
      { id: 'gemini-2.0-flash',   label: 'Gemini 2.0 Flash' },
      { id: 'gemini-1.5-pro',     label: 'Gemini 1.5 Pro' },
      { id: 'gemini-1.5-flash',   label: 'Gemini 1.5 Flash' },
    ],
  },
  {
    id:    'mistral',
    label: 'Mistral AI',
    note:  'Requires a Mistral API key.',
    requiresKey: true,
    models: [
      { id: 'mistral-large-latest',   label: 'Mistral Large' },
      { id: 'mistral-small-latest',   label: 'Mistral Small' },
      { id: 'codestral-latest',       label: 'Codestral' },
    ],
  },
  {
    id:    'ollama',
    label: 'Ollama (Local)',
    note:  'No API key needed. Runs locally via Ollama.',
    requiresKey: false,
    requiresUrl: true,
    models: [
      { id: 'llama3.2',       label: 'Llama 3.2' },
      { id: 'llama3.1',       label: 'Llama 3.1' },
      { id: 'mistral',        label: 'Mistral 7B' },
      { id: 'gemma2',         label: 'Gemma 2' },
      { id: 'phi3',           label: 'Phi-3' },
      { id: 'deepseek-r1',    label: 'DeepSeek R1' },
      { id: 'qwen2.5',        label: 'Qwen 2.5' },
    ],
  },
];

export const DEFAULT_PROVIDER = 'claude-api';
export const DEFAULT_MODEL    = 'claude-sonnet-4-6';
export const DEFAULT_OLLAMA_URL = 'http://localhost:11434';

export function getProvider(id) {
  return LLM_PROVIDERS.find(p => p.id === id) || LLM_PROVIDERS[0];
}
