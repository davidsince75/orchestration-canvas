export function ValidationBar({ issues, onHighlight }) {
  const errors   = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');

  if (issues.length === 0) {
    return (
      <div className="validation-bar">
        <span className="validation-ok-label">✓ Architecture looks good</span>
      </div>
    );
  }

  return (
    <div className="validation-bar">
      {errors.length > 0 && (
        <span className="validation-badge error">✕ {errors.length} error{errors.length > 1 ? 's' : ''}</span>
      )}
      {warnings.length > 0 && (
        <span className="validation-badge warning">⚠ {warnings.length} warning{warnings.length > 1 ? 's' : ''}</span>
      )}
      {issues.slice(0, 4).map((issue, i) => (
        <span
          key={i}
          className={`validation-item ${issue.severity}`}
          title={issue.message}
          onClick={() => onHighlight(new Set(issue.nodeIds || []))}
        >
          {issue.message}
        </span>
      ))}
      {issues.length > 4 && (
        <span className="validation-item" style={{ color: '#333' }}>+{issues.length - 4} more</span>
      )}
    </div>
  );
}
