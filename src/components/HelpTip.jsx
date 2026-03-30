import { useState } from 'react';

/**
 * HelpTip — a small ? icon that shows a tooltip on hover.
 * Renders nothing when prefs.helpBubbles is falsy.
 */
export function HelpTip({ text, prefs }) {
  const [visible, setVisible] = useState(false);
  if (!prefs?.helpBubbles) return null;

  return (
    <span
      className="help-tip"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      ?
      {visible && <span className="help-tip-bubble">{text}</span>}
    </span>
  );
}
