// Who is still to answer, at phone width (design.md §3.6): one line under the question card, "Still to answer: Lee, Sam
// +6", which a tap opens to every name. Nothing once everyone has answered; the strip says so.
// Area: quizzes

import { useState } from 'react';
import { Box, ButtonBase, Collapse, Typography } from '@mui/material';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import { LIVE } from './words';

// split: answeredSplit()'s { waiting, known }.
export default function StillToAnswer({ split }) {
  const [open, setOpen] = useState(false);
  if (!split.known) {
    return (
      <Typography sx={{ px: 1, fontSize: 14, lineHeight: '20px', color: 'var(--mst-ink-2)' }}>
        {LIVE.namesLater}
      </Typography>
    );
  }
  if (!split.waiting.length) return null;
  return (
    <Box data-mst="live-still">
      <ButtonBase
        onClick={() => setOpen((shown) => !shown)}
        aria-expanded={open}
        sx={{
          width: '100%',
          minHeight: 44,
          px: 1,
          gap: 0.5,
          justifyContent: 'space-between',
          borderRadius: '12px',
          textAlign: 'left',
          fontSize: 14,
          lineHeight: '20px',
          color: 'var(--mst-ink)',
          '&.Mui-focusVisible': { outline: '2px solid var(--mst-accent)' },
        }}
      >
        {LIVE.stillLine(split.waiting.map((person) => person.name))}
        <ExpandMoreRounded
          aria-hidden="true"
          sx={{
            fontSize: 20,
            color: 'var(--mst-ink-2)',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 150ms var(--mst-ease)',
          }}
        />
      </ButtonBase>
      <Collapse in={open}>
        <Box component="ul" sx={{ m: 0, px: 1, pb: 1, listStyle: 'none', display: 'grid', gap: 0.5 }}>
          {split.waiting.map((person) => (
            <Box component="li" key={person.id} sx={{ fontSize: 14, lineHeight: '20px', overflowWrap: 'break-word' }}>
              {person.name}
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}
