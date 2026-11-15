// A review card's mark box (design.md §3.9): 96 px, "7" with "/ 10" inside. It keeps exactly what was typed, so an
// empty box stays empty and is never turned into 0 (QA N-1); the save model decides when a mark may be saved.
// Area: platform

import { InputAdornment, TextField } from '@mui/material';
import { REVIEW } from './words';

// value: the typed mark (text); max: the question's maximum; whole: marks are whole numbers (quizzes).
export default function MarkField({ value, max, whole = false, disabled, onChange, onBlur }) {
  return (
    <TextField
      InputProps={{ endAdornment: <InputAdornment position="end">/ {Number(max)}</InputAdornment> }}
      className="mst-rv-mark"
      disabled={disabled}
      inputProps={{
        inputMode: whole ? 'numeric' : 'decimal',
        autoComplete: 'off',
        'aria-description': REVIEW.outOf(Number(max)),
      }}
      label={REVIEW.mark}
      onBlur={onBlur}
      onChange={(event) => onChange(event.target.value)}
      value={value ?? ''}
    />
  );
}
