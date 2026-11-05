// An empty-state card for lists with nothing yet: a tinted icon circle, a title, one line and one action.
// Used by the Classes, Assessments and Quizzes pages, the results and student tables, and the 404 page.
// Area: platform

import React from 'react';

export default function EmptyState({ icon, title, children, action, ai }) {
  return (
    <div className="mst-g1 mst-rim mst-empty" data-enter="">
      <span aria-hidden="true" className="mst-empty-icon" data-ai={ai ? 'true' : undefined}>
        {icon}
      </span>
      <h2 className="mst-empty-title">{title}</h2>
      {children ? <p className="mst-empty-text">{children}</p> : null}
      {action ? <div className="mst-empty-action">{action}</div> : null}
    </div>
  );
}
