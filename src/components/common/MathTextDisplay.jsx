// /src/components/common/MathTextDisplay.jsx

import React, { useMemo } from 'react';
import 'katex/dist/katex.min.css';
import { parseTextWithMath } from '../../utils/mathRenderer';

/**
 * Component to display text with rendered math formulas
 * Parses $...$ and $$...$$ and renders them using KaTeX
 */
const MathTextDisplay = ({ text, component: Component = 'span', ...props }) => {
  const rendered = useMemo(() => parseTextWithMath(text || ''), [text]);

  return (
    <Component {...props}>
      {rendered.map((part, idx) => {
        if (part.type === 'text') {
          return <span key={idx}>{part.content}</span>;
        } else if (part.type === 'math') {
          return (
            <span
              key={idx}
              dangerouslySetInnerHTML={{ __html: part.content }}
              style={{ display: part.isDisplay ? 'block' : 'inline', maxWidth: '100%', overflowX: part.isDisplay ? 'auto' : undefined }}
            />
          );
        } else if (part.type === 'error') {
          return (
            <span key={idx} style={{ color: 'var(--mst-error)', background: 'var(--mst-error-surface)', padding: '2px 4px', borderRadius: '2px' }}>
              [Math Error: {part.content}]
            </span>
          );
        }
        return null;
      })}
    </Component>
  );
};

export default MathTextDisplay;
