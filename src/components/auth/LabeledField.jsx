import React from "react";
import { FormHelperText, FormLabel, OutlinedInput } from "@mui/material";

/**
 * A field with its label ABOVE the box (no floating label, no notch in the border), and an optional line of
 * help or error text under it. Every other prop goes to MUI's OutlinedInput unchanged: id, name, value, onChange,
 * autoComplete, autoFocus, disabled, type, error, endAdornment, onAnimationStart (the autofill detector listens
 * for MUI's "mui-auto-fill").
 */
export default function LabeledField({ id, label, helperText, error, ...inputProps }) {
  return (
    <div className="mst-field">
      <FormLabel className="mst-field-label" htmlFor={id}>
        {label}
      </FormLabel>
      <OutlinedInput
        aria-describedby={helperText ? `${id}-help` : undefined}
        error={error}
        fullWidth
        id={id}
        notched={false}
        {...inputProps}
      />
      {helperText ? (
        <FormHelperText className="mst-field-help" error={error} id={`${id}-help`}>
          {helperText}
        </FormHelperText>
      ) : null}
    </div>
  );
}
