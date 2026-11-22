// A student's one Download button (SOT-6 frontend, MST's one-download rule): the report as PDF or Word, and the marked
// paper with comments or the grade only. Feedback that isn't ready is prepared first, and says when it's ready.
// Area: assessments

import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import AutorenewRounded from '@mui/icons-material/AutorenewRounded';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import DownloadRounded from '@mui/icons-material/DownloadRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import GradingOutlined from '@mui/icons-material/GradingOutlined';
import PictureAsPdfOutlined from '@mui/icons-material/PictureAsPdfOutlined';
import RateReviewOutlined from '@mui/icons-material/RateReviewOutlined';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import { useSnackbar } from '../../hooks/useSnackbar';
import RealisticProgressDialog from './RealisticProgressDialog';
import realisticService, { realisticKey } from './realisticService';
import { menuItems, readStatus, refusalWords, WATCH_MS, watchEnd, WORDS } from './realisticRules';

// The items in order: Try again (after a failure) sits under the report items whose line asks for it, and Redraw the
// red marks directly under the commented paper it redraws.
const ITEMS = [
  { key: 'pdf', label: WORDS.reportPdf, icon: <PictureAsPdfOutlined /> },
  { key: 'docx', label: WORDS.reportWord, icon: <DescriptionOutlined /> },
  { key: 'retry', label: WORDS.tryAgain, icon: <RefreshRounded /> },
  { key: 'comments', label: WORDS.comments, icon: <RateReviewOutlined /> },
  { key: 'again', label: WORDS.again, icon: <AutorenewRounded /> },
  { key: 'grade', label: WORDS.grade, icon: <GradingOutlined /> },
];

// When the status can't be read, every item downloads at once (no Redraw): the report is never refused, and a marked
// paper's download says what went wrong.
const UNREAD = { ...menuItems(readStatus({ status: 'ready' })), again: null };

// A disabled item fades only its icon and label: MUI's 38% would leave the reason line about 2:1 (the Designer's P2).
const ITEM_SX = {
  '&.Mui-disabled': { opacity: 1 },
  '&.Mui-disabled .MuiListItemIcon-root, &.Mui-disabled .MuiListItemText-primary': { opacity: 0.45 },
};

// The second line wraps within the label's width, so the menu stays narrow on a phone.
const LINE = { fontSize: 12, lineHeight: '16px', color: 'var(--mst-ink-2)', whiteSpace: 'normal', maxWidth: 260 };

// jobId, entityId and name: whose results (the name goes in the "ready" message); compact: an icon button with a
// tooltip (a results table row); disabled and title: the trigger's own state; label: the compact button's name for
// screen readers, which says whose files these are.
export default function ReportDownloadMenu({ jobId, entityId, name, compact = false, disabled = false, title, label }) {
  const [anchor, setAnchor] = useState(null);
  const [busy, setBusy] = useState(null);
  const [preparing, setPreparing] = useState(null); // the item the progress dialog prepares, then downloads
  // A preparation started here: { item, since }, since being when its dialog was closed (0 while it's open).
  const [watch, setWatch] = useState(null);
  const [asking, setAsking] = useState(false); // Redraw the red marks waits for the teacher's yes
  const button = useRef(null);
  const id = useId();
  const { showSnackbar } = useSnackbar();
  // Read each time the menu opens, and every WATCH_MS while a preparation started here goes on with its dialog closed,
  // whether the menu is open or not. Rows that only show a status don't poll.
  const watching = Boolean(watch?.since) && !preparing;
  const status = useQuery({
    queryKey: realisticKey(jobId, entityId),
    queryFn: () => realisticService.realisticStatus(jobId, entityId),
    enabled: Boolean(anchor) || watching,
    staleTime: 0,
    refetchInterval: watching ? WATCH_MS : false,
  });
  const shown = status.isError ? UNREAD : menuItems(status.data ?? null);

  // A status read after the dialog closed ends the watch: ready says so, with Download for the item asked for (Try
  // again asked for none, so its Download opens the menu); anything else ends quietly, and the menu shows why.
  const { data, dataUpdatedAt } = status;
  useEffect(() => {
    if (!watching || !data || dataUpdatedAt <= watch.since) return;
    const end = watchEnd(data);
    if (!end) return;
    setWatch(null);
    if (end !== 'ready') return;
    const { item } = watch;
    const download = () =>
      realisticService
        .download(jobId, entityId, item)
        .catch((error) => showSnackbar(refusalWords(error, item), 'error'));
    showSnackbar(WORDS.ready(name), 'success', null, {
      label: WORDS.download,
      onClick: item === 'retry' ? () => setAnchor(button.current) : download,
    });
  }, [watching, watch, data, dataUpdatedAt, name, jobId, entityId, showSnackbar]);

  // The progress dialog prepares the item, then downloads it; this menu watches the preparation once it's closed.
  function follow(key) {
    setAnchor(null);
    setPreparing(key);
    setWatch({ item: key, since: 0 });
  }

  async function choose(key) {
    if (key === 'again') {
      setAnchor(null);
      setAsking(true);
      return;
    }
    if (shown[key].prepares) {
      follow(key);
      return;
    }
    setBusy(key);
    try {
      await realisticService.download(jobId, entityId, key);
      setAnchor(null);
    } catch (error) {
      // A refusal can carry the student's status: it says why, and the status is read again, so the items show it.
      showSnackbar(refusalWords(error, key), 'error');
      if (error.realistic) status.refetch();
    } finally {
      setBusy(null);
    }
  }

  const open = (event) => setAnchor(event.currentTarget);
  const trigger = compact ? (
    <Tooltip title={title || WORDS.download}>
      <span>
        <IconButton aria-label={label || title || WORDS.download} disabled={disabled} onClick={open} ref={button}>
          <DownloadRounded fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  ) : (
    <Button
      aria-controls={anchor ? id : undefined}
      aria-expanded={anchor ? 'true' : undefined}
      aria-haspopup="menu"
      disabled={disabled}
      endIcon={<ExpandMoreRounded />}
      onClick={open}
      ref={button}
      startIcon={<DownloadRounded />}
      variant="outlined"
    >
      {WORDS.download}
    </Button>
  );

  return (
    <>
      {trigger}
      <Menu anchorEl={anchor} id={id} onClose={() => !busy && setAnchor(null)} open={Boolean(anchor)}>
        {ITEMS.filter((item) => shown[item.key]).map((item) => [
          item.key === 'comments' ? <Divider key="divider" /> : null,
          <MenuItem
            disabled={Boolean(busy) || shown[item.key].disabled}
            key={item.key}
            onClick={() => choose(item.key)}
            sx={ITEM_SX}
          >
            <ListItemIcon>{busy === item.key ? <CircularProgress size={16} /> : item.icon}</ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}
              secondary={shown[item.key].line || null}
              secondaryTypographyProps={LINE}
            />
          </MenuItem>,
        ])}
      </Menu>
      <Dialog fullWidth maxWidth="xs" onClose={() => setAsking(false)} open={asking}>
        <DialogTitle>{WORDS.again}</DialogTitle>
        <DialogContent>
          <DialogContentText>{WORDS.redrawAsk}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAsking(false)}>{WORDS.cancel}</Button>
          <Button
            onClick={() => {
              setAsking(false);
              follow('again');
            }}
            variant="contained"
          >
            {WORDS.redraw}
          </Button>
        </DialogActions>
      </Dialog>
      <RealisticProgressDialog
        entityId={entityId}
        item={preparing}
        jobId={jobId}
        onClose={() => {
          setPreparing(null);
          setWatch((last) => last && { ...last, since: Date.now() });
        }}
        onDone={() => setWatch(null)}
      />
    </>
  );
}
