// A student's full name and ID fields, shared by the Edit student window and the Add students window's one-student
// tab, where the ID may be left blank and MST makes one (Phase 1.42, D1).
// Area: academics

import { TextField } from '@mui/material';

/**
 * @param {object} props
 * @param {{name: string, studentId: string}} props.value
 * @param {(value: {name: string, studentId: string}) => void} props.onChange
 * @param {boolean} [props.optionalId] - the ID may be blank: the app makes an MST- one
 * @param {boolean} [props.disabled]
 * @param {(event: KeyboardEvent) => void} [props.onKeyDown]
 */
export default function StudentFields({ value, onChange, optionalId = false, disabled = false, onKeyDown }) {
  const change = (event) => onChange({ ...value, [event.target.name]: event.target.value });
  return (
    <>
      <TextField
        autoFocus
        disabled={disabled}
        fullWidth
        id="name"
        inputProps={{ maxLength: 120 }}
        label="Full name"
        name="name"
        onChange={change}
        onKeyDown={onKeyDown}
        required
        value={value.name}
      />
      <TextField
        disabled={disabled}
        fullWidth
        helperText={optionalId ? 'Leave it blank and MST will make one. It starts with MST-.' : undefined}
        id="studentId"
        inputProps={{ maxLength: 128 }}
        label={optionalId ? 'Student ID (optional)' : 'Student ID'}
        name="studentId"
        onChange={change}
        onKeyDown={onKeyDown}
        required={!optionalId}
        value={value.studentId}
      />
    </>
  );
}
