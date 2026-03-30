import { useState, useMemo } from 'react';
import { canVisualize } from '../utils/infranodusViz.js';
import { VizPanel } from './VizPanel.jsx';
import { OUTPUT_TEMPLATE_MAP, DEFAULT_OUTPUT_TEMPLATE } from '../data/outputTemplates.js';
import { OUTPUT_DESIGN_MAP, DEFAULT_OUTPUT_DESIGN } from '../data/outputDesigns.js';

// ─── Lightweight Markdown Renderer ────────────────────────────────────────────

/**
 * Converts a markdown string to an array of React elements.
 * Supports: h1-h3, bold, italic, inline code, fenced code blocks,
 * unordered lists, ordered lists, blockquotes, horizontal rules, links.
 */
function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={key++} className="out-code-block">
          {lang && <span className="out-code-lang">{lang}</span>}
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      i++;
      continue;
    }

    // Heading h1
    if (line.startsWith('# ')) {
      elements.push(<h1 key={key++} className="out-md-h1">{inlineMarkdown(line.slice(2))}</h1>);
      i++; continue;
    }
    // Heading h2
    if (line.startsWith('## ')) {
      elements.push(<h2 key={key++} className="out-md-h2">{inlineMarkdown(line.slice(3))}</h2>);
      i++; continue;
    }
    // Heading h3
    if (line.startsWith('### ')) {
      elements.push(<h3 key={key++} className="out-md-h3">{inlineMarkdown(line.slice(4))}</h3>);
      i++; continue;
    }

    // Horizontal rule
    if (/^(---|\*\*\*|___)\s*$/.test(line)) {
      elements.push(<hr key={key++} className="out-md-hr" />);
      i++; continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={key++} className="out-md-blockquote">
          {inlineMarkdown(line.slice(2))}
        </blockquote>
      );
      i++; continue;
    }

    // Unordered list — collect consecutive list items
    if (/^[-*+] /.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*+] /.test(lines[i])) {
        items.push(<li key={items.length}>{inlineMarkdown(lines[i].slice(2))}</li>);
        i++;
      }
      elements.push(<ul key={key++} className="out-md-ul">{items}</ul>);
      continue;
    }

    // Ordered list — collect consecutive list items
    if (/^\d+\. /.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(<li key={items.length}>{inlineMarkdown(lines[i].replace(/^\d+\. /, ''))}</li>);
        i++;
      }
      elements.push(<ol key={key++} className="out-md-ol">{items}</ol>);
      continue;
    }

    // Blank line — skip
    if (line.trim() === '') {
      i++; continue;
    }

    // Paragraph
    elements.push(<p key={key++} className="out-md-p">{inlineMarkdown(line)}</p>);
    i++;
  }

  return elements;
}

/** Apply inline markdown: bold, italic, inline code, links */
function inlineMarkdown(text) {
  if (!text) return text;
  // Split by inline markers, preserving them
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={idx} className="out-inline-code">{part.slice(1, -1)}</code>;
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={idx}>{part.slice(1, -1)}</em>;
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch)
      return <a key={idx} href={linkMatch[2]} target="_blank" rel="noreferrer" className="out-link">{linkMatch[1]}</a>;
    return part;
  });
}

// ─── Output Parsing ────────────────────────────────────────────────────────────

/**
 * Attempts to parse raw output string into a structured object.
 * Returns { type: 'json'|'markdown'|'text', data }
 */
function parseOutput(raw) {
  if (!raw) return { type: 'text', data: '' };
  try {
    const parsed = JSON.parse(raw);
    return { type: 'json', data: parsed };
  } catch {
    // Detect markdown by presence of heading/list markers
    if (/^#{1,3} |^[-*+] |\*\*|^> /.test(raw)) {
      return { type: 'markdown', data: raw };
    }
    return { type: 'text', data: raw };
  }
}

/**
 * Try to extract a section's content from parsed JSON or raw text.
 * If JSON has a matching key, use it; otherwise fall back to the raw string.
 */
function extractSection(sectionId, parsed, rawText) {
  if (parsed?.type === 'json' && parsed.data) {
    const d = parsed.data;
    // Check common synonyms
    const synonyms = {
      title:           ['title', 'name', 'heading'],
      summary:         ['summary', 'abstract', 'overview', 'executive_summary'],
      findings:        ['findings', 'key_findings', 'results', 'insights'],
      recommendations: ['recommendations', 'recommendation', 'suggestions'],
      nextSteps:       ['next_steps', 'nextSteps', 'actions', 'action_items'],
      introduction:    ['introduction', 'intro', 'background'],
      methodology:     ['methodology', 'method', 'approach'],
      analysis:        ['analysis', 'discussion'],
      conclusion:      ['conclusion', 'summary', 'closing'],
      references:      ['references', 'sources', 'citations'],
      topic:           ['topic', 'subject', 'title'],
      abstract:        ['abstract', 'summary', 'overview'],
      concepts:        ['concepts', 'key_concepts', 'keywords', 'terms'],
      gaps:            ['gaps', 'content_gaps', 'missing', 'blind_spots'],
      questions:       ['questions', 'research_questions'],
      notes:           ['notes', 'footnotes', 'comments'],
    };
    const keys = synonyms[sectionId] || [sectionId];
    for (const k of keys) {
      if (d[k] !== undefined) return d[k];
    }
  }
  // For single-section templates like markdown-doc, return the full raw text
  return rawText || '';
}

// ─── Section Renderers ────────────────────────────────────────────────────────

function SectionText({ value }) {
  if (!value) return null;
  const str = Array.isArray(value) ? value[0] : String(value);
  return <div className="out-section-text">{str}</div>;
}

function SectionMarkdown({ value }) {
  const str = Array.isArray(value) ? value.join('\n') : String(value || '');
  return <div className="out-section-markdown">{renderMarkdown(str)}</div>;
}

function SectionList({ value }) {
  if (!value) return <p className="out-empty">No items.</p>;
  const items = Array.isArray(value) ? value : String(value).split('\n').filter(Boolean);
  return (
    <ul className="out-list">
      {items.map((item, i) => (
        <li key={i} className="out-list-item">{inlineMarkdown(String(item))}</li>
      ))}
    </ul>
  );
}

function SectionTable({ value, rawText }) {
  // Try to render a table from JSON array or object-with-rows
  let rows = null;

  if (Array.isArray(value) && value.length > 0) {
    rows = value;
  } else if (value && typeof value === 'object' && Array.isArray(value.rows)) {
    rows = value.rows;
  }

  if (!rows) {
    // Fall back to markdown rendering of the raw text
    return <SectionMarkdown value={rawText} />;
  }

  const headers = Object.keys(rows[0]);
  return (
    <div className="out-table-wrap">
      <table className="out-table">
        <thead>
          <tr>{headers.map(h => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 1 ? 'out-table-stripe' : ''}>
              {headers.map(h => <td key={h}>{String(row[h] ?? '')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionSlides({ value, rawText }) {
  const [slide, setSlide] = useState(0);

  const slides = useMemo(() => {
    if (Array.isArray(value)) return value;
    const src = value || rawText || '';
    // Split on '---' slide separator or double newlines
    return String(src).split(/\n---\n|\n\n/).filter(s => s.trim());
  }, [value, rawText]);

  if (!slides.length) return <p className="out-empty">No slides.</p>;

  return (
    <div className="out-slides">
      <div className="out-slide-content">
        {renderMarkdown(String(slides[slide]))}
      </div>
      <div className="out-slide-nav">
        <button
          className="out-slide-btn"
          disabled={slide === 0}
          onClick={() => setSlide(s => s - 1)}
        >← Prev</button>
        <span className="out-slide-counter">{slide + 1} / {slides.length}</span>
        <button
          className="out-slide-btn"
          disabled={slide === slides.length - 1}
          onClick={() => setSlide(s => s + 1)}
        >Next →</button>
      </div>
    </div>
  );
}

function renderSection(section, parsed, rawText) {
  const value = extractSection(section.id, parsed, rawText);
  switch (section.type) {
    case 'text':     return <SectionText     value={value} />;
    case 'markdown': return <SectionMarkdown value={value} />;
    case 'list':     return <SectionList     value={value} />;
    case 'table':    return <SectionTable    value={value} rawText={rawText} />;
    case 'slides':   return <SectionSlides   value={value} rawText={rawText} />;
    default:         return <SectionMarkdown value={value} />;
  }
}

// ─── OutputRenderer ───────────────────────────────────────────────────────────

/**
 * OutputRenderer — renders pipeline output in a rich designed format.
 *
 * Props:
 *   node    {object} — the output node config (outputTemplate, outputDesign, outputCustomSections, etc.)
 *   output  {string} — raw output string from the upstream pipeline node
 *   error   {string} — error message if the run failed
 */
export function OutputRenderer({ node, output, error }) {
  const [showRaw, setShowRaw] = useState(false);

  const templateId = node?.outputTemplate || DEFAULT_OUTPUT_TEMPLATE;
  const designId   = node?.outputDesign   || DEFAULT_OUTPUT_DESIGN;

  const template = OUTPUT_TEMPLATE_MAP[templateId] || OUTPUT_TEMPLATE_MAP[DEFAULT_OUTPUT_TEMPLATE];
  const design   = OUTPUT_DESIGN_MAP[designId]     || OUTPUT_DESIGN_MAP[DEFAULT_OUTPUT_DESIGN];

  // Use custom sections if template is 'custom' and sections are defined
  const sections = (templateId === 'custom' && node?.outputCustomSections?.length)
    ? node.outputCustomSections
    : template.sections;

  const parsed   = useMemo(() => parseOutput(output), [output]);
  const showViz  = node?.outputShowViz !== false && canVisualize(output);
  const showRawToggle = node?.outputShowRawToggle !== false;

  const handleCopy = () => {
    if (output) navigator.clipboard.writeText(output);
  };

  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `${(node?.name || 'output').replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Apply design CSS variables as inline style on the container
  const designStyle = design?.vars
    ? Object.fromEntries(Object.entries(design.vars))
    : {};

  // ── Error state ──
  if (error) {
    return (
      <div className="out-renderer out-renderer-error" style={designStyle}>
        <div className="out-error-icon">✕</div>
        <div className="out-error-msg">{error}</div>
      </div>
    );
  }

  // ── Empty state ──
  if (!output) {
    return (
      <div className="out-renderer out-renderer-empty" style={designStyle}>
        <div className="out-empty-icon">{template.icon}</div>
        <div className="out-empty-label">Waiting for output…</div>
        <div className="out-empty-sub">Run the pipeline to see results here.</div>
      </div>
    );
  }

  return (
    <div className={`out-renderer out-design-${designId}`} style={designStyle}>

      {/* ── Toolbar ── */}
      <div className="out-toolbar">
        <span className="out-toolbar-template">{template.icon} {template.label}</span>
        <span className="out-toolbar-design">{design.label}</span>
        <div className="out-toolbar-actions">
          {showRawToggle && (
            <button className="out-tool-btn" onClick={() => setShowRaw(r => !r)} title="Toggle raw output">
              {showRaw ? '🎨 Styled' : '⌨ Raw'}
            </button>
          )}
          <button className="out-tool-btn" onClick={handleCopy} title="Copy raw output">
            Copy
          </button>
          <button className="out-tool-btn" onClick={handleDownload} title="Download as text file">
            ⬇ Save
          </button>
        </div>
      </div>

      {/* ── Raw mode ── */}
      {showRaw ? (
        <div className="out-raw">
          <pre className="out-raw-pre">{output}</pre>
        </div>
      ) : (
        <>
          {/* ── Viz embed (InfraNodus constellation) ── */}
          {showViz && (
            <div className="out-viz-wrap">
              <VizPanel output={output} height={440} />
            </div>
          )}

          {/* ── Templated sections ── */}
          <div className="out-sections">
            {sections.length === 0 ? (
              /* custom template with no sections yet — render best-effort */
              <div className="out-section">
                <div className="out-section-body">
                  {parsed.type === 'json'
                    ? <SectionTable value={parsed.data?.rows || parsed.data} rawText={output} />
                    : <SectionMarkdown value={output} />
                  }
                </div>
              </div>
            ) : (
              sections.map(section => {
                // Special: title section gets a prominent heading treatment
                if (section.type === 'text') {
                  const titleVal = extractSection(section.id, parsed, output);
                  if (titleVal) {
                    return (
                      <div key={section.id} className="out-title-block">
                        <h1 className="out-doc-title">
                          {String(Array.isArray(titleVal) ? titleVal[0] : titleVal)}
                        </h1>
                      </div>
                    );
                  }
                  return null;
                }

                const bodyContent = renderSection(section, parsed, output);
                // Skip empty sections silently (fallback still renders something)
                return (
                  <div key={section.id} className="out-section">
                    <h3 className="out-section-heading">{section.label}</h3>
                    <div className="out-section-body">{bodyContent}</div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
