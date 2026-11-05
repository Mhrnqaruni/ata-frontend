// Under an AI mark that 2 of the 3 markings agreed on (design §3.5): one quiet line that says so, and the other
// marking's reason behind "Why {n}?", so the split shows without anchoring the teacher on the dissent.
// Area: assessments

import { useId, useState } from 'react';
import { Box, Button } from '@mui/material';

// A mark as a teacher reads it (1, not 1.0); a marking that gave none says so.
const shown = (mark) => (mark == null ? 'no mark' : String(Number(mark)));
const hint = { fontSize: 12, lineHeight: '16px', fontWeight: 500, color: 'var(--mst-ink-3)' };

export default function AgreementHint({ agreement: { agreeing, of, otherMark, otherReason }, grade }) {
  const [open, setOpen] = useState(false);
  const reasonId = useId();
  return (
    <Box sx={hint}>
      {agreeing} of the {of} AI markings gave {shown(grade)}. The other gave {shown(otherMark)}.
      {otherReason && (
        <Button
          size="small"
          aria-expanded={open}
          aria-controls={reasonId}
          onClick={() => setOpen(!open)}
          sx={{ display: 'flex', mt: '2px', '@media (pointer: coarse)': { minHeight: 44 } }}
        >
          {open ? 'Hide' : `Why ${shown(otherMark)}?`}
        </Button>
      )}
      {open && (
        <Box id={reasonId} sx={{ mt: '4px', color: 'var(--mst-ink-2)' }}>
          {otherReason}
        </Box>
      )}
    </Box>
  );
}
