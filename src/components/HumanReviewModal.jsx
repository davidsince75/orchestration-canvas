import { useState, useEffect } from 'react';

/**
 * HumanReviewModal — shown when a human-in-loop node is waiting for a decision.
 *
 * Props:
 *   review   { runId, nodeId, nodeName, instructions, content, timeoutMins }
 *   onSubmit (approved: boolean, feedback: string) => void
 */
export function HumanReviewModal({ review, onSubmit }) {
  const [feedback,       setFeedback]       = useState('');
  const [secondsLeft,    setSecondsLeft]     = useState(null);
  const [submitting,     setSubmitting]      = useState(false);

  // Countdown timer when a timeout is configured
  useEffect(() => {
    if (!review?.timeoutMins || review.timeoutMins === 0) {
      setSecondsLeft(null);
      return;
    }
    const total = review.timeoutMins * 60;
    setSecondsLeft(total);
    const id = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(id); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [review?.runId, review?.nodeId, review?.timeoutMins]);

  if (!review) return null;

  const handleApprove = async () => {
    if (submitting) return;
    setSubmitting(true);
    await onSubmit(true, feedback);
    setFeedback('');
    setSubmitting(false);
  };

  const handleReject = async () => {
    if (submitting) return;
    setSubmitting(true);
    await onSubmit(false, feedback);
    setFeedback('');
    setSubmitting(false);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="human-review-overlay">
      <div className="human-review-modal">
        {/* Header */}
        <div className="human-review-header">
          <div className="human-review-header-left">
            <span className="human-review-icon">👤</span>
            <div>
              <div className="human-review-title">Human Review Required</div>
              <div className="human-review-node-name">{review.nodeName}</div>
            </div>
          </div>
          {secondsLeft !== null && (
            <div className={`human-review-timer ${secondsLeft < 30 ? 'urgent' : ''}`}>
              ⏱ {formatTime(secondsLeft)}
            </div>
          )}
        </div>

        {/* Instructions */}
        {review.instructions && (
          <div className="human-review-section">
            <div className="human-review-section-label">Instructions</div>
            <div className="human-review-instructions">{review.instructions}</div>
          </div>
        )}

        {/* Content to review */}
        <div className="human-review-section">
          <div className="human-review-section-label">Content for Review</div>
          <pre className="human-review-content">{review.content}</pre>
        </div>

        {/* Feedback */}
        <div className="human-review-section">
          <div className="human-review-section-label">Feedback <span className="human-review-optional">(optional)</span></div>
          <textarea
            className="human-review-feedback"
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="Add a note for the pipeline…"
            rows={3}
          />
        </div>

        {/* Action buttons */}
        <div className="human-review-actions">
          <button
            className="human-review-reject-btn"
            onClick={handleReject}
            disabled={submitting}
            title="Reject — pipeline will stop at this node"
          >
            ✕ Reject
          </button>
          <button
            className="human-review-approve-btn"
            onClick={handleApprove}
            disabled={submitting}
            title="Approve — pipeline continues"
          >
            ✓ Approve
          </button>
        </div>
      </div>
    </div>
  );
}
