import { useState, useMemo } from 'react';
import { estimateGraphCost, DEFAULTS } from '../data/llmPricing.js';

const fmt = (n) => {
  if (n === 0)    return '$0.00';
  if (n < 0.0001) return `$${n.toExponential(2)}`;
  if (n < 0.01)   return `$${n.toFixed(5)}`;
  return `$${n.toFixed(4)}`;
};

const fmtBig = (n) => {
  if (n === 0) return '$0.00';
  if (n < 0.01) return `$${n.toFixed(5)}`;
  return `$${n.toFixed(2)}`;
};

const PROVIDER_LABELS = {
  'claude-api': 'Claude',
  openai:       'OpenAI',
  gemini:       'Gemini',
  mistral:      'Mistral',
  ollama:       'Ollama (free)',
};

export function CostEstimator({ graph, onClose }) {
  // Per-node overrides: nodeId → { inputTokens, outputTokens, callsPerRun }
  const [overrides, setOverrides] = useState(() => new Map());
  const [runsPerDay, setRunsPerDay] = useState(100);

  const setOverride = (nodeId, field, value) => {
    setOverrides(prev => {
      const next = new Map(prev);
      const cur  = next.get(nodeId) || {};
      next.set(nodeId, { ...cur, [field]: Math.max(1, Number(value) || 1) });
      return next;
    });
  };

  const { rows, totalPerRun } = useMemo(
    () => estimateGraphCost(graph, overrides),
    [graph, overrides],
  );

  const totalPerDay   = totalPerRun * runsPerDay;
  const totalPerMonth = totalPerDay * 30;

  const hasCosts = rows.some(r => r.totalCost > 0);

  if (!graph.nodes?.length) {
    return (
      <div className="cost-panel">
        <div className="cost-header">
          <span className="cost-title">Cost Estimator</span>
          <button className="cost-close" onClick={onClose}>✕</button>
        </div>
        <p className="cost-empty">Add nodes to the canvas to estimate costs.</p>
      </div>
    );
  }

  return (
    <div className="cost-panel">
      <div className="cost-header">
        <span className="cost-title">Cost Estimator</span>
        <button className="cost-close" onClick={onClose}>✕</button>
      </div>

      <div className="cost-note">
        Estimates based on token assumptions per call. Adjust per node as needed.
      </div>

      {/* Summary bar */}
      <div className="cost-summary">
        <div className="cost-summary-item">
          <span className="cost-summary-label">Per run</span>
          <span className="cost-summary-value">{fmtBig(totalPerRun)}</span>
        </div>
        <div className="cost-summary-sep" />
        <div className="cost-summary-item">
          <span className="cost-summary-label">Per day</span>
          <div className="cost-runs-row">
            <span className="cost-summary-value">{fmtBig(totalPerDay)}</span>
            <span className="cost-runs-label">@</span>
            <input
              className="cost-runs-input"
              type="number"
              min={1}
              value={runsPerDay}
              onChange={e => setRunsPerDay(Math.max(1, Number(e.target.value) || 1))}
            />
            <span className="cost-runs-label">runs</span>
          </div>
        </div>
        <div className="cost-summary-sep" />
        <div className="cost-summary-item">
          <span className="cost-summary-label">Per month</span>
          <span className="cost-summary-value">{fmtBig(totalPerMonth)}</span>
        </div>
      </div>

      {!hasCosts && (
        <div className="cost-free-note">
          All nodes use free / local providers (Ollama or no LLM call).
        </div>
      )}

      {/* Per-node table */}
      <div className="cost-table-wrap">
        <table className="cost-table">
          <thead>
            <tr>
              <th>Node</th>
              <th>Provider / Model</th>
              <th title="Input tokens per call">In tok</th>
              <th title="Output tokens per call">Out tok</th>
              <th title="Calls per pipeline run">×calls</th>
              <th>Cost / run</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const ov = overrides.get(row.id) || {};
              return (
                <tr key={row.id} className={row.totalCost === 0 ? 'cost-row-free' : ''}>
                  <td className="cost-node-name">
                    <span className={`cost-type-dot cost-type-${row.type}`} />
                    {row.name}
                  </td>
                  <td className="cost-provider">
                    <span>{PROVIDER_LABELS[row.provider] || row.provider}</span>
                    <span className="cost-model">{row.model}</span>
                  </td>
                  <td>
                    <input
                      className="cost-tok-input"
                      type="number"
                      min={1}
                      value={ov.inputTokens ?? DEFAULTS.inputTokens}
                      onChange={e => setOverride(row.id, 'inputTokens', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="cost-tok-input"
                      type="number"
                      min={1}
                      value={ov.outputTokens ?? DEFAULTS.outputTokens}
                      onChange={e => setOverride(row.id, 'outputTokens', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="cost-tok-input cost-tok-small"
                      type="number"
                      min={1}
                      value={ov.callsPerRun ?? DEFAULTS.callsPerRun}
                      onChange={e => setOverride(row.id, 'callsPerRun', e.target.value)}
                    />
                  </td>
                  <td className="cost-cell-value">
                    {row.totalCost === 0
                      ? <span className="cost-free-tag">free</span>
                      : fmt(row.totalCost)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="cost-total-label">Total per run</td>
              <td className="cost-total-value">{fmtBig(totalPerRun)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="cost-disclaimer">
        Prices are approximate and may differ from your actual invoices. Ollama / local models have no API cost.
      </div>
    </div>
  );
}
