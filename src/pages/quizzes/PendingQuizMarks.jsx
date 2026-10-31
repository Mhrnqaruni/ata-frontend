import React, { useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import apiClient from '../../services/api';
import { invalidateTeacher, cacheFamilies } from '../../services/queryCache';
import MathTextDisplay from '../../components/common/MathTextDisplay';

/** Manual recovery only: opening or saving this dialog never asks AI to re-mark. */
export default function PendingQuizMarks({ sessionId, count, onSaved }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState('');
  const [drafts, setDrafts] = useState({});
  const [notice, setNotice] = useState('');
  const [conflict, setConflict] = useState(false);
  const [saved, setSaved] = useState(false);
  const close = () => { if (!busy) { setOpen(false); if (saved) onSaved(); } };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const row = rows.find(item => item.response_id === selected);
  const draft = drafts[selected] || { points: '', feedback: '' };
  const change = patch => setDrafts(value => ({ ...value, [selected]: { ...draft, ...patch } }));
  const load = async () => {
    setBusy(true); setError(''); setNotice(''); setConflict(false);
    try {
      const { data } = await apiClient.get(`/api/quiz-sessions/${sessionId}/pending-marks`);
      setDrafts(previous => Object.fromEntries(data.filter(item => rows.some(old => old.response_id === item.response_id && old.expected_revision === item.expected_revision)).map(item => [item.response_id, previous[item.response_id]]).filter(([,draft]) => draft)));
      setRows(data); setSelected(data[0]?.response_id || ''); setOpen(true);
    } catch (e) { setError(e.response?.data?.detail || 'Pending marks could not be loaded. Try again.'); }
    finally { setBusy(false); }
  };
  const save = async () => {
    if (!row) return;
    setBusy(true); setError('');
    try {
      await apiClient.patch(`/api/quiz-sessions/${sessionId}/pending-marks/${row.response_id}`, {
        points: Number(draft.points), feedback: draft.feedback, expected_revision: row.expected_revision,
      });
      const remaining = rows.filter(item => item.response_id !== row.response_id);
      setRows(remaining); setSelected(remaining[0]?.response_id || '');
      setSaved(true);
      setNotice(remaining.length ? `Mark saved. ${remaining.length} answer${remaining.length === 1 ? '' : 's'} still need a decision.` : 'All pending marks reviewed.');
      await invalidateTeacher(cacheFamilies.quiz);
    } catch (e) {
      setError(e.response?.data?.detail || 'The save could not be confirmed. Your draft is still here.');
      setConflict(e.response?.status === 409);
      // A lost response is not proof the write failed. Reconcile before retrying.
      if (!e.response || e.response.status >= 500) {
        try {
          const { data } = await apiClient.get(`/api/quiz-sessions/${sessionId}/pending-marks`);
          if (!data.some(item => item.response_id === row.response_id)) {
            setRows(data); setSelected(data[0]?.response_id || ''); setSaved(true);
            setError(''); setNotice('This answer is now marked. Close to view the saved result.');
          }
        } catch { setConflict(true); }
      }
    }
    finally { setBusy(false); }
  };
  const valid = row && draft.points.trim() !== '' && Number.isInteger(Number(draft.points)) && Number(draft.points) >= 0 && Number(draft.points) <= row.max_points;
  return <>
    <Button variant="outlined" onClick={load} disabled={busy}>Review pending marks ({count})</Button>
    {!open && error && <Alert severity="error">{error}</Alert>}
    <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
      <DialogTitle>Review pending marks</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
        <Typography variant="body2" color="text.secondary">No marking decision was returned for these answers. Final scores remain pending until all outstanding answers have been reviewed.</Typography>
        {error && <Alert severity="error">{error}</Alert>}
        {notice && <Alert severity="success" role="status">{notice}</Alert>}
        {conflict && <Button onClick={load} disabled={busy}>Reload pending marks</Button>}
        {rows.length > 0 && <TextField select label="Answer to review" value={selected} disabled={busy} onChange={e => setSelected(e.target.value)}>
          {rows.map(item => <MenuItem key={item.response_id} value={item.response_id}>{item.learner_name} · Question {item.question_number}</MenuItem>)}
        </TextField>}
        {row && <>
          <Typography variant="subtitle2" sx={{ overflowWrap: 'anywhere' }}>{row.learner_name}</Typography>
          <Box><Typography variant="subtitle2">Question {row.question_number}</Typography><MathTextDisplay text={row.question_text} /></Box>
          <Box><Typography variant="subtitle2">Submitted answer</Typography><MathTextDisplay text={(row.answer || []).join(', ')} /></Box>
          <Box><Typography variant="subtitle2">Accepted answer</Typography><MathTextDisplay text={(row.accepted_answer || []).join(', ')} /></Box>
          <TextField label={`Mark (out of ${row.max_points})`} type="number" value={draft.points} onChange={e => change({ points: e.target.value })} inputProps={{ min: 0, max: row.max_points, step: 1 }} sx={{ maxWidth: 180 }} disabled={busy} />
          <TextField label="Feedback (optional)" multiline minRows={2} value={draft.feedback} onChange={e => change({ feedback: e.target.value })} inputProps={{ maxLength: 4000 }} disabled={busy} />
        </>}
      </Stack></DialogContent>
      <DialogActions><Button onClick={close} disabled={busy}>{rows.length ? 'Close' : 'Done'}</Button><Button variant="contained" onClick={save} sx={{ display: row ? undefined : 'none' }} disabled={busy || conflict || !valid}>{busy ? 'Saving…' : 'Save mark'}</Button></DialogActions>
    </Dialog>
  </>;
}
