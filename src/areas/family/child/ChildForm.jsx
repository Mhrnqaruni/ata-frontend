// A child's details (Phase 1.38 design §3.5): first name, school year (Year 1 to Year 13, C-22) and, in the dialogs,
// a note and worksheet photos, in teacher's fields. Also the save that the setup screen and the dialogs share.
// Area: family

import { useRef } from 'react';
import { Button, FormHelperText, TextField, Typography } from '@mui/material';
import AttachFileRounded from '@mui/icons-material/AttachFileRounded';
import { queryClient, sessionGeneration } from '../../../services/queryCache';
import { familyApi, familyKeys } from '../familyApi';
import { YEARS } from '../familyWords';
import './profile.css';

/** A new child's form. Its ids are made here, so a retried save or upload reuses them. */
export const blankChild = () => ({
  id: crypto.randomUUID(),
  name: '',
  year: '',
  notes: '',
  files: [],
  uploadId: crypto.randomUUID(),
});

/** The edit form, filled with a child's details. */
export const detailsOf = (child) => ({
  id: child.id,
  name: child.displayName,
  year: child.gradeLevel || '',
  notes: child.notes || '',
  files: [],
  uploadId: crypto.randomUUID(),
  edit: true,
});

/**
 * Saves a child, then uploads any worksheet photos. `onSaved` runs once the child is saved, so after a failed upload a
 * retry redoes only the upload. Throws what failed; false when the account changed meanwhile, so nothing should follow.
 */
export async function saveChild(form, userId, onSaved) {
  const generation = sessionGeneration();
  const details = { displayName: form.name.trim(), gradeLevel: form.year, notes: form.notes || null };
  if (!form.saved) await familyApi.saveChild(form.id, details, { edit: form.edit });
  if (generation !== sessionGeneration()) return false;
  await queryClient.invalidateQueries({ queryKey: familyKeys.children(generation, userId) });
  onSaved?.();
  if (form.files?.length) {
    const body = new FormData();
    body.append('title', form.notes?.slice(0, 100) || 'Worksheet');
    body.append('purpose', 'learning');
    form.files.forEach((file) => body.append('files', file));
    await familyApi.uploadMaterial(form.id, form.uploadId, body);
    await queryClient.invalidateQueries({ queryKey: familyKeys.child(generation, userId, form.id) });
  }
  return generation === sessionGeneration();
}

/**
 * Name and school year are all a parent must give; the note and worksheets are optional. Editing, `childName` is the
 * child's saved name: the note's words name the child, and each missing answer is said under its field ("Add Sam's
 * first name."). Adding and setting up keep today's words, with "Name and year needed" said by the dialog or screen.
 */
export function ChildForm({ form, setForm, busy, welcome, nameRef, tried, childName }) {
  const locked = busy || form.saved;
  const yearRefs = useRef([]);
  const named = form.edit && childName ? childName : '';
  // Each missing answer is said under its field (design §10.1): "Add Sam's first name." or "Add your child's first name."
  const whose = named ? `${named}’s` : 'your child’s';
  const nameMissing = !!tried && !form.name.trim();
  const yearMissing = !!tried && !form.year;
  const pickYear = (year) => setForm({ ...form, year });
  function onYearKey(e, i) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = (i + step + YEARS.length) % YEARS.length;
    pickYear(YEARS[next]);
    yearRefs.current[next]?.focus();
  }
  return (
    <div className="fam-cf">
      <TextField
        id={`name-${form.id}`}
        inputRef={nameRef}
        label="First name"
        placeholder="For example: Sam"
        value={form.name}
        error={nameMissing}
        helperText={nameMissing ? `Add ${whose} first name.` : undefined}
        autoComplete="off"
        inputProps={{ maxLength: 255 }}
        className={welcome ? 'fam-field-lg' : undefined}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        disabled={locked}
        fullWidth
      />
      <div>
        <div className="fam-cf-label" id={`year-${form.id}`}>
          School year
        </div>
        <div
          className="fam-cf-years"
          role="radiogroup"
          aria-labelledby={`year-${form.id}`}
          aria-describedby={named && yearMissing ? `year-error-${form.id}` : undefined}
          data-size={welcome ? 'lg' : 'md'}
          data-missing={yearMissing}
        >
          {YEARS.map((year, i) => {
            const on = form.year === year;
            return (
              <button
                type="button"
                key={year}
                role="radio"
                aria-checked={on}
                ref={(el) => {
                  yearRefs.current[i] = el;
                }}
                tabIndex={on || (!YEARS.includes(form.year) && i === 0) ? 0 : -1}
                className="fam-cf-year"
                data-on={on}
                disabled={locked}
                onClick={() => pickYear(year)}
                onKeyDown={(e) => onYearKey(e, i)}
              >
                {year}
              </button>
            );
          })}
        </div>
        {yearMissing && (
          <FormHelperText error id={`year-error-${form.id}`}>
            Choose {whose} school year.
          </FormHelperText>
        )}
      </div>
      {!welcome && (
        <TextField
          id={`notes-${form.id}`}
          label={`Anything to know about ${named || 'them'}? (optional)`}
          helperText={`Helps the AI pitch quizzes and answers at ${whose} level.`}
          placeholder="For example: finds fractions tricky"
          value={form.notes || ''}
          disabled={locked}
          multiline
          minRows={3}
          maxRows={8}
          inputProps={{ maxLength: 500 }}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          fullWidth
        />
      )}
      {!form.edit && !welcome && (
        <div className="fam-attach">
          <Button component="label" disabled={locked} startIcon={<AttachFileRounded />}>
            Add worksheet photos (optional)
            <input
              hidden
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setForm({ ...form, files: Array.from(e.target.files || []) })}
            />
          </Button>
          {form.files?.length > 0 && (
            <Typography className="fam-small">{form.files.map((f) => f.name).join(' · ')}</Typography>
          )}
        </div>
      )}
    </div>
  );
}
