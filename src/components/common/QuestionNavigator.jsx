import React, { useId } from 'react';
import { Button } from '@mui/material';

// Shared navigation only: the owning page keeps every draft and decides how to save.
export default function QuestionNavigator({ items, selected, onSelect, label = 'Questions', children }) {
  const id = useId();
  const position = items.findIndex(item => item.id === selected);
  const current = items[position];
  return (
    <aside className="mst-question-nav" aria-label={label} data-single={items.length<=1 ? "true" : undefined}>
      <div className="mst-question-nav-heading">
        <strong>{label}</strong><span className="mst-count">{items.length}</span>
      </div>
      {children}
      <div className="mst-question-nav-grid">
        {items.map(item => (
          <button type="button" key={item.id} onClick={() => onSelect(item.id)}
            aria-current={selected === item.id ? 'step' : undefined}
            aria-label={`${item.label || `Question ${item.number}`}${item.state ? ` (${item.state})` : ''}`}
            title={`${item.label || `Question ${item.number}`}${item.state ? ` · ${item.state}` : ''}`}
            data-state={item.state || undefined}>
            {item.label || item.number}<span aria-hidden="true" />
          </button>
        ))}
      </div>
      <div className="mst-question-nav-controls">
      {/* Native selects cannot typeset equations; the focused question shows its full content. */}
      <div className="mst-question-nav-mobile">
        <label htmlFor={id}>Jump to question</label>
        <select id={id} value={current?.id ?? ''} onChange={event => onSelect(event.target.value)} disabled={!items.length}>
          {!current && <option value="" disabled>{items.length ? "Choose a question" : "No questions"}</option>}
          {items.map(item => <option value={item.id} key={item.id}>
            {item.label || `Question ${item.number}`}{item.state ? ` · ${item.state}` : ''}
          </option>)}
        </select>
      </div>
      <div className="mst-question-nav-step">
        <Button size="small" variant="outlined" disabled={position <= 0}
          aria-label="Previous question" onClick={() => onSelect(items[position - 1].id)}>Previous</Button>
        <Button size="small" variant="outlined" disabled={position < 0 || position >= items.length - 1}
          aria-label="Next question" onClick={() => onSelect(items[position + 1].id)}>Next</Button>
      </div>
      </div>
      <p className="mst-question-nav-hint" aria-live="polite">
        {current ? `${items.some(item => item.number > items.length) ? 'Selection' : 'Question'} ${position + 1} of ${items.length}` : items.length ? 'Select a question for focused review' : 'No questions in this view'}
      </p>
    </aside>
  );
}
