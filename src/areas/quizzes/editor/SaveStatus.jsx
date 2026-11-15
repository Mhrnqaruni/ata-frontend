// The header's saving words (design.md §3.4, §5): "Saving…", "Saved · just now", or "Not saved · Try again" in
// warning ink; a quiz that isn't a draft saves on request, so it says "Changes not saved · Save changes".
// Area: quizzes

import { useEffect, useState } from 'react';
import { Button, Tooltip } from '@mui/material';
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import { SAVING } from './words';

// The time now, again every 30 s while a "Saved" time shows, so "just now" moves on to "1 min ago".
function useNow(running) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [running]);
  return now;
}

const linkButton = { minHeight: 0, p: '0 4px', fontSize: 14, lineHeight: '20px', verticalAlign: 'baseline' };

export default function SaveStatus({ save, isDraft, changed, onSave }) {
  const now = useNow(save.phase === 'saved');
  if (save.phase === 'saving')
    return (
      <span className="mst-qe-status" role="status">
        {SAVING.saving}
      </span>
    );
  if (save.phase === 'failed')
    return (
      <span className="mst-qe-status" data-tone="warn" role="status">
        <ErrorOutlineRounded aria-hidden="true" />
        <Tooltip title={save.error?.message ?? ''}>
          <span>{SAVING.failed}</span>
        </Tooltip>
        <span aria-hidden="true">·</span>
        <Button size="small" onClick={onSave} sx={linkButton}>
          {SAVING.tryAgain}
        </Button>
      </span>
    );
  if (!isDraft && changed)
    return (
      <span className="mst-qe-status" role="status">
        {SAVING.unsaved}
        <span aria-hidden="true">·</span>
        <Button size="small" onClick={onSave} sx={linkButton}>
          {SAVING.saveChanges}
        </Button>
      </span>
    );
  if (save.phase === 'saved')
    return (
      <span className="mst-qe-status" role="status">
        <CheckCircleOutlineRounded aria-hidden="true" data-tone="ok" />
        {SAVING.saved(save.at, Math.max(now, save.at))}
      </span>
    );
  return null;
}
