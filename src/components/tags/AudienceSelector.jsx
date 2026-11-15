// Picks who a quiz or an assessment is for: classes and student groups, chosen in the class chooser window (Phase
// 1.46, SOT-11), how they combine, and a preview of the students.
// Area: academics

import { useEffect, useId, useRef, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  ButtonBase,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { useTeacherData } from '../../hooks/useTeacherData';
import tagService from '../../services/tagService';
import ClassChooser from './ClassChooser';

const empty = { class_ids: [], tag_ids: [], mode: 'union' };
const SHOWN = 6; // chips in the field before "+n more"

/**
 * value: { class_ids, tag_ids, mode }; onChange(value) once the window's Done is pressed; onPreview(students) with the
 * server's resolution. recentClassIds (optional) gives the window its Recent. The server owns resolution: this view
 * never guesses membership or adds counts.
 */
export default function AudienceSelector({
  value,
  onChange,
  onPreview,
  disabled = false,
  allowOpen = false,
  recentClassIds,
}) {
  const labelId = useId();
  const [choosing, setChoosing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const classes = useTeacherData('classes').data || [];
  const groups = useTeacherData('tags').data?.tags || [];
  const spec = value || empty;
  const latestPreview = useRef(onPreview);
  useEffect(() => {
    latestPreview.current = onPreview;
  });
  // The selection as text, so a new but equal value doesn't ask the server again.
  const key = JSON.stringify({ class_ids: spec.class_ids, tag_ids: spec.tag_ids, mode: spec.mode });
  useEffect(() => {
    const selection = JSON.parse(key);
    let active = true;
    setPreview(null);
    latestPreview.current?.(null);
    setError('');
    if (!selection.class_ids.length && !selection.tag_ids.length) {
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    tagService
      .preview(selection)
      .then((data) => {
        if (active) {
          setPreview(data);
          latestPreview.current?.(data);
        }
      })
      .catch((e) => active && setError(e.response?.data?.detail || e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [key]);
  const named = (list, id) => list.find((item) => item.id === id)?.name ?? '…';
  const chosen = [
    ...spec.class_ids.map((id) => ({ id: `c-${id}`, name: named(classes, id) })),
    ...spec.tag_ids.map((id) => ({ id: `g-${id}`, name: named(groups, id) })),
  ];
  return (
    <Box sx={{ display: 'grid', gap: 2, minWidth: 0 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography id={labelId} component="div" sx={{ mb: 0.75, fontSize: 14, lineHeight: '20px', fontWeight: 500 }}>
          Classes and student groups
        </Typography>
        <ButtonBase
          aria-labelledby={labelId}
          aria-haspopup="dialog"
          disabled={disabled}
          onClick={() => setChoosing(true)}
          data-mst="audience-field"
          sx={{
            width: '100%',
            minHeight: 44,
            px: 1.5,
            py: 0.75,
            gap: 0.75,
            flexWrap: 'wrap',
            justifyContent: 'flex-start',
            textAlign: 'left',
            borderRadius: '12px',
            border: '1px solid var(--mst-edge-control)',
            bgcolor: 'var(--mst-well)',
            '&.Mui-focusVisible': { outline: '2px solid var(--mst-accent)', outlineOffset: 2 },
            '&.Mui-disabled': { opacity: 0.6 },
          }}
        >
          {chosen.length ? (
            <>
              {chosen.slice(0, SHOWN).map((item) => (
                <Chip key={item.id} label={item.name} size="small" />
              ))}
              {chosen.length > SHOWN ? (
                <Box component="span" sx={{ fontSize: 12, color: 'var(--mst-ink-2)' }}>
                  +{chosen.length - SHOWN} more
                </Box>
              ) : null}
            </>
          ) : (
            <Box component="span" sx={{ fontSize: 15, color: 'var(--mst-ink-3)' }}>
              Choose classes
            </Box>
          )}
        </ButtonBase>
      </Box>
      <ClassChooser
        open={choosing}
        value={spec}
        recentClassIds={recentClassIds}
        onClose={() => setChoosing(false)}
        onDone={(next) => {
          setChoosing(false);
          onChange(next);
        }}
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
            <MenuItem value="union">Everyone in any chosen class or group</MenuItem>
            <MenuItem value="filter">Only students in the chosen groups, within the chosen classes</MenuItem>
          </Select>
        </FormControl>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      {loading && <Typography variant="body2">Checking the students…</Typography>}
      {preview && preview.count === 0 && (
        <Alert severity="warning">No students match. Change the chosen classes or groups before starting.</Alert>
      )}
      {preview && preview.count > 0 && (
        <Accordion disableGutters>
          <AccordionSummary expandIcon={<ExpandMore />}>
            {preview.count} {preview.count === 1 ? 'student' : 'students'} · See who
          </AccordionSummary>
          <AccordionDetails>
            {preview.students.map((s) => (
              <Typography key={s.id} variant="body2" sx={{ mb: 1 }}>
                {s.name} · {s.studentId} — {s.classes.map((c) => c.name).join(', ')}
              </Typography>
            ))}
          </AccordionDetails>
        </Accordion>
      )}
      {!value?.class_ids?.length && !value?.tag_ids?.length && (
        <Typography variant="body2" color="text.secondary">
          {allowOpen ? 'Anyone with the join code can join.' : 'Choose at least one class or student group.'}
        </Typography>
      )}
      <Typography variant="caption" color="text.secondary">
        Student groups are private, and they don&rsquo;t change AI grading. A student chosen twice counts once.
      </Typography>
    </Box>
  );
}
