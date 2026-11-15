// A small dialog to rename an assessment or a quiz; only the name changes, grades stay the same.
// Area: academics

import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Alert } from '@mui/material';
import { renameActivity } from '../../services/activityService';
import { queryClient } from '../../services/queryCache';

// Each kind's cached teacher list, and its row with the new name (Phase 1.46, SOT-1.4). A quiz's display title is
// left to the list, which works it out from the title and the quiz's pre or post phase, as the server does.
const LISTS = {
  quiz: ['quizzes', (row, name) => ({ ...row, title: name, display_title: null })],
  assessment: ['assessments', (row, name) => ({ ...row, assessmentName: name })],
};
// Teacher lists are keyed ['teacher', session, user, family] (hooks/useTeacherData.js's teacherOptions).
const teacherList = (family) => ({
  predicate: (query) => query.queryKey[0] === 'teacher' && query.queryKey[3] === family,
});

/** One small name-only command; questions, scores and sessions are untouched. */
export default function RenameActivityDialog({ item, onClose, onSaved }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setName(item?.name || '');
    setError('');
  }, [item]);
  const save = async (event) => {
    event.preventDefault();
    if (busy || !name.trim() || name.trim().length > 200) return;
    setBusy(true);
    setError('');
    try {
      const saved = await renameActivity(item.kind, item.id, name.trim());
      const newName = saved?.name || name.trim();
      // SOT-1.4: the list's own cached row takes the new name before the window closes, so the card shows it at
      // once; the refresh every rename starts then confirms it.
      const [family, renamed] = LISTS[item.kind] || [];
      if (family) {
        queryClient.setQueriesData(teacherList(family), (rows) =>
          Array.isArray(rows)
            ? rows.map((row) => (String(row.id) === String(item.id) ? renamed(row, newName) : row))
            : rows
        );
      }
      onSaved?.(newName); // a page with its own cache (the Phase 1.46 quiz library) renames its row with it
      onClose();
    } catch (failure) {
      const detail = failure.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Could not rename. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={Boolean(item)}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="xs"
      aria-labelledby="rename-activity-title"
      PaperProps={{ component: 'form', onSubmit: save, 'data-mst': 'rename-dialog' }}
    >
      <DialogTitle id="rename-activity-title">Rename {item?.kind}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          autoFocus
          fullWidth
          margin="dense"
          label="Name"
          value={name}
          disabled={busy}
          onChange={(event) => setName(event.target.value)}
          inputProps={{ maxLength: 200 }}
          helperText="This updates the name everywhere in the app. Grades stay the same."
        />
      </DialogContent>
      <DialogActions>
        <Button data-mst="cancel" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button
          data-mst="save"
          type="submit"
          variant="contained"
          disabled={busy || !name.trim() || name.trim() === item?.name}
        >
          {busy ? 'Saving…' : 'Save name'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
