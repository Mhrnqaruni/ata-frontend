// The progress dialog for a student's feedback (SOT-6 frontend): it prepares it (or makes the commented paper again),
// follows it every 2 s, then downloads the chosen item. Closing it only stops following: the job keeps going.
// Area: assessments

import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Typography,
} from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from '../../hooks/useSnackbar';
import realisticService, { realisticKey } from './realisticService';
import {
  doneWords,
  makeAgainOrPrepare,
  REPORTS,
  runPreparation,
  stageLine,
  stopLine,
  withCounts,
  WORDS,
} from './realisticRules';

// item: the Download menu's item to download at the end ('pdf', 'docx', 'comments', 'grade', 'again', which redraws
// the commented paper and downloads it, or 'retry', which downloads nothing), or null when closed; jobId, entityId:
// whose; onClose(): closes it; onDone(): it delivered, just before it closes itself.
export default function RealisticProgressDialog({ item, jobId, entityId, onClose, onDone }) {
  const [view, setView] = useState({ phase: 'preparing', state: null });
  const [round, setRound] = useState(0); // a new round prepares again
  const { showSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  // The latest callbacks and showSnackbar, so a new one from the parent doesn't start another preparation.
  const latest = useRef({ onClose, onDone, showSnackbar });
  useEffect(() => {
    latest.current = { onClose, onDone, showSnackbar };
  });

  useEffect(() => {
    if (!item) return undefined;
    let closed = false;
    let timer;
    const report = REPORTS.includes(item);
    const prepare = () => realisticService.prepareRealistic(jobId, entityId);
    setView({ phase: 'preparing', state: null });
    runPreparation({
      prepare:
        item === 'again'
          ? () => makeAgainOrPrepare(() => realisticService.makeAgain(jobId, entityId), prepare)
          : prepare,
      status: () => realisticService.realisticStatus(jobId, entityId),
      download: item === 'retry' ? null : () => realisticService.download(jobId, entityId, item),
      report,
      wait: (ms) =>
        new Promise((resolve) => {
          timer = setTimeout(resolve, ms);
        }),
      onState: (state, phase) => setView((last) => ({ phase, state: withCounts(state, last.state) })),
      stopped: () => closed,
    }).then((end) => {
      queryClient.invalidateQueries({ queryKey: realisticKey(jobId, entityId) });
      // The plain report downloads too, and the dialog stays to say why it's plain and to offer Try again.
      if (end === 'downloaded' || end === 'ready' || end === 'plain') {
        latest.current.showSnackbar(doneWords(item), 'success');
      }
      if (end === 'downloaded' || end === 'ready') {
        latest.current.onDone?.();
        latest.current.onClose();
      }
    });
    return () => {
      closed = true;
      clearTimeout(timer);
    };
  }, [item, round, jobId, entityId, queryClient]);

  const { phase, state } = view;
  const following = phase === 'preparing' || phase === 'download';
  const marking = state?.stage === 'marking' && state.total > 0;
  const progress = phase === 'download' ? 100 : marking ? (100 * state.done) / state.total : null;
  const again = phase === 'stopped' ? WORDS.prepareAgain : following || phase === 'unavailable' ? null : WORDS.tryAgain;

  return (
    <Dialog fullWidth maxWidth="xs" onClose={onClose} open={Boolean(item)}>
      <DialogTitle>{WORDS.title}</DialogTitle>
      <DialogContent>
        {following ? (
          <Box sx={{ display: 'grid', gap: 1.5 }}>
            <Typography sx={{ fontSize: 15 }}>{stageLine(state)}</Typography>
            <LinearProgress
              aria-label={WORDS.title}
              value={progress ?? undefined}
              variant={progress === null ? 'indeterminate' : 'determinate'}
            />
            <Typography sx={{ fontSize: 12, lineHeight: '16px', color: 'var(--mst-ink-2)' }}>
              {WORDS.aboutTime}
            </Typography>
          </Box>
        ) : (
          <Typography role="status" sx={{ fontSize: 15 }}>
            {stopLine(phase, state)}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        {again && (
          <Button onClick={() => setRound((n) => n + 1)} variant="contained">
            {again}
          </Button>
        )}
        <Button onClick={onClose}>{WORDS.close}</Button>
      </DialogActions>
    </Dialog>
  );
}
