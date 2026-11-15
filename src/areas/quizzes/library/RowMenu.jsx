// A quiz row's ⋯ menu (Phase 1.47 design.md §3.10), solid and 220 px wide: first Run again…, Start…, Send…, Continue
// editing or Unarchive by state, then Results · Edit questions · Change name · Make a copy · Add tag · Archive · Delete.
// Area: quizzes

import { useState } from 'react';
import { Divider, ListItemIcon, Menu, MenuItem } from '@mui/material';
import ArchiveOutlined from '@mui/icons-material/ArchiveOutlined';
import BarChartOutlined from '@mui/icons-material/BarChartOutlined';
import ContentCopy from '@mui/icons-material/ContentCopy';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import DriveFileRenameOutline from '@mui/icons-material/DriveFileRenameOutline';
import EditNoteOutlined from '@mui/icons-material/EditNoteOutlined';
import LocalOfferOutlined from '@mui/icons-material/LocalOfferOutlined';
import PlayArrowOutlined from '@mui/icons-material/PlayArrowOutlined';
import ReplayOutlined from '@mui/icons-material/ReplayOutlined';
import SendOutlined from '@mui/icons-material/SendOutlined';
import UnarchiveOutlined from '@mui/icons-material/UnarchiveOutlined';
import { menuItems } from './rows';
import { LIBRARY } from './words';

// A solid menu, not glass, so the rows beneath never show through it (L9). Three classes' weight, as app.css makes
// every menu glass with a two-class rule (.MuiPaper-root.MuiMenu-paper).
export const solidPaper = {
  '&&&': { background: 'var(--mst-solid)', WebkitBackdropFilter: 'none', backdropFilter: 'none' },
};

// Each item's words and icon; Start… says Send… for homework.
const ITEMS = {
  again: [LIBRARY.runAgain, ReplayOutlined],
  start: [LIBRARY.startRun, PlayArrowOutlined],
  send: [LIBRARY.sendRun, SendOutlined],
  continue: [LIBRARY.continueEditing, EditNoteOutlined],
  results: [LIBRARY.results, BarChartOutlined],
  edit: [LIBRARY.editQuestions, EditNoteOutlined],
  rename: [LIBRARY.changeName, DriveFileRenameOutline],
  copy: [LIBRARY.makeCopy, ContentCopy],
  tags: [LIBRARY.addTag, LocalOfferOutlined],
  archive: [LIBRARY.archive, ArchiveOutlined],
  unarchive: [LIBRARY.unarchive, UnarchiveOutlined],
};

// anchor: the ⋯ button; quiz: its row; onPick(action): again, start, continue, results, edit, rename, copy, tags,
// archive, unarchive or delete.
export default function RowMenu({ anchor, quiz, onClose, onPick }) {
  // The last quiz stays while the menu fades out, so its items don't vanish mid-fade.
  const [kept, setKept] = useState(quiz);
  if (quiz && quiz !== kept) setKept(quiz);
  const shown = quiz || kept;
  const items = shown ? menuItems(shown) : [];
  return (
    <Menu
      anchorEl={anchor}
      open={Boolean(anchor && quiz)}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{ paper: { sx: { ...solidPaper, width: 220 } } }}
    >
      {items.map((action) => {
        const [label, Icon] = ITEMS[action === 'start' && shown.mode === 'self_paced' ? 'send' : action];
        return (
          <MenuItem key={action} onClick={() => onPick(action)}>
            <ListItemIcon>
              <Icon fontSize="small" />
            </ListItemIcon>
            {label}
          </MenuItem>
        );
      })}
      <Divider />
      <MenuItem onClick={() => onPick('delete')} sx={{ color: 'var(--mst-bad-ink)' }}>
        <ListItemIcon>
          <DeleteOutline fontSize="small" />
        </ListItemIcon>
        {LIBRARY.delete}
      </MenuItem>
    </Menu>
  );
}
