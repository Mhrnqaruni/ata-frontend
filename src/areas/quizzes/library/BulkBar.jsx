// The bar that takes the filter row's place once quizzes are ticked (design.md §3.1, L8): "3 selected" · Add tag ▾ ·
// Archive (or Unarchive, for archived ones) · Delete · × to clear the ticks.
// Area: quizzes

import { Box, Button, IconButton, Tooltip, Typography } from '@mui/material';
import ArchiveOutlined from '@mui/icons-material/ArchiveOutlined';
import ArrowDropDownRounded from '@mui/icons-material/ArrowDropDownRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import LocalOfferOutlined from '@mui/icons-material/LocalOfferOutlined';
import UnarchiveOutlined from '@mui/icons-material/UnarchiveOutlined';
import { LIBRARY } from './words';

// chosen: the ticked quizzes; onTags(anchor) opens the tag menu; busy: an action is running.
export default function BulkBar({ chosen, busy, onTags, onArchive, onUnarchive, onDelete, onClear }) {
  const archived = chosen.filter((quiz) => quiz.archived_at).length;
  return (
    <Box
      role="toolbar"
      aria-label={LIBRARY.selectedBar}
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 0.5,
        minHeight: 40,
        mb: 1,
        pl: 2,
        pr: 0.5,
        borderRadius: '12px',
        bgcolor: 'var(--mst-accent-tint)',
      }}
    >
      <Typography aria-live="polite" sx={{ fontSize: 14, fontWeight: 600, mr: 1, fontVariantNumeric: 'tabular-nums' }}>
        {LIBRARY.selected(chosen.length)}
      </Typography>
      <Button
        size="small"
        startIcon={<LocalOfferOutlined />}
        endIcon={<ArrowDropDownRounded />}
        aria-haspopup="menu"
        disabled={busy}
        onClick={(event) => onTags(event.currentTarget)}
      >
        {LIBRARY.addTag}
      </Button>
      {archived < chosen.length ? (
        <Button size="small" startIcon={<ArchiveOutlined />} disabled={busy} onClick={onArchive}>
          {LIBRARY.archive}
        </Button>
      ) : null}
      {archived ? (
        <Button size="small" startIcon={<UnarchiveOutlined />} disabled={busy} onClick={onUnarchive}>
          {LIBRARY.unarchive}
        </Button>
      ) : null}
      <Button size="small" color="error" startIcon={<DeleteOutline />} disabled={busy} onClick={onDelete}>
        {LIBRARY.delete}
      </Button>
      <Tooltip title={LIBRARY.clearSelection}>
        <IconButton aria-label={LIBRARY.clearSelection} onClick={onClear} sx={{ ml: 'auto' }}>
          <CloseRounded />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
