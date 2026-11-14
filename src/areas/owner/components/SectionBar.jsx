// The section bar on a user's or an assessment's page: links to its sections, marking the one in view (§3.4).
// It sticks under the condensed header; a click scrolls to the section.
// Area: owner

import { useEffect, useState } from 'react';
import { Tab, Tabs } from '@mui/material';

export default function SectionBar({ sections }) {
  const [current, setCurrent] = useState(sections[0]?.id);
  const ids = sections.map((section) => section.id).join(' ');

  // The section nearest the top of the view is the current one, from one observer. At the page's end the last
  // section is, since a short last section never reaches the observer's band (QA's Section 4 P3-10).
  useEffect(() => {
    const nodes = ids
      .split(' ')
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (!nodes.length || typeof IntersectionObserver === 'undefined') return undefined;
    const last = nodes[nodes.length - 1].id;
    const atEnd = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    const observer = new IntersectionObserver(
      (entries) => {
        const shown = entries.filter((entry) => entry.isIntersecting);
        if (atEnd()) setCurrent(last);
        else if (shown.length) setCurrent(shown[0].target.id);
      },
      { rootMargin: '-120px 0px -60% 0px' }
    );
    const onScroll = () => atEnd() && setCurrent(last);
    nodes.forEach((node) => observer.observe(node));
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [ids]);

  return (
    <nav aria-label="Sections" className="owner-section-bar">
      <Tabs
        onChange={(_, id) => {
          setCurrent(id);
          document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
        value={sections.some((section) => section.id === current) ? current : false}
        variant="scrollable"
      >
        {sections.map((section) => (
          <Tab data-mst={`owner-section-${section.id}`} key={section.id} label={section.label} value={section.id} />
        ))}
      </Tabs>
    </nav>
  );
}
