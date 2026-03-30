/**
 * InfraNodus operation definitions for the Infranodus node type.
 * Each operation maps to a specific analysis performed on the text graph.
 */

export const INFRANODUS_OPS = [
  {
    id:          'analyze-text',
    label:       'Analyze Text',
    description: 'Build a knowledge graph from the incoming text and return key concepts, connections, and structural metrics.',
    icon:        '🕸️',
  },
  {
    id:          'research-questions',
    label:       'Research Questions',
    description: 'Generate targeted research questions based on structural gaps in the knowledge graph.',
    icon:        '❓',
  },
  {
    id:          'content-gaps',
    label:       'Content Gaps',
    description: 'Identify underconnected topics and missing bridges in the knowledge network.',
    icon:        '🔍',
  },
  {
    id:          'topic-clusters',
    label:       'Topic Clusters',
    description: 'Extract main thematic clusters and AI-labelled topic groups from the graph.',
    icon:        '🗂️',
  },
  {
    id:          'seo-report',
    label:       'SEO Report',
    description: 'Analyse keyword density, topical authority, and semantic structure for SEO optimisation.',
    icon:        '📈',
  },
  {
    id:          'gap-analysis-viz',
    label:       'Gap Analysis (Visual)',
    description: 'Identify structural gaps in the knowledge graph and render an interactive constellation visualisation highlighting hub, bridge, and gap nodes.',
    icon:        '🌌',
    vizOutput:   true,
  },
  {
    id:          'full-graph-viz',
    label:       'Full Graph (Visual)',
    description: 'Build the complete knowledge graph from text and render an interactive constellation map of all concepts, clusters, and connections.',
    icon:        '🔭',
    vizOutput:   true,
  },
];

export const DEFAULT_INFRANODUS_OP = 'analyze-text';
