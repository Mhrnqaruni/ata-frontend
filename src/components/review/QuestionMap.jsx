// The review page's question map (design.md §3.9): All or Needs a look, a numbered square for each question in its
// state, then the legend for the states shown. A square scrolls to its card; the card in view rings its square.
// Area: platform

import { REVIEW } from './words';

const STATES = ['right', 'wrong', 'part', 'none', 'waiting'];

// items: { id, label, state, changed }; active: the card in view; filter: 'all' or 'needs'; legend: the page's words.
export default function QuestionMap({ items, active, filter, needsCount, onFilter, onJump, legend }) {
  const words = { ...REVIEW.legend, ...legend };
  const wide = items.some((item) => String(item.label).length > 2); // "1.1" and longer get 44 px squares
  const shown = STATES.filter((state) => items.some((item) => item.state === state));
  const describe = (item) =>
    [REVIEW.question(item.label), words[item.state], item.changed ? words.changed : null].filter(Boolean).join(', ');
  return (
    <nav aria-label={REVIEW.map} className="mst-rv-map">
      <div aria-label={REVIEW.filter} className="mst-rv-filter" role="group">
        <button aria-pressed={filter === 'all'} onClick={() => onFilter('all')} type="button">
          {REVIEW.all}
        </button>
        <button
          aria-pressed={filter === 'needs'}
          disabled={!needsCount && filter !== 'needs'}
          onClick={() => onFilter('needs')}
          type="button"
        >
          {REVIEW.needsLook} ({needsCount})
        </button>
      </div>
      <ol className="mst-rv-grid" data-wide={wide ? 'true' : undefined}>
        {items.map((item) => (
          <li key={item.id}>
            <button
              aria-current={item.id === active ? 'true' : undefined}
              aria-label={describe(item)}
              className="mst-rv-square"
              data-changed={item.changed ? 'true' : undefined}
              data-state={item.state}
              onClick={() => onJump(item.id)}
              title={describe(item)}
              type="button"
            >
              {item.label}
            </button>
          </li>
        ))}
      </ol>
      {shown.length || items.some((item) => item.changed) ? (
        <ul className="mst-rv-legend">
          {shown.map((state) => (
            <li data-state={state} key={state}>
              {words[state]}
            </li>
          ))}
          {items.some((item) => item.changed) ? <li data-state="changed">{words.changed}</li> : null}
        </ul>
      ) : null}
    </nav>
  );
}
