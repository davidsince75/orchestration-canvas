/**
 * Output node template definitions.
 * Each template describes the structure used to render pipeline output.
 */

export const OUTPUT_TEMPLATES = [
  {
    id:          'brief',
    label:       'Brief',
    icon:        '📄',
    description: 'Executive-style brief with summary, key findings, recommendations, and next steps.',
    sections: [
      { id: 'title',           label: 'Title',               type: 'text' },
      { id: 'summary',         label: 'Executive Summary',   type: 'markdown' },
      { id: 'findings',        label: 'Key Findings',        type: 'list' },
      { id: 'recommendations', label: 'Recommendations',     type: 'list' },
      { id: 'nextSteps',       label: 'Next Steps',          type: 'list' },
    ],
  },
  {
    id:          'report',
    label:       'Report',
    icon:        '📊',
    description: 'Structured long-form report with introduction, analysis, methodology, and conclusion sections.',
    sections: [
      { id: 'title',        label: 'Title',        type: 'text' },
      { id: 'introduction', label: 'Introduction', type: 'markdown' },
      { id: 'methodology',  label: 'Methodology',  type: 'markdown' },
      { id: 'analysis',     label: 'Analysis',     type: 'markdown' },
      { id: 'conclusion',   label: 'Conclusion',   type: 'markdown' },
      { id: 'references',   label: 'References',   type: 'list' },
    ],
  },
  {
    id:          'research-summary',
    label:       'Research Summary',
    icon:        '🔬',
    description: 'Compact research summary: topic, key concepts, gaps identified, and suggested questions.',
    sections: [
      { id: 'topic',     label: 'Topic',              type: 'text' },
      { id: 'abstract',  label: 'Abstract',           type: 'markdown' },
      { id: 'concepts',  label: 'Key Concepts',       type: 'list' },
      { id: 'gaps',      label: 'Identified Gaps',    type: 'list' },
      { id: 'questions', label: 'Research Questions', type: 'list' },
    ],
  },
  {
    id:          'data-table',
    label:       'Data Table',
    icon:        '🗃️',
    description: 'Renders structured JSON data as a formatted, sortable HTML table.',
    sections: [
      { id: 'title',  label: 'Table Title', type: 'text' },
      { id: 'table',  label: 'Data',        type: 'table' },
      { id: 'notes',  label: 'Notes',       type: 'markdown' },
    ],
  },
  {
    id:          'slide-deck',
    label:       'Slide Deck',
    icon:        '🎞️',
    description: 'Paginated slide-style output — each section renders as a full-screen card.',
    sections: [
      { id: 'title',    label: 'Deck Title', type: 'text' },
      { id: 'slides',   label: 'Slides',     type: 'slides' },
    ],
  },
  {
    id:          'markdown-doc',
    label:       'Markdown Doc',
    icon:        '✏️',
    description: 'Full markdown renderer — renders any markdown content with headings, lists, code blocks, and links.',
    sections: [
      { id: 'content', label: 'Content', type: 'markdown' },
    ],
  },
  {
    id:          'custom',
    label:       'Custom',
    icon:        '⚙️',
    description: 'Define your own sections and layout. Mix text, markdown, list, and table blocks.',
    sections: [],
  },
];

export const DEFAULT_OUTPUT_TEMPLATE = 'brief';

/** Map of template id → template definition for fast lookup */
export const OUTPUT_TEMPLATE_MAP = Object.fromEntries(
  OUTPUT_TEMPLATES.map(t => [t.id, t])
);
