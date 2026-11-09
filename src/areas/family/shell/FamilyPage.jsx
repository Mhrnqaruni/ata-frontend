// Each parent-mode page's frame (Phase 1.38 design §1.5): teacher's page header (its classes, sticky and condensing),
// the tab title "{Section} · Parent mode · MySmartTeach" with no name, and focus on the h1 when the section changes.
// Area: family

import { useEffect, useRef, useState } from 'react';
import { Typography } from '@mui/material';

// The first page after a load keeps the browser's focus; every later page change moves it to the new h1 (WCAG 2.4.3).
let firstPage = true;

/** The tab's title for a parent-mode page or result: "{Section} · Parent mode · MySmartTeach", never a name (C-18). */
export function usePageTitle(section) {
  useEffect(() => {
    document.title = `${section} · Parent mode · MySmartTeach`;
  }, [section]);
}

/**
 * `section` names the tab; `title` is the h1, visually hidden when the page shows its own visible title. Focus moves to
 * the h1 when the page opens, and again when `focusKey` changes (the section, unless the page passes its own).
 * `subtitle` is the one sentence under the title, `actions` the page's one main action on its right, and `back` a
 * link above the title, such as "‹ Activities" on phones. `leading` sits before the title, as in teacher's PageHeader,
 * such as the child's avatar on the profile.
 */
export default function FamilyPage({
  section,
  title,
  hideTitle = false,
  focusKey = section,
  subtitle,
  actions,
  back,
  leading,
  className = '',
  children,
}) {
  const heading = useRef(null);
  const sentinel = useRef(null);
  const [condensed, setCondensed] = useState(false);
  usePageTitle(section);
  useEffect(() => {
    if (firstPage) firstPage = false;
    else heading.current?.focus({ preventScroll: true });
  }, [focusKey]);
  // As teacher's PageHeader: the header condenses once its top has scrolled out of view.
  useEffect(() => {
    const node = sentinel.current;
    if (!node || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => setCondensed(!entry.isIntersecting), {
      rootMargin: '-12px 0px 0px 0px',
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hideTitle]);
  if (hideTitle)
    return (
      <div className={`fam-page fam-page-bare ${className}`.trim()}>
        <h1 ref={heading} tabIndex={-1} className="fam-sr">
          {title}
        </h1>
        {children}
      </div>
    );
  return (
    <div className={`fam-page ${className}`.trim()}>
      <span ref={sentinel} className="fam-page-sentinel" aria-hidden />
      <header className="mst-page-head fam-page-head" data-condensed={condensed ? 'true' : 'false'}>
        {leading && <div className="mst-page-head-leading">{leading}</div>}
        <div className="mst-page-head-text">
          {back}
          <Typography component="h1" variant="h1" ref={heading} tabIndex={-1} className="mst-page-head-title">
            {title}
          </Typography>
          {subtitle && <p className="mst-page-head-sub">{subtitle}</p>}
        </div>
        {actions && <div className="mst-page-head-actions">{actions}</div>}
      </header>
      {children}
    </div>
  );
}
