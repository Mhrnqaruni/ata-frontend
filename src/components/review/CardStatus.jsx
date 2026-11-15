// A review card's save status at its bottom right (design.md §3.9): Saving…, Saved ✓, Not saved · Try again, Changed
// somewhere else · Reload this question, or Add a mark to save. It's a live region, so screen readers hear it.
// Area: platform

import { Button } from '@mui/material';
import { markNumber } from './cardSaver';
import { REVIEW } from './words';

// card: useReviewSaves' card(); max: the question's maximum; onReload: reads the question again (after a conflict).
export default function CardStatus({ card, max, onReload }) {
  const { status, error, values } = card;
  let tone;
  let words = null;
  let action = null;
  if (status === 'saving') words = REVIEW.saving;
  else if (status === 'saved') {
    tone = 'ok';
    words = REVIEW.saved;
  } else if (status === 'invalid') {
    words = markNumber(values?.mark) === null ? REVIEW.addMark : REVIEW.markRange(Number(max));
  } else if (status === 'failed') {
    tone = 'warn';
    words = REVIEW.notSaved;
    action = { label: REVIEW.tryAgain, onClick: card.retry };
  } else if (status === 'conflict') {
    tone = 'warn';
    words = REVIEW.changedElsewhere;
    action = onReload ? { label: REVIEW.reloadQuestion, onClick: onReload } : null;
  }
  // The server's own sentence, when it gave one, says why a save failed (the page puts it in error.reason).
  const reason = status === 'failed' ? (error?.reason ?? null) : null;
  return (
    <div className="mst-rv-status" data-tone={tone}>
      <span aria-live="polite" role="status">
        {words}
        {action ? ' · ' : null}
      </span>
      {action ? (
        <Button className="mst-rv-status-action" onClick={action.onClick} size="small">
          {action.label}
        </Button>
      ) : null}
      {reason ? <span className="mst-rv-status-reason">{reason}</span> : null}
    </div>
  );
}
