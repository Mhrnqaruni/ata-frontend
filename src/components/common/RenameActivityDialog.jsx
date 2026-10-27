import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Alert } from '@mui/material';
import { renameActivity } from '../../services/activityService';

/** One small name-only command; questions, scores and sessions are untouched. */
export default function RenameActivityDialog({ item, onClose, onSaved }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setName(item?.name || ''); setError(''); }, [item]);
  const save = async event => {
    event.preventDefault();
    if (busy || !name.trim() || name.trim().length > 200) return;
    setBusy(true); setError('');
    try {
      await renameActivity(item.kind, item.id, name.trim());
      onSaved?.(); onClose();
    } catch (failure) {
      const detail = failure.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Could not rename. Please try again.');
    } finally { setBusy(false); }
  };
  return <Dialog open={Boolean(item)} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs"
    aria-labelledby="rename-activity-title" PaperProps={{component:'form',onSubmit:save}}>
    <DialogTitle id="rename-activity-title">Rename {item?.kind}</DialogTitle>
    <DialogContent>
      {error && <Alert severity="error" sx={{mb:2}}>{error}</Alert>}
      <TextField autoFocus fullWidth margin="dense" label="Name" value={name} disabled={busy}
        onChange={event=>setName(event.target.value)} inputProps={{maxLength:200}}
        helperText="This updates the name everywhere in the app. Grades stay the same."/>
    </DialogContent>
    <DialogActions>
      <Button disabled={busy} onClick={onClose}>Cancel</Button>
      <Button type="submit" variant="contained" disabled={busy || !name.trim() || name.trim()===item?.name}>{busy?'Saving…':'Save name'}</Button>
    </DialogActions>
  </Dialog>;
}
