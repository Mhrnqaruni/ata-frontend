// An element's width, kept up to date as the window or the sidebar changes it, for the quiz list's layout (design.md
// §3.0, item 7). It's measured before the first paint, so the rows never jump from one layout to another.
// Area: quizzes

import { useLayoutEffect, useState } from 'react';

// Returns [ref, width]: put the ref on the element; width is null until it's measured.
export function useWidth() {
  const [node, setNode] = useState(null);
  const [width, setWidth] = useState(null);
  useLayoutEffect(() => {
    if (!node) return undefined;
    setWidth(node.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);
  return [setNode, width];
}
