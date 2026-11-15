// The picture window (design.md §3.4): the one upload surface in a small window, for a question's picture. The quiz
// is saved first when it needs to be, so the picture goes to the question as saved; the reason shows here if not.
// Area: quizzes

import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import UploadDropzone from '../../../components/common/UploadDropzone';
import { PICTURE } from './words';

const IMAGES = { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/gif': ['.gif'] };

// onAdd(file) resolves to { ok } or { ok: false, error | problems }.
export default function PictureWindow({ open, onAdd, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const close = () => {
    if (busy) return;
    setError('');
    onClose();
  };
  const add = async (file) => {
    if (!file) return;
    setBusy(true);
    setError('');
    const result = await onAdd(file);
    setBusy(false);
    if (result.ok) onClose();
    else setError(result.error?.message ?? result.problems?.map((problem) => problem.text).join('. '));
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
      <DialogTitle>{PICTURE.title}</DialogTitle>
      <DialogContent>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}
        {busy ? (
          <div className="mst-ai-progress" role="status">
            <div className="mst-ai-bar" />
            <span>{PICTURE.adding}</span>
          </div>
        ) : (
          <UploadDropzone
            accept={IMAGES}
            files={[]}
            hint={PICTURE.hint}
            onDrop={(files) => void add(files[0])}
            size="compact"
            title={PICTURE.choose}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={close}>
          {PICTURE.cancel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
