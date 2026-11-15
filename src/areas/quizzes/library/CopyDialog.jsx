// Make a copy (design.md §3.1, L10): the copy's name, selected, with "(copy)" added; "For which classes?", which opens
// the class chooser and is optional; and what a copy takes. Mounted afresh for each quiz, so it starts from that quiz.
// Area: quizzes

import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import ClassChooser from '../../../components/tags/ClassChooser';
import { useSnackbar } from '../../../hooks/useSnackbar';
import { useTeacherData } from '../../../hooks/useTeacherData';
import ClassNames from '../shared/ClassNames';
import { copyQuiz, setClasses } from './api';
import { useRecentClasses } from './queries';
import { LIBRARY } from './words';

const NAME_MAX = 200; // a quiz title's limit (models/quiz_model.py)

// The chosen classes and student groups by name, as the class chooser's own lists have them.
const namesOf = (audience, classes, groups) => [
  ...(classes || []).filter((item) => audience.class_ids.includes(item.id)),
  ...(groups || []).filter((item) => audience.tag_ids.includes(item.id)),
];

// quiz: the library item to copy; onCopied(copyId) once the copy is made (and its classes set, if changed).
export default function CopyDialog({ quiz, onClose, onCopied }) {
  const { showSnackbar } = useSnackbar();
  const allClasses = useTeacherData('classes').data;
  const allGroups = useTeacherData('tags').data?.tags;
  const [name, setName] = useState(() => LIBRARY.copyDefault(quiz.title).slice(0, NAME_MAX));
  const [audience, setAudience] = useState(null); // the chooser's choice; null keeps the original's classes
  const [choosing, setChoosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const recent = useRecentClasses(choosing);
  const shown = audience ? namesOf(audience, allClasses, allGroups) : quiz.classes || [];
  const value = audience || { class_ids: (quiz.classes || []).map((item) => item.id), tag_ids: [], mode: 'union' };

  const save = async (event) => {
    event.preventDefault();
    if (busy || !name.trim()) return;
    setBusy(true);
    setError('');
    let copy;
    try {
      copy = await copyQuiz(quiz.id, name.trim());
    } catch (failure) {
      setError(failure.message);
      setBusy(false);
      return;
    }
    if (audience) {
      try {
        await setClasses(copy.id, audience);
      } catch (failure) {
        showSnackbar(LIBRARY.copyClassesFailed(failure.message), 'warning', failure.reference);
      }
    }
    onCopied(copy.id);
  };

  return (
    <>
      <Dialog
        open={!choosing}
        onClose={busy ? undefined : onClose}
        maxWidth="xs"
        fullWidth
        aria-labelledby="copy-quiz"
        PaperProps={{ component: 'form', onSubmit: save, 'data-mst': 'copy-dialog' }}
      >
        <DialogTitle id="copy-quiz">{LIBRARY.makeCopy}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2.5 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField
            autoFocus
            fullWidth
            label={LIBRARY.copyName}
            value={name}
            disabled={busy}
            onChange={(event) => setName(event.target.value)}
            onFocus={(event) => event.target.select()}
            inputProps={{ maxLength: NAME_MAX }}
          />
          <Box>
            <Typography component="h3" sx={{ fontSize: 14, lineHeight: '20px', fontWeight: 500, mb: 0.75 }}>
              {LIBRARY.copyClasses}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 44 }}>
              <Box sx={{ flex: 1, minWidth: 0, fontSize: 15 }}>
                <ClassNames classes={shown} max={3} />
              </Box>
              <Button variant="outlined" size="small" disabled={busy} onClick={() => setChoosing(true)}>
                {shown.length ? LIBRARY.change : LIBRARY.chooseClasses}
              </Button>
            </Box>
          </Box>
          <Typography sx={{ fontSize: 14, color: 'var(--mst-ink-2)' }}>{LIBRARY.copyKeeps}</Typography>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={onClose}>
            {LIBRARY.cancel}
          </Button>
          <Button type="submit" variant="contained" disabled={busy || !name.trim()}>
            {busy ? LIBRARY.copying : LIBRARY.makeCopy}
          </Button>
        </DialogActions>
      </Dialog>
      <ClassChooser
        open={choosing}
        title={LIBRARY.copyFor}
        value={value}
        recentClassIds={recent.data}
        onClose={() => setChoosing(false)}
        onDone={(choice) => {
          setAudience(choice);
          setChoosing(false);
        }}
      />
    </>
  );
}
