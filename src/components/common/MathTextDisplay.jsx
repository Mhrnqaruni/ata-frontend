// /src/components/common/MathTextDisplay.jsx

import React, { useMemo } from 'react';
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
              style={{ display: part.isDisplay ? 'block' : 'inline' }}
            />
          );
        } else if (part.type === 'error') {
          return (
            <span key={idx} style={{ color: 'crimson', background: '#fee', padding: '2px 4px', borderRadius: '2px' }}>
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
