import React, { useEffect, useState } from "react";
import {
  Box,
  Autocomplete,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMore from "@mui/icons-material/ExpandMore";
import classService from "../../services/classService";
import tagService from "../../services/tagService";
const empty = { class_ids: [], tag_ids: [], mode: "union" };

/** The server owns resolution. This view never guesses membership or adds counts. */
export default function AudienceSelector({
  value,
  onChange,
  onPreview,
  disabled = false,
  allowOpen = false,
}) {
  const [options, setOptions] = useState([]);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const spec = value || empty;
  useEffect(() => {
    let active = true;
    Promise.all([classService.getAllClasses(), tagService.list()])
      .then(([classes, data]) => {
        if (active)
          setOptions([
            ...classes.map((c) => ({ ...c, kind: "Class" })),
            ...data.tags.map((t) => ({ ...t, kind: "Tag" })),
          ]);
      })
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, []);
  const key = JSON.stringify(spec);
  useEffect(() => {
    let active = true;
    setPreview(null);
    onPreview?.(null);
    setError("");
    if (!spec.class_ids.length && !spec.tag_ids.length) {
      setLoading(false);
      return;
    }
    setLoading(true);
    tagService
      .preview(spec)
      .then((data) => {
        if (active) {
          setPreview(data);
          onPreview?.(data);
        }
      })
      .catch((e) => active && setError(e.response?.data?.detail || e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [key]);
  const selected = options.filter((o) =>
    (o.kind === "Class" ? spec.class_ids : spec.tag_ids).includes(o.id),
  );
  return (
    <Box sx={{ display: "grid", gap: 2, minWidth: 0 }}>
      <Autocomplete
        multiple
        options={options}
        value={selected}
        disabled={disabled}
        groupBy={(o) => o.kind}
        getOptionLabel={(o) => o.name}
        isOptionEqualToValue={(a, b) => a.kind === b.kind && a.id === b.id}
        onChange={(_, rows) =>
          onChange({
            ...spec,
            class_ids: rows.filter((r) => r.kind === "Class").map((r) => r.id),
            tag_ids: rows.filter((r) => r.kind === "Tag").map((r) => r.id),
          })
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label="Classes and tags"
            placeholder="Select classes or tags"
          />
        )}
      />
      {!!spec.class_ids.length && !!spec.tag_ids.length && (
        <FormControl size="small">
          <InputLabel id="audience-mode">Include</InputLabel>
          <Select
            labelId="audience-mode"
            label="Include"
            disabled={disabled}
            value={spec.mode}
            onChange={(e) => onChange({ ...spec, mode: e.target.value })}
          >
            <MenuItem value="union">
              Everyone in any selected class or tag
            </MenuItem>
            <MenuItem value="filter">
              Tagged students within selected classes
            </MenuItem>
          </Select>
        </FormControl>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      {loading && (
        <Typography variant="body2">Checking selected students…</Typography>
      )}
      {preview && preview.count===0 && <Alert severity="warning">No students match. Change the selected classes or tags before starting.</Alert>}
      {preview && preview.count > 0 && (
        <Accordion disableGutters>
          <AccordionSummary expandIcon={<ExpandMore />}>
            {preview.count} unique{" "}
            {preview.count === 1 ? "student" : "students"} · Preview audience
          </AccordionSummary>
          <AccordionDetails>
            {!preview.count ? (
              <Alert severity="warning">
                No students match. Change your selection before starting.
              </Alert>
            ) : (
              preview.students.map((s) => (
                <Typography key={s.id} variant="body2" sx={{ mb: 1 }}>
                  {s.name} · {s.studentId} —{" "}
                  {s.classes.map((c) => c.name).join(", ")}
                </Typography>
              ))
            )}
          </AccordionDetails>
        </Accordion>
      )}
      {!value?.class_ids?.length && !value?.tag_ids?.length && (
        <Typography variant="body2" color="text.secondary">
          {allowOpen
            ? "No selection: open quiz. Anyone with the code can join."
            : "Select at least one class or tag."}
        </Typography>
      )}
      <Typography variant="caption" color="text.secondary">
        Tags are private labels. They do not change AI grading. Students
        selected more than once are counted once.
      </Typography>
    </Box>
  );
}
