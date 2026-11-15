// A review page's question card (design.md §3.9): its number, type and state chip, the question, the evidence before
// any mark, then the marking and its save status. Solid, so long answers stay easy to read.
// Area: platform

import { cardDomId } from './ReviewLayout';

// id: the question's (for the map); title: "Question 4"; kind: its type; chip: its state; question: its words;
// children: the evidence; marking: the mark and comment fields; status: the save status.
export default function ReviewCard({ id, title, kind, chip, question, children, marking, status }) {
  const titleId = `${cardDomId(id)}-title`;
  return (
    <article aria-labelledby={titleId} className="mst-rv-card" data-review-id={id} id={cardDomId(id)} tabIndex={-1}>
      <header className="mst-rv-card-top">
        <h2 className="mst-rv-card-title" id={titleId}>
          {title}
        </h2>
        {kind ? <span className="mst-rv-card-kind">{kind}</span> : null}
        {chip ? <span className="mst-rv-card-chip">{chip}</span> : null}
      </header>
      <div className="mst-rv-card-question">{question}</div>
      {children}
      {marking ? <div className="mst-rv-card-marking">{marking}</div> : null}
      {status ? <footer className="mst-rv-card-foot">{status}</footer> : null}
    </article>
  );
}
