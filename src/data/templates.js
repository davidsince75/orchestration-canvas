export const TEMPLATES = [
  {
    id: 'research-assistant',
    name: 'Research Assistant',
    description: 'Searches the web, summarises results, stores memory of past queries, and compiles reports.',
    tags: ['RAG', 'web search', 'memory'],
    brief: 'A research assistant that takes a question, searches the web, summarises results, stores memory of past queries, and generates a final report.',
    graph: {
      nodes: [
        { id: 'ra_orch', type: 'orchestrator', name: 'Research Orchestrator', role: 'Coordinates the pipeline from question intake to final report delivery', systemPrompt: 'You are a research orchestrator. When given a research question, coordinate the pipeline: dispatch the web search agent, check memory for prior research on this topic, pass results to the summarizer, and compile the final report. Always cite sources and indicate confidence level.', inputSchema: { question: 'string', depth: 'shallow | deep' }, outputSchema: { report: 'string', sources: 'array of URLs', confidence: 'number 0-1' }, position: { x: 400, y: 80 } },
        { id: 'ra_searcher', type: 'agent', name: 'Web Search Agent', role: 'Executes targeted web searches and retrieves relevant documents', systemPrompt: 'You are a web search specialist. Given a research question, formulate 2-3 effective search queries, execute them via the search tool, and return a ranked list of relevant excerpts with source URLs. Prioritize authoritative, recent sources.', inputSchema: { query: 'string', maxResults: 'number' }, outputSchema: { results: 'array of {url, title, excerpt}', queryUsed: 'string' }, position: { x: 150, y: 300 } },
        { id: 'ra_summarizer', type: 'agent', name: 'Summarizer Agent', role: 'Synthesizes search results into a coherent, attributed summary', systemPrompt: 'You are a summarization specialist. Given a set of web search results, extract key facts, identify consensus views, note disagreements between sources, and produce a concise structured summary with inline citations. Never fabricate facts.', inputSchema: { results: 'array', question: 'string' }, outputSchema: { summary: 'string', keyPoints: 'array of strings', sources: 'array of URLs' }, position: { x: 530, y: 300 } },
        { id: 'ra_memory', type: 'memory', name: 'Research Memory', role: 'Stores and retrieves past research queries and their findings', systemPrompt: '', inputSchema: { query: 'string' }, outputSchema: { priorResearch: 'array of past summaries' }, memoryType: 'long-term', accessMode: 'read-write', position: { x: 800, y: 300 } },
        { id: 'ra_search_tool', type: 'tool', name: 'Web Search Tool', role: 'Executes live web searches via search API', systemPrompt: '', inputSchema: { query: 'string', numResults: 'number' }, outputSchema: { results: 'array of {url, title, snippet}' }, endpoint: 'GET /api/search?q={query}&n={numResults}', position: { x: 150, y: 520 } },
        { id: 'ra_output', type: 'output', name: 'Research Brief', role: 'Renders the final research summary as a structured brief with key findings and recommendations', systemPrompt: '', inputSchema: {}, outputSchema: {}, outputTemplate: 'brief', outputDesign: 'dark-minimal', outputShowViz: false, outputShowRaw: false, position: { x: 530, y: 500 } }
      ],
      edges: [
        { id: 'ra_e1', from: 'ra_orch', to: 'ra_searcher', label: 'delegates search' },
        { id: 'ra_e2', from: 'ra_orch', to: 'ra_memory', label: 'queries / stores research' },
        { id: 'ra_e3', from: 'ra_searcher', to: 'ra_search_tool', label: 'calls' },
        { id: 'ra_e4', from: 'ra_searcher', to: 'ra_summarizer', label: 'passes results' },
        { id: 'ra_e5', from: 'ra_summarizer', to: 'ra_output', label: 'renders output' }
      ]
    }
  },
  {
    id: 'customer-support',
    name: 'Customer Support Pipeline',
    description: 'Triages tickets, searches a knowledge base, drafts replies, and escalates complex cases.',
    tags: ['support', 'triage', 'escalation'],
    brief: 'A customer support system that triages incoming tickets, searches the knowledge base for answers, drafts personalised replies, and escalates complex cases to a human agent.',
    graph: {
      nodes: [
        { id: 'cs_orch', type: 'orchestrator', name: 'Support Orchestrator', role: 'Routes incoming tickets to the appropriate specialised agent based on topic and complexity', systemPrompt: 'You are a customer support orchestrator. Receive incoming support tickets, assess their type and urgency using the triage agent, then route to the FAQ agent for common questions or the draft agent for complex issues. Escalate to human review when confidence is low or the issue is sensitive.', inputSchema: { ticket: 'string', userId: 'string', channel: 'email | chat | web' }, outputSchema: { resolution: 'string', escalated: 'boolean', responseTime: 'number' }, position: { x: 430, y: 80 } },
        { id: 'cs_triage', type: 'agent', name: 'Triage Agent', role: 'Classifies tickets by topic, urgency, and whether they can be auto-resolved', systemPrompt: 'You are a support triage specialist. Classify each incoming ticket by: topic (billing, technical, account, general), urgency (low/medium/high), and auto-resolvable (yes/no). Provide a brief reasoning. Be conservative — when uncertain, mark as not auto-resolvable.', inputSchema: { ticket: 'string', history: 'array of prior tickets' }, outputSchema: { topic: 'string', urgency: 'low | medium | high', autoResolvable: 'boolean', reasoning: 'string' }, position: { x: 100, y: 300 } },
        { id: 'cs_faq', type: 'agent', name: 'FAQ Agent', role: 'Answers common questions by searching the knowledge base', systemPrompt: 'You are a FAQ resolution agent. Search the knowledge base for answers to common support questions. If a high-confidence answer is found, return it formatted for the customer. If no answer is found with confidence above 0.8, return null to trigger escalation.', inputSchema: { question: 'string', topic: 'string' }, outputSchema: { answer: 'string | null', confidence: 'number', articleIds: 'array' }, position: { x: 380, y: 300 } },
        { id: 'cs_drafter', type: 'agent', name: 'Reply Drafter', role: 'Composes personalised, empathetic customer replies using context and KB articles', systemPrompt: 'You are a customer reply drafter. Given a support ticket, triage classification, and relevant KB articles, write a clear, empathetic, and actionable reply. Match the customer\'s tone. Always end with next steps. Never promise what you cannot deliver.', inputSchema: { ticket: 'string', context: 'object', articles: 'array' }, outputSchema: { draft: 'string', suggestedActions: 'array' }, position: { x: 660, y: 300 } },
        { id: 'cs_kb', type: 'tool', name: 'Knowledge Base', role: 'Searches product documentation and FAQ articles by semantic query', systemPrompt: '', inputSchema: { query: 'string', topic: 'string', limit: 'number' }, outputSchema: { articles: 'array of {id, title, content, score}' }, endpoint: 'POST /api/kb/search', position: { x: 380, y: 520 } },
        { id: 'cs_memory', type: 'memory', name: 'Conversation Memory', role: 'Stores customer conversation history and account context', systemPrompt: '', inputSchema: { userId: 'string' }, outputSchema: { history: 'array', accountContext: 'object' }, memoryType: 'working', accessMode: 'read-write', position: { x: 660, y: 520 } },
        { id: 'cs_output', type: 'output', name: 'Support Reply', role: 'Renders the drafted customer reply ready for review or dispatch', systemPrompt: '', inputSchema: {}, outputSchema: {}, outputTemplate: 'markdown-doc', outputDesign: 'editorial-light', outputShowViz: false, outputShowRaw: false, position: { x: 900, y: 300 } }
      ],
      edges: [
        { id: 'cs_e1', from: 'cs_orch', to: 'cs_triage', label: 'classifies ticket' },
        { id: 'cs_e2', from: 'cs_orch', to: 'cs_memory', label: 'loads context' },
        { id: 'cs_e3', from: 'cs_triage', to: 'cs_faq', label: 'routes if auto-resolvable' },
        { id: 'cs_e4', from: 'cs_triage', to: 'cs_drafter', label: 'routes if complex' },
        { id: 'cs_e5', from: 'cs_faq', to: 'cs_kb', label: 'searches' },
        { id: 'cs_e6', from: 'cs_drafter', to: 'cs_kb', label: 'fetches articles' },
        { id: 'cs_e7', from: 'cs_drafter', to: 'cs_output', label: 'renders reply' }
      ]
    }
  },
  {
    id: 'code-review',
    name: 'Code Review System',
    description: 'Analyses pull requests for bugs, security, and test coverage, then produces a structured review.',
    tags: ['devtools', 'PR review', 'security'],
    brief: 'An automated code review system that fetches pull request diffs, analyses them for bugs and security issues, evaluates test coverage, and compiles a structured review comment.',
    graph: {
      nodes: [
        { id: 'cr_orch', type: 'orchestrator', name: 'Review Orchestrator', role: 'Coordinates the code review pipeline from PR intake to final report delivery', systemPrompt: 'You are a code review orchestrator. When given a pull request, fetch the diff via the repository tool, dispatch parallel analysis to the code analysis agent and test coverage agent, then pass results to the reporter. Ensure the final review is actionable and constructive.', inputSchema: { prUrl: 'string', repo: 'string', branch: 'string' }, outputSchema: { review: 'string', severity: 'low | medium | high', approved: 'boolean' }, position: { x: 430, y: 80 } },
        { id: 'cr_analyzer', type: 'agent', name: 'Code Analysis Agent', role: 'Analyses code changes for bugs, security vulnerabilities, and style violations', systemPrompt: 'You are a senior code reviewer specialising in correctness and security. Given a PR diff, identify: potential bugs (logic errors, null references, race conditions), security vulnerabilities (injection, auth bypass, secret exposure), and style violations. Rate each finding by severity. Be specific with line references.', inputSchema: { diff: 'string', language: 'string', context: 'string' }, outputSchema: { findings: 'array of {line, severity, type, description, suggestion}' }, position: { x: 100, y: 300 } },
        { id: 'cr_coverage', type: 'agent', name: 'Test Coverage Agent', role: 'Evaluates test completeness and identifies missing test cases', systemPrompt: 'You are a test quality specialist. Given a PR diff, assess: whether new code has corresponding tests, edge cases that are not covered, and whether existing tests are adequate for the changes. Suggest specific test cases that should be added. Focus on business-critical paths.', inputSchema: { diff: 'string', existingTests: 'string' }, outputSchema: { coverageScore: 'number', missingTests: 'array of descriptions', suggestions: 'array' }, position: { x: 430, y: 300 } },
        { id: 'cr_reporter', type: 'agent', name: 'Review Reporter', role: 'Compiles analysis results into a structured, actionable PR review comment', systemPrompt: 'You are a review report writer. Given code analysis findings and test coverage results, compile a clear, structured PR review in GitHub markdown format. Start with a summary, then list issues by severity. Be constructive and specific. End with a clear approve/request-changes recommendation.', inputSchema: { findings: 'array', coverageReport: 'object', prMetadata: 'object' }, outputSchema: { reviewComment: 'string', approved: 'boolean', summary: 'string' }, position: { x: 760, y: 300 } },
        { id: 'cr_repo', type: 'tool', name: 'Repository Tool', role: 'Fetches PR diffs, file contents, and CI status from the code repository', systemPrompt: '', inputSchema: { prUrl: 'string', includeContext: 'boolean' }, outputSchema: { diff: 'string', files: 'array', ciStatus: 'object', metadata: 'object' }, endpoint: 'GET /api/repos/{repo}/pulls/{pr}/diff', position: { x: 275, y: 520 } },
        { id: 'cr_output', type: 'output', name: 'Review Report', role: 'Renders the PR review as a structured report with findings, coverage score, and recommendation', systemPrompt: '', inputSchema: {}, outputSchema: {}, outputTemplate: 'report', outputDesign: 'dark-minimal', outputShowViz: false, outputShowRaw: false, position: { x: 760, y: 500 } }
      ],
      edges: [
        { id: 'cr_e1', from: 'cr_orch', to: 'cr_repo', label: 'fetches diff' },
        { id: 'cr_e2', from: 'cr_orch', to: 'cr_analyzer', label: 'dispatches analysis' },
        { id: 'cr_e3', from: 'cr_orch', to: 'cr_coverage', label: 'dispatches coverage check' },
        { id: 'cr_e4', from: 'cr_analyzer', to: 'cr_reporter', label: 'passes findings' },
        { id: 'cr_e5', from: 'cr_coverage', to: 'cr_reporter', label: 'passes coverage report' },
        { id: 'cr_e6', from: 'cr_reporter', to: 'cr_output', label: 'renders review' }
      ]
    }
  },
  {
    id: 'content-pipeline',
    name: 'Content Creation Pipeline',
    description: 'Drafts, edits, fact-checks, and publishes long-form content from a brief.',
    tags: ['content', 'publishing', 'editorial'],
    brief: 'A content creation pipeline that takes a content brief, drafts a long-form article, passes it through an editor for refinement, fact-checks claims, and publishes the final piece to the CMS.',
    graph: {
      nodes: [
        { id: 'cp_orch', type: 'orchestrator', name: 'Content Orchestrator', role: 'Manages the content lifecycle from brief to published article', systemPrompt: 'You are a content production orchestrator. Given a content brief, coordinate: dispatch to the writer for a draft, pass to the editor for refinement, send to fact-checking, and finally publish via the CMS tool. Reject and re-draft if quality gates are not met.', inputSchema: { brief: 'string', format: 'blog | whitepaper | case-study', wordCount: 'number' }, outputSchema: { articleUrl: 'string', publishedAt: 'string', wordCount: 'number' }, position: { x: 430, y: 80 } },
        { id: 'cp_writer', type: 'agent', name: 'Writer Agent', role: 'Drafts long-form content from briefs, maintaining consistent voice and structure', systemPrompt: 'You are a professional content writer. Given a brief, write a well-structured, engaging article. Follow the specified format and word count. Use clear headings, short paragraphs, and concrete examples. Avoid jargon. Write in an authoritative yet approachable tone.', inputSchema: { brief: 'string', outline: 'string', wordCount: 'number', tone: 'string' }, outputSchema: { draft: 'string', wordCount: 'number', headings: 'array' }, position: { x: 100, y: 300 } },
        { id: 'cp_editor', type: 'agent', name: 'Editor Agent', role: 'Refines drafts for clarity, flow, concision, and structural coherence', systemPrompt: 'You are a professional editor. Given a draft article, improve: clarity (simplify complex sentences), flow (smooth transitions), concision (remove redundancy), and structure (logical progression). Track all changes. Do not alter the author\'s core voice or add new factual claims.', inputSchema: { draft: 'string', brief: 'string', editingGuidelines: 'string' }, outputSchema: { editedDraft: 'string', changesSummary: 'string', qualityScore: 'number' }, position: { x: 430, y: 300 } },
        { id: 'cp_factcheck', type: 'agent', name: 'Fact Checker', role: 'Verifies factual claims and flags statements that require sourcing or correction', systemPrompt: 'You are a fact-checking specialist. Review the article for: specific factual claims (statistics, dates, quotes, attributions), statements presented as fact without evidence, and potential inaccuracies. Flag each issue with severity and suggested correction. Do not flag opinions clearly marked as such.', inputSchema: { article: 'string' }, outputSchema: { issues: 'array of {claim, severity, suggestion}', approved: 'boolean' }, position: { x: 760, y: 300 } },
        { id: 'cp_cms', type: 'tool', name: 'CMS Publishing Tool', role: 'Publishes finalized articles to the content management system', systemPrompt: '', inputSchema: { content: 'string', metadata: 'object', status: 'draft | published' }, outputSchema: { articleId: 'string', url: 'string', publishedAt: 'string' }, endpoint: 'POST /api/cms/articles', position: { x: 580, y: 520 } },
        { id: 'cp_output', type: 'output', name: 'Published Article', role: 'Renders the final fact-checked article in a clean editorial layout', systemPrompt: '', inputSchema: {}, outputSchema: {}, outputTemplate: 'markdown-doc', outputDesign: 'editorial-light', outputShowViz: false, outputShowRaw: false, position: { x: 760, y: 500 } }
      ],
      edges: [
        { id: 'cp_e1', from: 'cp_orch', to: 'cp_writer', label: 'commissions draft' },
        { id: 'cp_e2', from: 'cp_writer', to: 'cp_editor', label: 'passes draft' },
        { id: 'cp_e3', from: 'cp_editor', to: 'cp_factcheck', label: 'sends for fact-check' },
        { id: 'cp_e4', from: 'cp_factcheck', to: 'cp_cms', label: 'publishes verified content' },
        { id: 'cp_e5', from: 'cp_factcheck', to: 'cp_output', label: 'renders article' }
      ]
    }
  },
  {
    id: 'rag-pipeline',
    name: 'RAG Pipeline',
    description: 'Retrieves semantically relevant chunks from a vector store and synthesizes grounded answers.',
    tags: ['RAG', 'vector search', 'Q&A'],
    brief: 'A retrieval-augmented generation pipeline that reformulates user queries for optimal vector search, retrieves relevant document chunks, and synthesizes a grounded answer with citations.',
    graph: {
      nodes: [
        { id: 'rg_orch', type: 'orchestrator', name: 'RAG Orchestrator', role: 'Coordinates query processing, retrieval, re-ranking, and answer synthesis', systemPrompt: 'You are a RAG pipeline orchestrator. Given a user question, coordinate: reformulate the query for vector search, retrieve relevant chunks, re-rank by relevance, and pass to the synthesizer. If no high-confidence chunks are found, return a fallback response rather than hallucinating.', inputSchema: { question: 'string', userId: 'string', topK: 'number' }, outputSchema: { answer: 'string', sources: 'array', confidence: 'number' }, position: { x: 380, y: 80 } },
        { id: 'rg_query', type: 'agent', name: 'Query Agent', role: 'Reformulates and expands user queries to improve vector search recall', systemPrompt: 'You are a query optimization specialist. Given a user question, generate: 1) a cleaned, specific search query, 2) 2-3 alternative phrasings to improve recall, 3) key entity names to filter on. Remove conversational filler and resolve pronouns to explicit references.', inputSchema: { question: 'string', conversationHistory: 'array' }, outputSchema: { primaryQuery: 'string', alternativeQueries: 'array', filters: 'object' }, position: { x: 130, y: 300 } },
        { id: 'rg_synth', type: 'agent', name: 'Synthesizer Agent', role: 'Combines retrieved chunks into a coherent, fully-grounded answer with citations', systemPrompt: 'You are an answer synthesis specialist. Given a user question and retrieved document chunks, write a clear, direct answer that is strictly grounded in the provided sources. Cite source IDs inline. If sources are insufficient to fully answer, say so explicitly. Never add information not present in the sources.', inputSchema: { question: 'string', chunks: 'array of {id, content, score}' }, outputSchema: { answer: 'string', citations: 'array of source IDs', confidence: 'number' }, position: { x: 600, y: 300 } },
        { id: 'rg_vector_tool', type: 'tool', name: 'Vector Search Tool', role: 'Performs semantic search against the vector database and returns ranked chunks', systemPrompt: '', inputSchema: { queries: 'array of strings', filters: 'object', topK: 'number' }, outputSchema: { chunks: 'array of {id, content, score, metadata}' }, endpoint: 'POST /api/vectors/search', position: { x: 130, y: 520 } },
        { id: 'rg_docstore', type: 'memory', name: 'Document Store', role: 'Vector database storing embedded document chunks with metadata', systemPrompt: '', inputSchema: { query: 'vector embedding' }, outputSchema: { chunks: 'array of {id, content, embedding, metadata}' }, memoryType: 'long-term', accessMode: 'read', position: { x: 420, y: 520 } },
        { id: 'rg_output', type: 'output', name: 'Grounded Answer', role: 'Renders the synthesized answer with inline citations in a clean brief layout', systemPrompt: '', inputSchema: {}, outputSchema: {}, outputTemplate: 'brief', outputDesign: 'dark-minimal', outputShowViz: false, outputShowRaw: false, position: { x: 600, y: 500 } }
      ],
      edges: [
        { id: 'rg_e1', from: 'rg_orch', to: 'rg_query', label: 'sends question' },
        { id: 'rg_e2', from: 'rg_query', to: 'rg_vector_tool', label: 'submits queries' },
        { id: 'rg_e3', from: 'rg_vector_tool', to: 'rg_docstore', label: 'queries' },
        { id: 'rg_e4', from: 'rg_vector_tool', to: 'rg_synth', label: 'returns chunks' },
        { id: 'rg_e5', from: 'rg_synth', to: 'rg_output', label: 'renders answer' }
      ]
    }
  },
  {
    id: 'data-pipeline',
    name: 'Data Processing Pipeline',
    description: 'Ingests, transforms, validates, and outputs structured data with async buffering.',
    tags: ['data', 'ETL', 'async', 'queue'],
    brief: 'An agentic data processing pipeline that ingests raw data from external sources, applies transformation rules, validates data quality, buffers work in a queue, and writes outputs to a target store.',
    graph: {
      nodes: [
        { id: 'dp_orch', type: 'orchestrator', name: 'Pipeline Orchestrator', role: 'Manages the end-to-end data processing flow and error recovery', systemPrompt: 'You are a data pipeline orchestrator. Coordinate: ingest raw data via the ingestion agent, transform it according to business rules, validate quality gates, buffer in the processing queue, and dispatch to the output tool. On validation failure, route to a dead-letter queue and alert. Track throughput and error rates.', inputSchema: { sourceId: 'string', batchSize: 'number', schema: 'object' }, outputSchema: { processed: 'number', failed: 'number', outputPath: 'string' }, position: { x: 430, y: 80 } },
        { id: 'dp_ingest', type: 'agent', name: 'Ingestion Agent', role: 'Fetches and normalises raw data from external sources into a standard schema', systemPrompt: 'You are a data ingestion specialist. Connect to the specified source, fetch raw records, normalize field names to snake_case, parse dates to ISO 8601, coerce types, and handle missing fields with sensible defaults. Return a normalised batch with a processing manifest.', inputSchema: { sourceId: 'string', batchSize: 'number', offset: 'number' }, outputSchema: { records: 'array', manifest: 'object', errors: 'array' }, position: { x: 100, y: 300 } },
        { id: 'dp_transform', type: 'agent', name: 'Transformer Agent', role: 'Applies business rules and schema transformations to normalised records', systemPrompt: 'You are a data transformation specialist. Apply the configured transformation rules to each record: field mappings, derived fields, aggregations, and enrichments. Log every transformation applied. Return the transformed batch with a diff summary showing what changed.', inputSchema: { records: 'array', rules: 'array of transform rules' }, outputSchema: { transformed: 'array', diffSummary: 'object' }, position: { x: 400, y: 300 } },
        { id: 'dp_validator', type: 'agent', name: 'Validator Agent', role: 'Checks data quality against schema constraints and flags failing records', systemPrompt: 'You are a data quality validator. For each record, check: required fields are present, values are within valid ranges, referential integrity is maintained, and no duplicates exist. Separate passing records from failing ones. Provide detailed failure reasons for each rejected record.', inputSchema: { records: 'array', schema: 'object', strictMode: 'boolean' }, outputSchema: { valid: 'array', invalid: 'array of {record, errors}', qualityScore: 'number' }, position: { x: 700, y: 300 } },
        { id: 'dp_output', type: 'tool', name: 'Output Tool', role: 'Writes validated, processed records to the target database or object store', systemPrompt: '', inputSchema: { records: 'array', destination: 'string', mode: 'insert | upsert | replace' }, outputSchema: { written: 'number', errors: 'array' }, endpoint: 'POST /api/datastore/write', position: { x: 550, y: 520 } },
        { id: 'dp_queue', type: 'memory', name: 'Processing Queue', role: 'Async buffer that decouples pipeline stages for resilient batch processing', systemPrompt: '', inputSchema: { records: 'array', priority: 'number' }, outputSchema: { batchId: 'string', queueDepth: 'number' }, memoryType: 'queue', accessMode: 'read-write', position: { x: 250, y: 520 } },
        { id: 'dp_report', type: 'output', name: 'Pipeline Report', role: 'Renders validation results and processing stats as a structured data table', systemPrompt: '', inputSchema: {}, outputSchema: {}, outputTemplate: 'data-table', outputDesign: 'dark-minimal', outputShowViz: false, outputShowRaw: false, position: { x: 700, y: 500 } }
      ],
      edges: [
        { id: 'dp_e1', from: 'dp_orch', to: 'dp_ingest', label: 'triggers ingestion' },
        { id: 'dp_e2', from: 'dp_ingest', to: 'dp_queue', label: 'buffers batch' },
        { id: 'dp_e3', from: 'dp_queue', to: 'dp_transform', label: 'dequeues batch' },
        { id: 'dp_e4', from: 'dp_transform', to: 'dp_validator', label: 'passes transformed' },
        { id: 'dp_e5', from: 'dp_validator', to: 'dp_output', label: 'writes valid records' },
        { id: 'dp_e6', from: 'dp_validator', to: 'dp_report', label: 'renders run report' }
      ]
    }
  },
  {
    id: 'multi-agent-debate',
    name: 'Multi-Agent Debate',
    description: 'Specialist agents argue positions, a critic challenges them, and a moderator synthesizes consensus.',
    tags: ['reasoning', 'multi-agent', 'analysis'],
    brief: 'A multi-agent debate system where an advocate argues a position, a critic challenges it, a devil\'s advocate surfaces contrarian views, and a moderator synthesizes a balanced conclusion.',
    graph: {
      nodes: [
        { id: 'md_mod', type: 'orchestrator', name: 'Debate Moderator', role: 'Facilitates structured debate rounds and synthesizes the final consensus position', systemPrompt: 'You are a debate moderator. Run structured debate rounds: present the question to the advocate, pass their argument to the critic, have the devil\'s advocate surface contrarian views, then synthesize a balanced conclusion. Ensure all perspectives are fairly represented. Identify where strong consensus exists and where genuine disagreement remains.', inputSchema: { proposition: 'string', context: 'string', rounds: 'number' }, outputSchema: { conclusion: 'string', consensusAreas: 'array', disagreements: 'array', confidence: 'number' }, position: { x: 430, y: 80 } },
        { id: 'md_advocate', type: 'agent', name: 'Advocate Agent', role: 'Argues in favour of the proposition with evidence and structured reasoning', systemPrompt: 'You are a rigorous advocate. Given a proposition, build the strongest possible case in its favour: identify supporting evidence, construct logical arguments, anticipate objections and pre-empt them, and present a compelling conclusion. Use concrete examples. Acknowledge genuine weaknesses honestly.', inputSchema: { proposition: 'string', priorArguments: 'array' }, outputSchema: { argument: 'string', keyPoints: 'array', evidenceCited: 'array', confidence: 'number' }, position: { x: 100, y: 300 } },
        { id: 'md_critic', type: 'agent', name: 'Critic Agent', role: 'Rigorously challenges claims, identifies logical flaws, and requests evidence', systemPrompt: 'You are a rigorous critic. Given an argument, identify: logical fallacies, unsupported claims, cherry-picked evidence, hidden assumptions, and alternative explanations. Do not dismiss valid points. Your goal is to stress-test the argument, not win — a stronger argument emerges from honest critique.', inputSchema: { argument: 'string', proposition: 'string' }, outputSchema: { critiques: 'array of {claim, issue, severity}', overallStrength: 'number', validPoints: 'array' }, position: { x: 430, y: 300 } },
        { id: 'md_devil', type: 'agent', name: "Devil's Advocate", role: 'Surfaces contrarian perspectives and stress-tests assumptions regardless of personal view', systemPrompt: "You are a devil's advocate. Regardless of the proposition's merit, argue the strongest possible opposing case. Surface non-obvious counterarguments, challenge base assumptions, and introduce perspectives from different stakeholder groups. Be provocative but intellectually honest.", inputSchema: { proposition: 'string', currentConsensus: 'string' }, outputSchema: { counterArguments: 'array', challengedAssumptions: 'array', alternativeFramings: 'array' }, position: { x: 760, y: 300 } },
        { id: 'md_synth', type: 'agent', name: 'Synthesis Agent', role: 'Distills debate outputs into a balanced, well-reasoned conclusion with confidence ratings', systemPrompt: 'You are a synthesis specialist. Given a full debate transcript with advocate arguments, critiques, and contrarian views, produce a balanced synthesis: identify points of consensus, characterize genuine disagreements, assign confidence levels to different positions, and state a nuanced final conclusion. Represent all perspectives fairly.', inputSchema: { debateTranscript: 'array', proposition: 'string' }, outputSchema: { synthesis: 'string', consensusPoints: 'array', openQuestions: 'array', recommendation: 'string' }, position: { x: 430, y: 520 } },
        { id: 'md_output', type: 'output', name: 'Debate Synthesis', role: 'Renders the balanced synthesis and recommendation as a structured analytical report', systemPrompt: '', inputSchema: {}, outputSchema: {}, outputTemplate: 'report', outputDesign: 'dark-minimal', outputShowViz: false, outputShowRaw: false, position: { x: 430, y: 720 } }
      ],
      edges: [
        { id: 'md_e1', from: 'md_mod', to: 'md_advocate', label: 'presents proposition' },
        { id: 'md_e2', from: 'md_advocate', to: 'md_critic', label: 'submits argument' },
        { id: 'md_e3', from: 'md_mod', to: 'md_devil', label: 'requests counter-view' },
        { id: 'md_e4', from: 'md_critic', to: 'md_synth', label: 'passes critique' },
        { id: 'md_e5', from: 'md_devil', to: 'md_synth', label: 'passes counter-arguments' },
        { id: 'md_e6', from: 'md_advocate', to: 'md_synth', label: 'passes original argument' },
        { id: 'md_e7', from: 'md_synth', to: 'md_output', label: 'renders synthesis' }
      ]
    }
  },
  {
    id: 'devops-monitor',
    name: 'DevOps Monitor',
    description: 'Detects anomalies, diagnoses root causes from metrics and logs, and triggers remediations.',
    tags: ['DevOps', 'SRE', 'monitoring', 'automation'],
    brief: 'An automated DevOps monitoring system that detects and triages alerts, queries metrics and logs to diagnose root causes, and selects and executes automated remediation actions.',
    graph: {
      nodes: [
        { id: 'dv_orch', type: 'orchestrator', name: 'Monitor Orchestrator', role: 'Coordinates alert triage, root-cause diagnosis, and automated remediation', systemPrompt: 'You are a site reliability orchestrator. When an alert fires, coordinate: triage it for severity, dispatch the diagnostic agent to identify root cause, select the appropriate remediation action, and confirm resolution. Log all actions. Page on-call engineers for P0/P1 incidents that cannot be auto-remediated. Prefer conservative remediations — never restart databases without human approval.', inputSchema: { alert: 'object', service: 'string', environment: 'production | staging' }, outputSchema: { resolved: 'boolean', actionsTaken: 'array', incidentId: 'string', escalated: 'boolean' }, position: { x: 430, y: 80 } },
        { id: 'dv_alert', type: 'agent', name: 'Alert Triage Agent', role: 'Evaluates incoming alerts for severity, validity, and whether they are actionable', systemPrompt: 'You are an alert triage specialist. Assess each alert for: severity (P0-P4), whether it is a symptom of a known issue, whether it is flapping, and whether automated remediation is safe to attempt. Suppress duplicate alerts within the same incident. Provide a clear action recommendation.', inputSchema: { alert: 'object', recentAlerts: 'array', runbook: 'string' }, outputSchema: { severity: 'P0 | P1 | P2 | P3 | P4', actionable: 'boolean', relatedAlerts: 'array', recommendation: 'string' }, position: { x: 100, y: 300 } },
        { id: 'dv_diag', type: 'agent', name: 'Diagnostic Agent', role: 'Identifies root cause by analysing correlated metrics, logs, and recent deployments', systemPrompt: 'You are a systems diagnostics specialist. Given an alert, query relevant metrics, logs, and traces to identify root cause. Check: recent deployments that correlate with the issue onset, error rate spikes, resource saturation (CPU/memory/disk/connections), and upstream/downstream service dependencies. Provide a root cause hypothesis with confidence level.', inputSchema: { alert: 'object', timeRange: 'string', services: 'array' }, outputSchema: { rootCause: 'string', confidence: 'number', evidence: 'array', affectedServices: 'array' }, position: { x: 430, y: 300 } },
        { id: 'dv_remediate', type: 'agent', name: 'Remediation Agent', role: 'Selects and executes the appropriate automated fix from the approved runbook', systemPrompt: 'You are a remediation execution specialist. Given a diagnosed root cause, select the appropriate action from the approved remediation runbook. Only execute actions that are explicitly in the runbook and appropriate for the current severity. Log every action with timestamp and rationale. Always verify that the remediation resolved the issue before closing the alert.', inputSchema: { rootCause: 'string', severity: 'string', approvedActions: 'array' }, outputSchema: { actionTaken: 'string', success: 'boolean', verificationResult: 'string' }, position: { x: 760, y: 300 } },
        { id: 'dv_metrics', type: 'tool', name: 'Observability Tool', role: 'Queries time-series metrics, structured logs, and distributed traces', systemPrompt: '', inputSchema: { service: 'string', timeRange: 'string', queries: 'array of metric/log queries' }, outputSchema: { metrics: 'array', logs: 'array', traces: 'array', anomalies: 'array' }, endpoint: 'POST /api/observability/query', position: { x: 430, y: 520 } },
        { id: 'dv_output', type: 'output', name: 'Incident Report', role: 'Renders a structured incident report with root cause, actions taken, and resolution status', systemPrompt: '', inputSchema: {}, outputSchema: {}, outputTemplate: 'report', outputDesign: 'dark-minimal', outputShowViz: false, outputShowRaw: false, position: { x: 760, y: 500 } }
      ],
      edges: [
        { id: 'dv_e1', from: 'dv_orch', to: 'dv_alert', label: 'triages alert' },
        { id: 'dv_e2', from: 'dv_alert', to: 'dv_metrics', label: 'queries telemetry' },
        { id: 'dv_e3', from: 'dv_metrics', to: 'dv_diag', label: 'provides telemetry data' },
        { id: 'dv_e4', from: 'dv_diag', to: 'dv_remediate', label: 'passes root cause' },
        { id: 'dv_e5', from: 'dv_remediate', to: 'dv_output', label: 'renders incident report' }
      ]
    }
  },
  {
    id: 'implementation-leadership',
    name: 'Implementation Leadership',
    description: 'Breaks an initiative into a phased execution plan with milestones, risk mitigations, resource ownership, and a feasibility stress-test.',
    tags: ['leadership', 'planning', 'execution', 'strategy'],
    brief: 'We are launching [initiative name]. The goal is [outcome]. Key constraints are [budget / timeline / team size]. Produce a phased execution plan with milestones, risk mitigations, clear ownership, and a feasibility assessment.',
    graph: {
      nodes: [
        {
          id: 'il_orch', type: 'orchestrator', name: 'Implementation Orchestrator',
          role: 'Coordinates the three planning agents and synthesises their outputs into a coherent execution plan',
          systemPrompt: 'You are an implementation leadership orchestrator. Your job is to take an initiative brief and coordinate three specialist agents: a scope and milestone planner, a risk and dependency analyst, and a resource and accountability planner. Once all three have completed their analysis, pass their combined output to the feasibility evaluator. Ensure the final plan is specific, time-bound, and assigns clear ownership to every workstream. Flag any gaps between what the brief asks for and what the plan can realistically deliver.',
          inputSchema: { initiative: 'string', outcome: 'string', constraints: 'object' },
          outputSchema: { plan: 'object', feasibilityScore: 'number', gaps: 'array' },
          position: { x: 430, y: 80 }
        },
        {
          id: 'il_scope', type: 'agent', name: 'Scope & Milestone Planner',
          role: 'Decomposes the initiative into phases, milestones, and concrete deliverables',
          systemPrompt: 'You are a scope and milestone planning specialist. Given an initiative brief, decompose the work into 3-5 sequential phases. For each phase: name it, state its goal, list 2-4 concrete deliverables, define a clear completion criterion, and estimate its duration in weeks. Identify the critical path — the sequence of phases where any delay directly delays the final outcome. Be specific: avoid vague deliverables like "research done". Use action-oriented language: "Deliver validated prototype with 5 user test results".',
          inputSchema: { initiative: 'string', constraints: 'object' },
          outputSchema: { phases: 'array of {name, goal, deliverables, completionCriterion, durationWeeks}', criticalPath: 'array' },
          position: { x: 100, y: 290 }
        },
        {
          id: 'il_risk', type: 'agent', name: 'Risk & Dependency Analyst',
          role: 'Surfaces implementation risks, external dependencies, and mitigation strategies',
          systemPrompt: 'You are a risk and dependency analyst for complex initiatives. Given an initiative brief, identify: (1) the top 5 implementation risks — things that could cause delay, cost overrun, or failure — each with likelihood (low/medium/high), impact (low/medium/high), an early warning signal, and a specific mitigation action; (2) critical external dependencies — teams, vendors, approvals, or data sources this initiative relies on — with the owner and lead time required; (3) single points of failure — places where one person leaving or one system going down would block progress. Be specific and direct. Do not list generic risks like "scope creep" without describing what would actually cause it here.',
          inputSchema: { initiative: 'string', constraints: 'object' },
          outputSchema: { risks: 'array of {description, likelihood, impact, earlyWarning, mitigation}', dependencies: 'array', singlePointsOfFailure: 'array' },
          position: { x: 760, y: 290 }
        },
        {
          id: 'il_resource', type: 'agent', name: 'Resource & Accountability Planner',
          role: 'Maps the skills, team members, and ownership structure required to deliver each phase',
          systemPrompt: 'You are a resource and accountability planning specialist. Given an initiative brief and its phases, define: (1) the core team — roles required, the skills each role needs, and estimated time commitment as % FTE per phase; (2) a RACI matrix for the 4-6 most critical decisions or deliverables — who is Responsible, Accountable, Consulted, and Informed; (3) governance cadence — what recurring meetings are needed, at what frequency, and who must attend. If the brief does not specify team members by name, describe the roles needed. Highlight any skill gaps between what is described and what the initiative demands.',
          inputSchema: { initiative: 'string', phases: 'array', constraints: 'object' },
          outputSchema: { team: 'array of {role, skills, commitment}', raciMatrix: 'object', governanceCadence: 'array', skillGaps: 'array' },
          position: { x: 430, y: 290 }
        },
        {
          id: 'il_eval', type: 'evaluator', name: 'Feasibility Evaluator',
          role: 'Stress-tests the combined plan for realism and flags the three most likely failure modes',
          systemPrompt: 'You are a senior implementation feasibility evaluator. You have seen many well-intentioned plans fail. Given a scope plan, risk assessment, and resource plan, your job is to play devil\'s advocate and stress-test the combined plan rigorously. Score feasibility from 0-10. Identify: (1) the three most likely failure modes — specific scenarios where this plan breaks down; (2) optimistic assumptions baked into the plan that may not hold; (3) the phase most likely to be underestimated in time or effort, and why; (4) one concrete change that would most improve the plan\'s chances of success. Be honest and specific. A score of 7/10 or above means the plan is viable with the identified caveats.',
          inputSchema: { scopePlan: 'object', riskAssessment: 'object', resourcePlan: 'object' },
          outputSchema: { feasibilityScore: 'number', failureModes: 'array', optimisticAssumptions: 'array', mostUnderestimatedPhase: 'string', topImprovement: 'string' },
          position: { x: 430, y: 490 }
        },
        {
          id: 'il_output', type: 'output', name: 'Execution Plan',
          role: 'Renders the full implementation plan as a structured report',
          systemPrompt: '', inputSchema: {}, outputSchema: {},
          outputTemplate: 'report', outputDesign: 'dark-minimal', outputShowViz: false, outputShowRaw: false,
          position: { x: 430, y: 670 }
        }
      ],
      edges: [
        { id: 'il_e1', from: 'il_orch',     to: 'il_scope',    label: 'maps scope & milestones' },
        { id: 'il_e2', from: 'il_orch',     to: 'il_risk',     label: 'identifies risks' },
        { id: 'il_e3', from: 'il_orch',     to: 'il_resource', label: 'plans resources' },
        { id: 'il_e4', from: 'il_scope',    to: 'il_eval',     label: 'passes scope plan' },
        { id: 'il_e5', from: 'il_risk',     to: 'il_eval',     label: 'passes risk assessment' },
        { id: 'il_e6', from: 'il_resource', to: 'il_eval',     label: 'passes resource plan' },
        { id: 'il_e7', from: 'il_eval',     to: 'il_output',   label: 'renders execution plan' }
      ]
    }
  },
  {
    id: 'stakeholder-alignment',
    name: 'Stakeholder Alignment',
    description: 'Maps stakeholders, surfaces objections, crafts tailored messaging per group, and routes to human review before producing an alignment brief.',
    tags: ['leadership', 'communication', 'strategy', 'change management'],
    brief: 'We need alignment on [proposal or initiative]. The key decision or ask is [what you need them to agree to]. The stakeholder groups involved are [list groups or individuals]. Known concerns or tensions include [any you are already aware of].',
    graph: {
      nodes: [
        {
          id: 'sa_orch', type: 'orchestrator', name: 'Alignment Orchestrator',
          role: 'Coordinates stakeholder analysis and messaging strategy to build a coherent alignment plan',
          systemPrompt: 'You are a stakeholder alignment orchestrator. Your job is to take a proposal or initiative and build a plan to get the right people aligned. Coordinate two parallel agents: a stakeholder mapper who builds a landscape of all relevant parties, and a concern analyst who surfaces likely objections and resistance. Once both are complete, pass their combined output to the messaging strategist. Your output should give the person running this initiative a clear, practical playbook for building alignment — not a generic communication plan, but one tailored to the specific stakeholders and tensions at play.',
          inputSchema: { proposal: 'string', stakeholders: 'array', knownTensions: 'string' },
          outputSchema: { alignmentPlaybook: 'object' },
          position: { x: 430, y: 80 }
        },
        {
          id: 'sa_mapper', type: 'agent', name: 'Stakeholder Mapper',
          role: 'Maps each stakeholder group by interest, influence, and current alignment status',
          systemPrompt: 'You are a stakeholder mapping specialist. Given a proposal and a list of stakeholder groups, build a stakeholder landscape. For each group or individual: (1) their primary interest — what they care most about, in their own terms, not yours; (2) their level of influence over this decision (low/medium/high/veto); (3) their current likely stance (champion, supportive, neutral, sceptical, resistant); (4) their key question — the one thing they most need answered before they will commit; (5) their preferred communication style (data-driven, narrative, peer-to-peer, formal briefing). If you are not given specific stakeholder names, infer likely groups from the type of proposal. Be direct — do not hedge every assessment with "it depends".',
          inputSchema: { proposal: 'string', stakeholders: 'array' },
          outputSchema: { stakeholderMap: 'array of {name, interest, influence, stance, keyQuestion, commStyle}' },
          position: { x: 170, y: 290 }
        },
        {
          id: 'sa_concern', type: 'agent', name: 'Concern & Objection Analyst',
          role: 'Surfaces the real objections each stakeholder group is likely to raise, including those they may not voice openly',
          systemPrompt: 'You are a stakeholder concern and objection analyst. Your job is to anticipate resistance — including the objections that stakeholders will think but not say out loud. Given a proposal and stakeholder list, for each group identify: (1) their stated objection — what they will say in the room; (2) their real concern — the underlying fear, loss of control, or self-interest driving that objection; (3) the threshold for their support — what would need to be true for them to move from sceptical to supportive; (4) their BATNA — what they will push for if they do not get what they want. Flag any stakeholders whose resistance could be a veto or seriously derail the initiative.',
          inputSchema: { proposal: 'string', stakeholders: 'array', knownTensions: 'string' },
          outputSchema: { objections: 'array of {stakeholder, statedObjection, realConcern, supportThreshold, batna}', vetoRisks: 'array' },
          position: { x: 690, y: 290 }
        },
        {
          id: 'sa_messaging', type: 'agent', name: 'Messaging Strategist',
          role: 'Crafts tailored talking points and engagement sequences for each stakeholder group',
          systemPrompt: 'You are a strategic messaging specialist. Given a stakeholder map and objection analysis, produce a tailored engagement plan. For each stakeholder group: (1) the one-sentence framing of the proposal in terms of what they care about — not what you want, but what is in it for them; (2) three concrete talking points that address their key question and real concern; (3) what to avoid saying — phrases or framings that will trigger resistance; (4) the ideal sequence — who to bring on board first, because their endorsement will influence others; (5) the right format and setting for the conversation (one-to-one, group workshop, written brief, etc.). End with a recommended engagement sequence: the order in which to approach stakeholders for maximum momentum.',
          inputSchema: { stakeholderMap: 'array', objections: 'array', proposal: 'string' },
          outputSchema: { messagingByGroup: 'array of {group, framing, talkingPoints, avoid, format}', engagementSequence: 'array' },
          position: { x: 430, y: 480 }
        },
        {
          id: 'sa_review', type: 'human-in-loop', name: 'Leader Review',
          role: 'Pause for the leader to review messaging and engagement strategy before it is acted on',
          systemPrompt: 'Review the stakeholder map, objection analysis, and proposed messaging strategy. Check: Are all key stakeholders represented? Is the framing for each group accurate and credible? Are there any talking points that feel off or risky? Adjust the engagement sequence if needed, then approve to generate the final alignment brief.',
          inputSchema: {}, outputSchema: {},
          position: { x: 430, y: 660 }
        },
        {
          id: 'sa_output', type: 'output', name: 'Alignment Brief',
          role: 'Renders the stakeholder alignment strategy as an executive brief',
          systemPrompt: '', inputSchema: {}, outputSchema: {},
          outputTemplate: 'brief', outputDesign: 'editorial-light', outputShowViz: false, outputShowRaw: false,
          position: { x: 430, y: 840 }
        }
      ],
      edges: [
        { id: 'sa_e1', from: 'sa_orch',      to: 'sa_mapper',    label: 'maps landscape' },
        { id: 'sa_e2', from: 'sa_orch',      to: 'sa_concern',   label: 'surfaces resistance' },
        { id: 'sa_e3', from: 'sa_mapper',    to: 'sa_messaging', label: 'informs messaging' },
        { id: 'sa_e4', from: 'sa_concern',   to: 'sa_messaging', label: 'informs messaging' },
        { id: 'sa_e5', from: 'sa_messaging', to: 'sa_review',    label: 'routes for review' },
        { id: 'sa_e6', from: 'sa_review',    to: 'sa_output',    label: 'renders brief' }
      ]
    }
  },
  {
    id: 'strategic-judgment',
    name: 'Strategic Judgment',
    description: 'Generates strategic options, maps second-order consequences, stress-tests the leading option, and synthesises a clear recommendation.',
    tags: ['strategy', 'decision-making', 'leadership', 'analysis'],
    brief: 'We are facing the following strategic decision: [describe the decision or dilemma]. The context is [relevant background]. Our goals are [what we are optimising for]. The options we have considered so far are [any options already on the table, or "none yet"].',
    graph: {
      nodes: [
        {
          id: 'sj_orch', type: 'orchestrator', name: 'Strategy Orchestrator',
          role: 'Frames the strategic decision and coordinates parallel analysis before synthesis',
          systemPrompt: 'You are a strategic judgment orchestrator. Your job is to help a leader make a high-quality decision under uncertainty. Begin by sharpening the decision framing: what is actually being decided, what is not being decided, and what are the most important criteria for a good outcome? Then coordinate three parallel agents: an options generator, a second-order consequence analyst, and a devil\'s advocate. Once all three have completed their analysis, pass the combined output to the decision synthesizer. Your goal is to expand the decision space, surface hidden assumptions, and build the case for a clear recommendation — while honestly representing the uncertainty involved.',
          inputSchema: { decision: 'string', context: 'string', goals: 'string', optionsOnTable: 'string' },
          outputSchema: { framedDecision: 'string', successCriteria: 'array', recommendation: 'object' },
          position: { x: 430, y: 80 }
        },
        {
          id: 'sj_options', type: 'agent', name: 'Options Generator',
          role: 'Generates a set of distinct, genuinely different strategic options beyond the obvious ones',
          systemPrompt: 'You are a strategic options generator. Your job is to expand the decision space beyond the options already on the table. Given a strategic decision, generate 4-6 distinct options. Include: (1) the obvious option — what most people would do; (2) the bold option — a higher-risk, higher-reward path; (3) the do-nothing option — what happens if no decision is made; (4) the reframe option — an option that solves the underlying problem differently; (5) one or two hybrids or creative alternatives. For each option: name it, describe it in 2-3 sentences, state its core logic (why would this work?), and identify the key assumption it depends on. Do not evaluate the options — that is for the other agents. Your job is to make the option set richer and more imaginative.',
          inputSchema: { decision: 'string', context: 'string', optionsOnTable: 'string' },
          outputSchema: { options: 'array of {name, description, coreLogic, keyAssumption}' },
          position: { x: 100, y: 290 }
        },
        {
          id: 'sj_consequences', type: 'agent', name: 'Second-Order Analyst',
          role: 'Maps the near-term and second-order consequences, trade-offs, and reversibility of each option',
          systemPrompt: 'You are a second-order consequence analyst. Given a set of strategic options, map the consequences of each — especially the ones that are not immediately obvious. For each option evaluate: (1) first-order consequences — the direct, intended effects; (2) second-order consequences — what happens next, once the first-order effects play out; (3) trade-offs — what you give up or make harder by choosing this path; (4) reversibility — how hard is it to undo this decision if circumstances change? Rate as easily reversible, partially reversible, or irreversible; (5) who wins and who loses — which stakeholders benefit, and which are disadvantaged? Present your analysis as a clear comparison across options, highlighting where the choices most sharply diverge.',
          inputSchema: { options: 'array', context: 'string', goals: 'string' },
          outputSchema: { consequenceMap: 'array of {option, firstOrder, secondOrder, tradeOffs, reversibility, winners, losers}' },
          position: { x: 760, y: 290 }
        },
        {
          id: 'sj_advocate', type: 'agent', name: "Devil's Advocate",
          role: 'Aggressively stress-tests the most likely choice and surfaces the strongest case against it',
          systemPrompt: 'You are a devil\'s advocate for strategic decisions. Your job is not to be balanced — it is to make the strongest possible case against the leading option and to surface the risks that optimistic thinking tends to overlook. Given a set of strategic options, identify which one seems most likely to be recommended based on the context and goals. Then attack it rigorously: (1) What is the most plausible scenario in which this option fails? Describe it concretely, not abstractly; (2) What would have to be true about the world for this to be a bad choice? Which of those things might actually be true? (3) What are decision-makers likely to be overconfident about here? (4) What is the strongest argument for the option that looks least attractive? (5) What question is nobody asking that they should be? Be direct, specific, and uncomfortable. Your job is to make the final decision more robust, not to win the argument.',
          inputSchema: { options: 'array', context: 'string', goals: 'string' },
          outputSchema: { leadingOption: 'string', failureScenario: 'string', overconfidenceRisks: 'array', strongestCounterArgument: 'string', questionNobodyAsking: 'string' },
          position: { x: 430, y: 290 }
        },
        {
          id: 'sj_synth', type: 'agent', name: 'Decision Synthesizer',
          role: 'Integrates all analysis into a single clear recommendation with explicit reasoning and conditions',
          systemPrompt: 'You are a decision synthesis specialist. You have received options analysis, second-order consequence mapping, and devil\'s advocate critique. Your job is to integrate all of this into a clear, well-reasoned recommendation. Structure your output as follows: (1) The recommendation — state it in one sentence, unambiguously; (2) The core reasoning — the two or three most important reasons this is the right choice given the goals and context; (3) The critical assumption — the one thing that most needs to be true for this recommendation to hold; (4) The conditions under which you would recommend differently — if X happens, switch to option Y; (5) The three most important actions to take in the first 30 days; (6) What to monitor — the leading indicators that will tell you if the decision is working or needs to be revisited. Do not hedge everything. A recommendation that says "it depends" without specifying what it depends on is not useful. Be decisive while being honest about uncertainty.',
          inputSchema: { options: 'array', consequenceMap: 'array', devilsAdvocate: 'object', goals: 'string' },
          outputSchema: { recommendation: 'string', coreReasoning: 'array', criticalAssumption: 'string', conditions: 'string', first30Days: 'array', monitoringIndicators: 'array' },
          position: { x: 430, y: 490 }
        },
        {
          id: 'sj_output', type: 'output', name: 'Strategic Brief',
          role: 'Renders the decision analysis and recommendation as an executive brief',
          systemPrompt: '', inputSchema: {}, outputSchema: {},
          outputTemplate: 'brief', outputDesign: 'brand', outputShowViz: false, outputShowRaw: false,
          position: { x: 430, y: 670 }
        }
      ],
      edges: [
        { id: 'sj_e1', from: 'sj_orch',       to: 'sj_options',      label: 'generates options' },
        { id: 'sj_e2', from: 'sj_orch',       to: 'sj_consequences', label: 'maps consequences' },
        { id: 'sj_e3', from: 'sj_orch',       to: 'sj_advocate',     label: 'stress-tests' },
        { id: 'sj_e4', from: 'sj_options',    to: 'sj_synth',        label: 'passes options' },
        { id: 'sj_e5', from: 'sj_consequences', to: 'sj_synth',      label: 'passes consequence map' },
        { id: 'sj_e6', from: 'sj_advocate',   to: 'sj_synth',        label: 'passes critique' },
        { id: 'sj_e7', from: 'sj_synth',      to: 'sj_output',       label: 'renders brief' }
      ]
    }
  }
];
