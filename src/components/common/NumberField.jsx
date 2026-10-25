import React, { useEffect, useRef, useState } from 'react';
import { TextField } from '@mui/material';

/** Event-compatible number field for forms that do not use useNumberInput.
 * Keep an empty draft local; restore the last valid value when focus leaves.
 */
export default function NumberField({ value, onChange, onBlur, onFocus, inputProps, InputProps, ...props }) {
  const [draft, setDraft] = useState(value ?? '');
  const focused = useRef(false);
  const previous = useRef(value);
  const bounds = { ...InputProps?.inputProps, ...inputProps };
  useEffect(() => {
    if (!focused.current) { setDraft(value ?? ''); previous.current = value; }
  }, [value]);
  return <TextField {...props} type="number" value={draft} inputProps={inputProps} InputProps={InputProps}
    onFocus={event => { focused.current = true; previous.current = value; onFocus?.(event); }}
    onChange={event => {
      setDraft(event.target.value);
      if (event.target.value !== '') onChange?.(event);
    }}
    onBlur={event => {
      focused.current = false;
      const fallback = previous.current === '' || previous.current == null ? (bounds.min ?? 0) : Number(previous.current);
      const parsed = event.target.value === '' ? fallback : Number(event.target.value);
      const finalValue = Math.min(bounds.max ?? Infinity, Math.max(bounds.min ?? -Infinity, Number.isFinite(parsed) ? parsed : fallback));
      setDraft(String(finalValue));
      // Preserve target.name and the existing forms' event-based handlers.
      event.target.value = String(finalValue);
      onChange?.(event);
      onBlur?.(event);
    }} />;
}
