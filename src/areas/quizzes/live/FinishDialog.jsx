// "Finish the quiz?" (design.md §3.7; LV12): the header's Finish quiz asks first, saying what has happened and that
// results are kept. Finish is accent, never red, beside Keep going.
// Area: quizzes

import ConfirmDialog from '../shared/ConfirmDialog';
import { LIVE, finishLine } from './words';

// open, onCancel, onConfirm: the window; busy and error: the finish call's; facts: finishLine()'s.
export default function FinishDialog({ open, onCancel, onConfirm, busy, error, facts }) {
  return (
    <ConfirmDialog
      open={open}
      title={LIVE.finishTitle}
      confirmLabel={LIVE.finishConfirm}
      cancelLabel={LIVE.keepGoing}
      onConfirm={onConfirm}
      onCancel={onCancel}
      busy={busy}
      busyLabel={LIVE.working}
      error={error}
    >
      {finishLine(facts)}
    </ConfirmDialog>
  );
}
