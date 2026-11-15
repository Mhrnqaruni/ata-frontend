// The body of the quiz and assessment review pages (design.md §3.9; SOT-6): the question map at the left and every
// question's card in one scrolling column, with All or Needs a look, and scroll-to-question.
// Area: platform

import { useCallback, useEffect, useRef, useState } from 'react';
import QuestionMap from './QuestionMap';
import { REVIEW } from './words';
import './review.css';

// The id of a question's card on the page, for scrolling to it.
export const cardDomId = (id) => `review-q-${id}`;

const BAND = '-96px 0px -55% 0px'; // where a card counts as "in view": from 96 px below the top to 45% down
const HOLD_MS = 800; // after a jump, the jumped-to square stays lit while the page moves
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * items: { id, label, state, changed, needsLook }, in the page's order; renderCard(item) draws a ReviewCard.
 * initialId: the question to open on, such as a deep link's. legend: the page's own words for the map's legend.
 * onActive(id): told which question is in view, for a page action about it (the assessment's submitted script).
 */
export default function ReviewLayout({ items, renderCard, initialId, legend, empty, onActive }) {
  // "Needs a look" keeps the questions it showed when chosen, so a card doesn't vanish as soon as it's marked.
  const [filter, setFilter] = useState({ mode: 'all', ids: [] });
  const [active, setActive] = useState(initialId ?? items[0]?.id ?? null);
  const jumpedAt = useRef(0);
  const opened = useRef(false);
  const needs = items.filter((item) => item.needsLook);
  const shown = filter.mode === 'needs' ? items.filter((item) => filter.ids.includes(item.id)) : items;
  const shownKey = shown.map((item) => item.id).join('\n');

  // Scrolls a card to 96 px from the top (a jump with reduced motion) and gives it focus for the keyboard.
  const jump = useCallback((id, smooth = true) => {
    const node = document.getElementById(cardDomId(id));
    if (!node) return;
    jumpedAt.current = Date.now();
    setActive(id);
    node.scrollIntoView({ block: 'start', behavior: smooth && !reducedMotion() ? 'smooth' : 'auto' });
    node.focus({ preventScroll: true });
  }, []);

  // As the page scrolls, the first card in the band lights its square.
  useEffect(() => {
    if (!shownKey || typeof IntersectionObserver === 'undefined') return undefined;
    const ids = shownKey.split('\n');
    const inBand = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inBand.add(entry.target.dataset.reviewId);
          else inBand.delete(entry.target.dataset.reviewId);
        }
        if (Date.now() - jumpedAt.current < HOLD_MS) return;
        const first = ids.find((id) => inBand.has(id));
        if (first) setActive(first);
      },
      { rootMargin: BAND }
    );
    for (const id of ids) {
      const node = document.getElementById(cardDomId(id));
      if (node) observer.observe(node);
    }
    return () => observer.disconnect();
  }, [shownKey]);

  useEffect(() => {
    onActive?.(active);
  }, [active, onActive]);

  // Opening on a question: once, without animating.
  useEffect(() => {
    if (opened.current || !initialId) return;
    opened.current = true;
    jump(initialId, false);
  }, [initialId, jump]);

  const choose = (mode) =>
    setFilter(mode === 'needs' ? { mode, ids: needs.map((item) => item.id) } : { mode: 'all', ids: [] });
  return (
    <div className="mst-rv">
      <QuestionMap
        active={active}
        filter={filter.mode}
        items={shown}
        legend={legend}
        needsCount={needs.length}
        onFilter={choose}
        onJump={jump}
      />
      <div className="mst-rv-cards">
        {shown.length ? (
          shown.map((item) => renderCard(item))
        ) : (
          <p className="mst-rv-empty">{empty ?? REVIEW.nothingNeeds}</p>
        )}
      </div>
    </div>
  );
}
