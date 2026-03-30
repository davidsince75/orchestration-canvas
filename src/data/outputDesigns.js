/**
 * Output node design/look definitions.
 * Each design provides CSS variable tokens applied to the OutputRenderer.
 */

export const OUTPUT_DESIGNS = [
  {
    id:          'dark-minimal',
    label:       'Dark Minimal',
    description: 'Clean dark theme — obsidian background, indigo accents, monospace body.',
    vars: {
      '--out-bg':           '#0d0d16',
      '--out-card-bg':      '#13131f',
      '--out-border':       '#2a2a3e',
      '--out-text':         '#e0e0f0',
      '--out-text-muted':   '#6b6b8a',
      '--out-heading':      '#a78bfa',
      '--out-accent':       '#6366f1',
      '--out-accent-soft':  'rgba(99,102,241,0.12)',
      '--out-bullet':       '#4c4c6a',
      '--out-code-bg':      '#1a1a2e',
      '--out-table-head':   '#1a1a2e',
      '--out-table-stripe': '#111120',
      '--out-heading-font': "'Inter', 'Segoe UI', sans-serif",
      '--out-body-font':    "'Inter', 'Segoe UI', sans-serif",
      '--out-mono-font':    "'JetBrains Mono', 'Fira Code', monospace",
    },
  },
  {
    id:          'editorial-light',
    label:       'Editorial Light',
    description: 'Warm off-white editorial theme — ink headings, generous spacing, serif body.',
    vars: {
      '--out-bg':           '#FAF8F5',
      '--out-card-bg':      '#FFFFFF',
      '--out-border':       '#E8E4DC',
      '--out-text':         '#1a1a1a',
      '--out-text-muted':   '#888880',
      '--out-heading':      '#111111',
      '--out-accent':       '#6366f1',
      '--out-accent-soft':  'rgba(99,102,241,0.08)',
      '--out-bullet':       '#CCCCBB',
      '--out-code-bg':      '#F0EDE8',
      '--out-table-head':   '#F0EDE8',
      '--out-table-stripe': '#F7F5F2',
      '--out-heading-font': "'Georgia', 'Times New Roman', serif",
      '--out-body-font':    "'Inter', 'Segoe UI', sans-serif",
      '--out-mono-font':    "'JetBrains Mono', 'Fira Code', monospace",
    },
  },
  {
    id:          'brand',
    label:       'Brand',
    description: 'Indigo/violet gradient header with amber accents — presentation-ready.',
    vars: {
      '--out-bg':           '#0f0f1a',
      '--out-card-bg':      '#13131f',
      '--out-border':       '#2a2a3e',
      '--out-text':         '#e0e0f0',
      '--out-text-muted':   '#7070a0',
      '--out-heading':      '#c4b5fd',
      '--out-accent':       '#eab308',
      '--out-accent-soft':  'rgba(234,179,8,0.12)',
      '--out-bullet':       '#4c4c6a',
      '--out-code-bg':      '#1a1a2e',
      '--out-table-head':   '#1e1b40',
      '--out-table-stripe': '#111120',
      '--out-heading-font': "'Inter', 'Segoe UI', sans-serif",
      '--out-body-font':    "'Inter', 'Segoe UI', sans-serif",
      '--out-mono-font':    "'JetBrains Mono', 'Fira Code', monospace",
    },
  },
  {
    id:          'raw-markdown',
    label:       'Raw Markdown',
    description: 'Plain GitHub-style markdown view — no decorative chrome, just clean type.',
    vars: {
      '--out-bg':           '#161b22',
      '--out-card-bg':      '#0d1117',
      '--out-border':       '#30363d',
      '--out-text':         '#c9d1d9',
      '--out-text-muted':   '#8b949e',
      '--out-heading':      '#f0f6fc',
      '--out-accent':       '#58a6ff',
      '--out-accent-soft':  'rgba(88,166,255,0.1)',
      '--out-bullet':       '#3d444d',
      '--out-code-bg':      '#1f2428',
      '--out-table-head':   '#1f2428',
      '--out-table-stripe': '#161b22',
      '--out-heading-font': "-apple-system, 'Segoe UI', sans-serif",
      '--out-body-font':    "-apple-system, 'Segoe UI', sans-serif",
      '--out-mono-font':    "'SFMono-Regular', 'Consolas', monospace",
    },
  },
];

export const DEFAULT_OUTPUT_DESIGN = 'dark-minimal';

/** Map of design id → design definition for fast lookup */
export const OUTPUT_DESIGN_MAP = Object.fromEntries(
  OUTPUT_DESIGNS.map(d => [d.id, d])
);
