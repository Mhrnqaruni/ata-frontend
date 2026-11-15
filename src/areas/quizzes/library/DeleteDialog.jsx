// Deleting quizzes (Phase 1.47 R11; design.md §3.10): what happens to pupils' scores, then Archive instead · Delete ·
// Cancel on one line. A still-running refusal (SOT-5's 409) names the quizzes and turns Delete off. No Undo.
// Area: quizzes

import { useId, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { displayTitle } from './rows';
import { LIBRARY } from './words';

// quizzes: those to delete (none: closed); onDelete() resolves '' when done, or { text, refused } to show; onArchive().
export default function DeleteDialog({ quizzes, busy, onDelete, onArchive, onClose }) {
  const id = useId();
  const [problem, setProblem] = useState(null); // { text, refused }: the last try's failure, shown in the window
  const [deleting, setDeleting] = useState(false); // Delete's own "Deleting…", not Archive instead's
  const count = quizzes.length;
  const scored = quizzes.some((quiz) => quiz.run_count > 0); // only a quiz that has run has pupils' scores
  const close = () => {
    setProblem(null);
    onClose();
  };
  const confirm = async () => {
    setDeleting(true);
    const result = await onDelete();
    setDeleting(false);
    if (result === '') close();
    else if (result) setProblem(result);
  };
  return (
    <Dialog
      open={count > 0}
      onClose={busy ? undefined : close}
      fullWidth
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-text`}
      PaperProps={{ 'data-mst': 'quiz-confirm', sx: { maxWidth: 480 } }}
    >
      <DialogTitle id={`${id}-title`}>{LIBRARY.deleteTitle(count)}</DialogTitle>
      <DialogContent>
        {problem ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {problem.text}
          </Alert>
        ) : null}
        <DialogContentText id={`${id}-text`}>
          {LIBRARY.deleteText(count, count === 1 ? displayTitle(quizzes[0]) : '', scored)}
        </DialogContentText>
      </DialogContent>
      <DialogActions disableSpacing sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Button
          variant="outlined"
          disabled={busy}
          onClick={() => {
            setProblem(null);
            onArchive();
          }}
        >
          {LIBRARY.archiveInstead}
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={busy || Boolean(problem?.refused)}
          onClick={confirm}
          data-mst="confirm"
        >
          {deleting ? LIBRARY.deleting : LIBRARY.deleteButton(count)}
        </Button>
        <Button disabled={busy} onClick={close}>
          {LIBRARY.cancel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
