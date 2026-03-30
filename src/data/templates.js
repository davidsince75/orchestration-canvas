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
  }
];
