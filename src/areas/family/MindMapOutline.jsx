// The mind map on phones (Phase 1.38 design §6.7): the same map as a tap-to-open outline, with no sideways
// scrolling. A row opens its ideas, and a selected part shows its notes under it.
// Area: family

import { useEffect, useRef, useState } from 'react';
import { Button, Typography } from '@mui/material';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import ChatBubbleOutlineRounded from '@mui/icons-material/ChatBubbleOutlineRounded';
import MathText from './MathText';

export default function Outline({ node, open, selected, onSelect, onToggle, onAsk, parentOf }) {
  const explainRef = useRef(null);
  const [more, setMore] = useState(false);
  const isOpen = open.has(node.id);
  const kids = node.children;
  const parent = parentOf.get(node.id);
  const on = selected === node.id;
  const leaf = !kids.length && node.depth > 0;
  useEffect(() => {
    if (on && explainRef.current) {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const t = setTimeout(
        () => explainRef.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }),
        60
      );
      return () => clearTimeout(t);
    }
    return undefined;
  }, [on, isOpen]);
  return (
    <div className="fam-mm-o" data-depth={Math.min(node.depth, 3)}>
      <button
        type="button"
        className="fam-mm-o-row"
        data-selected={on}
        aria-expanded={kids.length ? isOpen : undefined}
        onClick={() => {
          onSelect(node.id);
          if (kids.length) onToggle(node.id);
        }}
      >
        <span className="fam-mm-o-label">
          <MathText text={node.label} />
        </span>
        {kids.length > 0 && (
          <span className="fam-mm-o-count">
            {/* The same words as on computers (§6.7): a count alone read as an unread badge. */}
            {isOpen ? 'Hide' : 'Show'} {kids.length} idea{kids.length === 1 ? '' : 's'}
            <ExpandMoreRounded className="fam-chev" data-open={isOpen} aria-hidden />
          </span>
        )}
      </button>
      {(isOpen || (on && leaf)) && (node.explanation || (leaf && parent)) && (
        <div className="fam-mm-o-explain" ref={explainRef}>
          {node.explanation ? (
            <div className="fam-prose fam-mm-o-text" data-clamp={node.depth === 0 && !more}>
              <MathText text={node.explanation} />
            </div>
          ) : (
            <Typography className="fam-small">
              Part of{' '}
              <b>
                <MathText text={parent.label} />
              </b>
              {parent.explanation ? '. ' : ''}
              {parent.explanation && <MathText text={parent.explanation} />}
            </Typography>
          )}
          {node.depth === 0 && node.explanation && (
            <Button size="small" onClick={() => setMore(!more)}>
              {more ? 'Show less' : 'More'}
            </Button>
          )}
          {onAsk && node.depth > 0 && (
            <Button
              size="small"
              startIcon={<ChatBubbleOutlineRounded />}
              onClick={() => onAsk(parent && parent.depth > 0 ? `${node.label} (${parent.label})` : node.label)}
            >
              {leaf && !node.explanation ? 'Explain this simply' : 'Ask about this'}
            </Button>
          )}
        </div>
      )}
      {isOpen && kids.length > 0 && (
        <div className="fam-mm-o-kids">
          {kids.map((k) => (
            <Outline
              key={k.id}
              node={k}
              open={open}
              selected={selected}
              onSelect={onSelect}
              onToggle={onToggle}
              onAsk={onAsk}
              parentOf={parentOf}
            />
          ))}
        </div>
      )}
    </div>
  );
}
