// "Match to a pupil…" (design.md §3.11, AN4; today's assign): moves a walk-in's answers and score to a pupil on the
// class list who hasn't taken part, chosen by name, so the results count them. The services refresh the results.
// Area: quizzes

import { useState } from 'react';
import { MenuItem, TextField } from '@mui/material';
import { useSnackbar } from '../../../hooks/useSnackbar';
import ConfirmDialog from '../shared/ConfirmDialog';
import { matchWalkIn, shown } from './api';
import { useRunLookups } from './queries';
import { RESULTS } from './words';

const label = (pupil) => `${pupil.name} · ${pupil.display_id}`;

// walkIn: from the summary's not_on_class_list; candidates: class pupils with no attempt and a school ID.
export default function MatchDialog({ quizId, run, walkIn, candidates, onClose }) {
  const lookups = useRunLookups(quizId, run);
  const { showSnackbar } = useSnackbar();
  const [pupilId, setPupilId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pupil = candidates.find((item) => item.id === pupilId);

  async function match() {
    if (!pupil) return setError(RESULTS.choosePupil);
    setBusy(true);
    setError('');
    try {
      const record = await lookups.walkInRecord(walkIn);
      if (!record) throw new Error(RESULTS.matchFailed);
      await matchWalkIn(run.kind, run.id, record, pupil.display_id);
      showSnackbar(RESULTS.matched(walkIn.name, pupil.name), 'success');
      onClose();
    } catch (failure) {
      setError(shown(failure.message, RESULTS.matchFailed));
      setBusy(false);
    }
  }

  return (
    <ConfirmDialog
      busy={busy}
      busyLabel={RESULTS.matching}
      confirmLabel={RESULTS.matchVerb}
      error={error}
      onCancel={onClose}
      onConfirm={match}
      open
      title={RESULTS.matchTitle(walkIn.name)}
    >
      <p className="quiz-results-dialog-text">{RESULTS.matchNote}</p>
      <TextField
        SelectProps={{
          displayEmpty: true,
          renderValue: () =>
            pupil ? label(pupil) : <span className="quiz-results-placeholder">{RESULTS.choosePupilHint}</span>,
        }}
        disabled={busy}
        fullWidth
        label={RESULTS.pupilOnList}
        onChange={(event) => {
          setPupilId(event.target.value);
          setError('');
        }}
        select
        value={pupilId}
      >
        {candidates.map((item) => (
          <MenuItem key={item.id} value={item.id}>
            {label(item)}
          </MenuItem>
        ))}
      </TextField>
    </ConfirmDialog>
  );
}
