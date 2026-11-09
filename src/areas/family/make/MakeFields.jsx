// The make window's segmented control (Phase 1.38 design §6.3): a radio group drawn as teacher's segmented pill, with
// a sliding thumb, arrow keys and a label above.
// Area: family

import { useRef } from 'react';

/** A radio group drawn as one track with a sliding thumb (transform only). Options are [value, text] pairs. */
export function Segmented({ label, options, value, onChange, id }) {
  const index = options.findIndex(([v]) => v === value);
  const refs = useRef([]);
  function onKey(e, i) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = (i + step + options.length) % options.length;
    onChange(options[next][0]);
    refs.current[next]?.focus();
  }
  return (
    <div className="fam-mk-field">
      <div className="fam-mk-label" id={id}>
        {label}
      </div>
      <div
        className="fam-mk-seg"
        role="radiogroup"
        aria-labelledby={id}
        style={{ '--n': options.length, '--i': index }}
      >
        <span className="fam-mk-seg-thumb" aria-hidden style={{ visibility: index < 0 ? 'hidden' : undefined }} />
        {options.map(([v, text], i) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={v === value}
            tabIndex={v === value || (index < 0 && i === 0) ? 0 : -1}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className="fam-mk-seg-btn"
            data-on={v === value}
            onClick={() => onChange(v)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
