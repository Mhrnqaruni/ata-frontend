// A live run's answers waiting for the teacher's mark, kept from today's results: AI marking couldn't decide them,
// so their pupils' scores wait. A notice above the summary opens a window to mark each one; nothing asks AI again.
// Area: quizzes

import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import MathTextDisplay from '../../../components/common/MathTextDisplay';
import { cacheFamilies, invalidateTeacher } from '../../../services/queryCache';
import { marksWaiting, saveMark } from './api';
import { RESULTS } from './words';

const validMark = (row, text) =>
  Boolean(row) &&
  text.trim() !== '' &&
  Number.isInteger(Number(text)) &&
  Number(text) >= 0 &&
  Number(text) <= row.max_points;

// The answer to mark; the pupil's name is in the chooser above it.
function Answer({ row }) {
  return (
    <>
      <div>
        <h3 className="quiz-results-mark-head">Question {row.question_number}</h3>
        <MathTextDisplay text={row.question_text} />
      </div>
      <div>
        <h3 className="quiz-results-mark-head">{RESULTS.theirAnswer}</h3>
        <MathTextDisplay text={(row.answer || []).join(', ')} />
      </div>
      <div>
        <h3 className="quiz-results-mark-head">{RESULTS.acceptedAnswer}</h3>
        <MathTextDisplay text={(row.accepted_answer || []).join(', ')} />
      </div>
    </>
  );
}

// runId: the live run; waiting: how many answers wait. It stays mounted at 0, so marking the last one keeps it open.
export default function PendingMarks({ runId, waiting }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState('');
  const [drafts, setDrafts] = useState({});
  const [notice, setNotice] = useState('');
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const row = rows.find((item) => item.response_id === selected);
  const draft = drafts[selected] || { points: '', feedback: '' };
  const change = (patch) => setDrafts((all) => ({ ...all, [selected]: { ...draft, ...patch } }));
  const show = (data) => {
    setRows(data);
    setSelected(data[0]?.response_id || '');
  };

  async function load() {
    setBusy(true);
    setError('');
    setNotice('');
    setConflict(false);
    try {
      const data = await marksWaiting(runId);
      // A draft stays only while its answer is unchanged (the same revision).
      const same = (item) =>
        rows.some((old) => old.response_id === item.response_id && old.expected_revision === item.expected_revision);
      setDrafts((all) =>
        Object.fromEntries(
          data
            .filter((item) => all[item.response_id] && same(item))
            .map((item) => [item.response_id, all[item.response_id]])
        )
      );
      show(data);
      setOpen(true);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  // A lost reply doesn't prove the save failed: look again before the teacher retries.
  async function reconcile(saved) {
    try {
      const data = await marksWaiting(runId);
      if (data.some((item) => item.response_id === saved.response_id)) return;
      show(data);
      setError('');
      setNotice(RESULTS.markLanded);
      await invalidateTeacher(cacheFamilies.quiz);
    } catch {
      setConflict(true);
    }
  }

  async function save() {
    if (!row) return;
    setBusy(true);
    setError('');
    try {
      const mark = { points: Number(draft.points), feedback: draft.feedback, expected_revision: row.expected_revision };
      await saveMark(runId, row.response_id, mark);
      const left = rows.filter((item) => item.response_id !== row.response_id);
      show(left);
      setNotice(left.length ? RESULTS.markSaved(left.length) : RESULTS.allMarked);
      await invalidateTeacher(cacheFamilies.quiz);
    } catch (failure) {
      setError(failure.message);
      setConflict(failure.status === 409);
      if (failure.status === null || failure.status >= 500) await reconcile(row);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {waiting > 0 ? (
        <Alert
          action={
            <Button color="inherit" disabled={busy} onClick={load} size="small">
              {RESULTS.markThem}
            </Button>
          }
          className="quiz-results-alert"
          data-mst="marks-waiting"
          severity="warning"
        >
          {RESULTS.waitingForMark(waiting)}
        </Alert>
      ) : null}
      {!open && error ? <Alert severity="error">{error}</Alert> : null}
      <Dialog fullWidth maxWidth="sm" onClose={busy ? undefined : () => setOpen(false)} open={open}>
        <DialogTitle>{RESULTS.marksTitle}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <p className="quiz-results-dialog-text">{RESULTS.marksIntro}</p>
            {error ? <Alert severity="error">{error}</Alert> : null}
            {notice ? (
              <Alert role="status" severity="success">
                {notice}
              </Alert>
            ) : null}
            {conflict ? (
              <Button disabled={busy} onClick={load}>
                {RESULTS.loadAgain}
              </Button>
            ) : null}
            {rows.length > 0 ? (
              <TextField
                disabled={busy}
                label={RESULTS.answerToMark}
                onChange={(event) => setSelected(event.target.value)}
                select
                value={selected}
              >
                {rows.map((item) => (
                  <MenuItem key={item.response_id} value={item.response_id}>
                    {item.learner_name} · Question {item.question_number}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}
            {row ? (
              <>
                <Answer row={row} />
                <TextField
                  disabled={busy}
                  inputProps={{ min: 0, max: row.max_points, step: 1 }}
                  label={`Mark (out of ${row.max_points})`}
                  onChange={(event) => change({ points: event.target.value })}
                  sx={{ maxWidth: 180 }}
                  type="number"
                  value={draft.points}
                />
                <TextField
                  disabled={busy}
                  inputProps={{ maxLength: 4000 }}
                  label={RESULTS.feedback}
                  minRows={2}
                  multiline
                  onChange={(event) => change({ feedback: event.target.value })}
                  value={draft.feedback}
                />
              </>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setOpen(false)}>
            {rows.length ? RESULTS.close : RESULTS.done}
          </Button>
          {row ? (
            <Button disabled={busy || conflict || !validMark(row, draft.points)} onClick={save} variant="contained">
              {busy ? RESULTS.saving : RESULTS.saveMark}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>
    </>
  );
}
