// One Download report button with its format menu (the human's Phase 1.14 rule; design.md §3.9): PDF or Word. While
// a file is made, its item shows a spinner and the menu stays open; the page's toast says when it fails.
// Area: platform

import { useId, useState } from 'react';
import { Button, CircularProgress, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import DownloadRounded from '@mui/icons-material/DownloadRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import PictureAsPdfOutlined from '@mui/icons-material/PictureAsPdfOutlined';
import { REVIEW } from './words';

const FORMATS = [
  { key: 'pdf', label: REVIEW.pdf, hint: REVIEW.pdfHint, icon: <PictureAsPdfOutlined /> },
  { key: 'docx', label: REVIEW.word, hint: REVIEW.wordHint, icon: <DescriptionOutlined /> },
];

// onDownload(format): makes and saves the file ('pdf' or 'docx'); it rejects when that failed.
export default function DownloadMenu({ onDownload }) {
  const [anchor, setAnchor] = useState(null);
  const [busy, setBusy] = useState(null);
  const id = useId();
  async function choose(format) {
    setBusy(format);
    try {
      await onDownload(format);
    } catch {
      // the page has said what went wrong
    } finally {
      setBusy(null);
      setAnchor(null);
    }
  }
  return (
    <>
      <Button
        aria-controls={anchor ? id : undefined}
        aria-expanded={anchor ? 'true' : undefined}
        aria-haspopup="menu"
        endIcon={<ExpandMoreRounded />}
        onClick={(event) => setAnchor(event.currentTarget)}
        startIcon={<DownloadRounded />}
        variant="outlined"
      >
        {REVIEW.download}
      </Button>
      <Menu anchorEl={anchor} id={id} onClose={() => !busy && setAnchor(null)} open={Boolean(anchor)}>
        {FORMATS.map((format) => (
          <MenuItem disabled={Boolean(busy)} key={format.key} onClick={() => choose(format.key)}>
            <ListItemIcon>{busy === format.key ? <CircularProgress size={16} /> : format.icon}</ListItemIcon>
            <ListItemText
              primary={busy === format.key ? REVIEW.preparing(format.key) : format.label}
              primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}
              secondary={format.hint}
              secondaryTypographyProps={{ fontSize: 12, lineHeight: '16px', color: 'var(--mst-ink-2)' }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
