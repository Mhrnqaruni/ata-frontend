// The homework the teacher follows (design.md §3.10; SP1–SP4): the header with the due date, Share and Results, the
// join card (Phase 1.47 R3) beside handed in · working · not started every 10 s, the one list, and Close homework.
// Area: quizzes

import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import MoreHorizRounded from '@mui/icons-material/MoreHorizRounded';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '../../../components/common/PageHeader';
import { useSnackbar } from '../../../hooks/useSnackbar';
import ConfirmDialog from '../shared/ConfirmDialog';
import JoinCard from '../shared/JoinCard';
import ShareJoin from '../shared/ShareJoin';
import { classList } from '../words';
import { closeHomework, sendHomework } from './api';
import ProgressSummary from './ProgressSummary';
import PupilAnswers from './PupilAnswers';
import PupilList from './PupilList';
import { counters, homeworkRows } from './pupils';
import { useProgress, useRunLine, useSummary } from './queries';
import { HOMEWORK, dueLine } from './words';

// From 900 px of page, the join card and the counts share a row, in two equal halves; the counts alone once it closes.
const WIDE = '@container (min-width: 900px)';

export default function HomeworkRoom({ run, onRunChanged }) {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const open = run.status === 'active';
  const summary = useSummary(run.quiz_id, run.id, open);
  const progress = useProgress(run.id, open);
  const line = useRunLine(run.quiz_id, run.id);
  const rows = homeworkRows(summary.data, progress.data);
  const counts = counters(summary.data);
  const [menu, setMenu] = useState(null);
  const [closing, setClosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState(null);
  const [pupil, setPupil] = useState(null);

  // Send opens this page with ?share=1, and Share's menu opens once (design.md §3.6). ShareJoin keeps its menu inside,
  // so the page presses its button; the address then drops the flag, so a reload doesn't open it again.
  const shareBox = useRef(null);
  const [search, setSearch] = useSearchParams();
  const shareOnArrival = search.get('share') === '1' && open;
  useEffect(() => {
    if (!shareOnArrival) return;
    shareBox.current?.querySelector('button')?.click();
    setSearch(
      (params) => {
        params.delete('share');
        return params;
      },
      { replace: true }
    );
  }, [shareOnArrival, setSearch]);

  const act = async (call, done) => {
    setBusy(true);
    setFailure(null);
    try {
      await call(run.id);
      done();
      onRunChanged();
      summary.refetch();
    } catch (error) {
      setFailure(error.message);
    } finally {
      setBusy(false);
    }
  };

  const marked = rows.pupils.filter((row) => row.state === 'handedIn' && row.score != null).length;
  const average = summary.data?.average;
  const averageLine =
    counts.handedIn && average != null && marked
      ? HOMEWORK.average({ count: marked, all: marked === counts.handedIn, average, max: summary.data.max_points })
      : null;
  const minutes = Math.floor((Date.now() - summary.dataUpdatedAt) / 60000);
  const updatedLine = open && summary.data ? (minutes < 1 ? HOMEWORK.updatedNow : HOMEWORK.updatedAgo(minutes)) : null;
  const classes = summary.data?.classes?.length ? classList(summary.data.classes) : null;
  const closed = run.status === 'completed' || run.status === 'cancelled';

  return (
    <Box sx={{ containerType: 'inline-size', display: 'grid', gap: 2 }}>
      <PageHeader
        title={run.quiz_title}
        subtitle={dueLine({ classes, deadline: run.deadline, closed, closedAt: line?.ended_at })}
        actions={
          <>
            {open ? (
              // Share's hidden "Copied ✓" region is as wide as its positioned parent (useCopy's srOnly), so it gets one.
              <Box ref={shareBox} sx={{ position: 'relative', display: 'inline-flex' }}>
                <ShareJoin code={run.access_code} title={run.quiz_title} due={run.deadline} />
              </Box>
            ) : null}
            <Button
              variant="text"
              onClick={() => navigate(`/quizzes/${run.quiz_id}/results?run=${encodeURIComponent(run.id)}`)}
            >
              {HOMEWORK.results}
            </Button>
            {open ? (
              <Tooltip title={HOMEWORK.more}>
                <IconButton
                  aria-label={HOMEWORK.more}
                  aria-haspopup="menu"
                  onClick={(event) => setMenu(event.currentTarget)}
                >
                  <MoreHorizRounded />
                </IconButton>
              </Tooltip>
            ) : null}
          </>
        }
      />
      <Menu anchorEl={menu} open={Boolean(menu)} onClose={() => setMenu(null)}>
        <MenuItem
          onClick={() => {
            setMenu(null);
            setClosing(true);
          }}
        >
          {HOMEWORK.close}
        </MenuItem>
      </Menu>
      {run.status === 'draft' ? (
        <Alert
          severity="info"
          action={
            <Button color="inherit" disabled={busy} onClick={() => act(sendHomework, () => {})}>
              {HOMEWORK.sendNow}
            </Button>
          }
        >
          {failure || HOMEWORK.notSent}
        </Alert>
      ) : null}
      {summary.isError ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" onClick={() => summary.refetch()}>
              {HOMEWORK.tryAgain}
            </Button>
          }
        >
          {summary.error?.message || HOMEWORK.listFailed}
        </Alert>
      ) : null}
      <Box sx={{ display: 'grid', gap: 2, [WIDE]: { gridAutoFlow: 'column', gridAutoColumns: 'minmax(0, 1fr)' } }}>
        {open ? <JoinCard code={run.access_code} due={run.deadline} /> : null}
        <ProgressSummary counts={counts} averageLine={averageLine} updatedLine={updatedLine} />
      </Box>
      <PupilList
        rows={rows.pupils}
        walkIns={rows.walkIns}
        onOpen={setPupil}
        empty={summary.data?.classes?.length ? HOMEWORK.nobodyYet : HOMEWORK.noClassList}
      />
      <PupilAnswers sessionId={run.id} quizId={run.quiz_id} row={pupil} onClose={() => setPupil(null)} />
      <ConfirmDialog
        open={closing}
        title={HOMEWORK.closeTitle}
        confirmLabel={HOMEWORK.close}
        cancelLabel={HOMEWORK.keepOpen}
        busy={busy}
        error={closing ? failure : null}
        onCancel={() => {
          setClosing(false);
          setFailure(null);
        }}
        onConfirm={() =>
          act(closeHomework, () => {
            setClosing(false);
            showSnackbar(HOMEWORK.closed, 'success');
          })
        }
      >
        {HOMEWORK.closeLine}
      </ConfirmDialog>
    </Box>
  );
}
