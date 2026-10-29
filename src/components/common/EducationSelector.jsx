import React from "react";
import { Box, TextField, MenuItem } from "@mui/material";
export default function EducationSelector({
  value,
  onChange,
  legacy,
  disabled,
}) {
  const context = value || { year: "", qualification: "", board: "" };
  const change = (key, v) => onChange({ ...context, [key]: v });
  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      {!value && legacy && (
        <small>Previous level: {legacy}. Choose a year to update it.</small>
      )}
      <TextField
        select
        label="School year — England"
        value={context.year}
        disabled={disabled}
        onChange={(e) => change("year", e.target.value)}
      >
        <MenuItem value="">Not specified</MenuItem>
        <MenuItem value="reception">Reception</MenuItem>
        {Array.from({ length: 13 }, (_, i) => (
          <MenuItem key={i} value={`year_${i + 1}`}>
            Year {i + 1}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label="Qualification / exam (optional)"
        placeholder="For example GCSE or A level"
        value={context.qualification}
        disabled={disabled}
        onChange={(e) => change("qualification", e.target.value)}
        inputProps={{ maxLength: 80 }}
      />
      <TextField
        label="Exam board (optional)"
        value={context.board}
        disabled={disabled}
        onChange={(e) => change("board", e.target.value)}
        inputProps={{ maxLength: 80 }}
      />
    </Box>
  );
}

export function educationLabel(value, legacy) {
  if (!value) return legacy;
  const year =
    value.year === "reception"
      ? "Reception"
      : value.year
        ? value.year.replace("year_", "Year ")
        : "Year not specified";
  return [
    "England",
    year,
    value.qualification?.trim()
      ? `Qualification: ${value.qualification.trim()}`
      : "",
    value.board?.trim() ? `Exam board: ${value.board.trim()}` : "",
  ]
    .filter(Boolean)
    .join("; ");
}
