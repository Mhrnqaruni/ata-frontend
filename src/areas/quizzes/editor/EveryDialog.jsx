// "Set every time to…" and "Set every score to…" (Q9; design.md §3.4's ⋯ More): one number for every question at
// once, set in the page and saved with the quiz. Polls keep no points.
// Area: quizzes

import { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import NumberField from '../../../components/common/NumberField';
import { POINTS, SECONDS } from './questionModel';
import { EVERY } from './words';

// field: 'time_limit_seconds' or 'points', or null when closed; onApply(field, value).
export default function EveryDialog({ field, start, onApply, onClose }) {
  return (
    <Dialog open={Boolean(field)} onClose={onClose} maxWidth="xs" fullWidth>
      {field ? <EveryForm field={field} start={start} onApply={onApply} onClose={onClose} /> : null}
    </Dialog>
  );
}

function EveryForm({ field, start, onApply, onClose }) {
  const time = field === 'time_limit_seconds';
  const bounds = time ? SECONDS : POINTS;
  const [value, setValue] = useState(start ?? bounds.start);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const number = Number.isFinite(value) ? Math.round(value) : bounds.start;
        onApply(field, Math.min(bounds.max, Math.max(bounds.min, number)));
      }}
    >
      <DialogTitle>{time ? EVERY.timeTitle : EVERY.scoreTitle}</DialogTitle>
      <DialogContent>
        <NumberField
          autoFocus
          label={time ? EVERY.timeLabel : EVERY.scoreLabel}
          value={value}
          onChange={(event) => setValue(Number(event.target.value))}
          inputProps={{ min: bounds.min, max: bounds.max }}
          sx={{ width: 220, mt: 1 }}
        />
        {time ? null : <DialogContentText sx={{ mt: 1.5, fontSize: 14 }}>{EVERY.scoreNote}</DialogContentText>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{EVERY.cancel}</Button>
        <Button type="submit" variant="contained">
          {EVERY.apply}
        </Button>
      </DialogActions>
    </form>
  );
}
