// The marked homework's Questions card (design §5.5), in teacher's QuestionNavigator look: the legend in words, then a
// box for each question, which jumps to its card.
// Area: family

import { MARK, WORD, legend } from './resultWords';

/** `items` are the questions with their state and number (`chip`); `onJump(item)` shows its card. */
export default function QuestionMap({ items, name, onJump }) {
  return (
    <nav className="mst-g1 mst-rim fam-hw-map" aria-labelledby="fam-hw-map-title">
      <h2 id="fam-hw-map-title" className="mst-card-title">
        Questions
      </h2>
      <ul className="fam-hw-legend">
        {legend(name).map(([state, text]) => (
          <li key={state} data-state={state}>
            {text}
          </li>
        ))}
      </ul>
      <p className="fam-hw-legend-line">Press a question to see it, with {name}’s answer and the right one.</p>
      <div className="fam-hw-chips">
        {items.map((item) => (
          <button
            type="button"
            key={item.id}
            className="fam-hw-chip"
            data-state={item.state}
            aria-label={`Question ${item.chip}, ${WORD[item.state]}`}
            onClick={() => onJump(item)}
          >
            Q{item.chip}
            <span aria-hidden>{MARK[item.state]}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
