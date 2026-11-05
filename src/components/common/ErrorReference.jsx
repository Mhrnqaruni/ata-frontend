// The last line of an error: "Reference: 3F9C-2A1B" and a copy button, so a teacher can send it with a report
// and we can find the error in our logs (design §3.6). With no reference it shows nothing.
// Area: platform

import { useEffect, useState } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import { formatReference } from '../../services/clientErrors';
import { monoFont } from '../../theme/tokens';

// Tokens, not theme colours: the snackbar draws this outside the app's theme.
const label = { fontSize: 12, lineHeight: '16px', fontWeight: 500, color: 'var(--mst-ink-3)' };
const code = { fontFamily: monoFont, fontSize: 12, lineHeight: '16px', color: 'var(--mst-ink-2)' };
const button = {
  width: 32,
  height: 32,
  minWidth: 32,
  minHeight: 32,
  p: 0,
  borderRadius: '12px',
  color: 'var(--mst-ink-2)',
  '@media (pointer: coarse)': { width: 44, height: 44, minWidth: 44, minHeight: 44 },
};

export default function ErrorReference({ reference }) {
  const [hovered, setHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);
  const shown = formatReference(reference);
  if (!shown) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shown);
      setCopied(true);
    } catch {
      // No clipboard on this page: the reference stays on screen to read out.
    }
  };
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', mt: '4px' }}>
      <Box component="span" sx={label}>
        Reference:
      </Box>
      <Box component="span" sx={code}>
        {shown}
      </Box>
      {/* Open while hovered, and for 2 s after a copy, so a tap on a phone also shows "Copied". */}
      <Tooltip
        title={copied ? 'Copied' : 'Copy reference'}
        open={hovered || copied}
        onOpen={() => setHovered(true)}
        onClose={() => setHovered(false)}
      >
        <IconButton aria-label="Copy reference" onClick={copy} sx={button}>
          <ContentCopyRounded sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
