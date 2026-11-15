// Who is still to answer (design.md §3.7; LV6): "Still to answer (10)" first, every name in ink, because those are the
// pupils the teacher chases; then "Answered (18)", folded, with ticks. Everyone answered shows by the main button.
// Area: quizzes

import { useState } from 'react';
import { Box, ButtonBase, Collapse, Typography } from '@mui/material';
import CheckRounded from '@mui/icons-material/CheckRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import { LIVE } from './words';

const heading = { fontSize: 12, lineHeight: '16px', fontWeight: 600, color: 'var(--mst-ink-2)' };
const name = { fontSize: 14, lineHeight: '20px', color: 'var(--mst-ink)', overflowWrap: 'break-word' };

// split: answeredSplit()'s { done, waiting, known }.
export default function AnsweredList({ split }) {
  const [openDone, setOpenDone] = useState(false);
  if (!split.known) {
    return <Typography sx={{ ...name, color: 'var(--mst-ink-2)' }}>{LIVE.namesLater}</Typography>;
  }
  return (
    <Box sx={{ display: 'grid', gap: 1.5, alignContent: 'start' }}>
      {split.waiting.length ? (
        <Box component="section" aria-label={LIVE.stillToAnswer(split.waiting.length)}>
          <Typography component="h3" sx={{ ...heading, mb: 0.75 }}>
            {LIVE.stillToAnswer(split.waiting.length)}
          </Typography>
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 0.5 }}>
            {split.waiting.map((person) => (
              <Box component="li" key={person.id} sx={name}>
                {person.name}
              </Box>
            ))}
          </Box>
        </Box>
      ) : null}
      {split.done.length ? (
        <Box component="section">
          <ButtonBase
            onClick={() => setOpenDone((open) => !open)}
            aria-expanded={openDone}
            sx={{
              ...heading,
              gap: 0.5,
              borderRadius: '8px',
              minHeight: 28,
              '&.Mui-focusVisible': { outline: '2px solid var(--mst-accent)' },
            }}
          >
            {LIVE.answeredList(split.done.length)}
            <ExpandMoreRounded
              sx={{
                fontSize: 18,
                transform: openDone ? 'rotate(180deg)' : 'none',
                transition: 'transform 150ms var(--mst-ease)',
              }}
            />
          </ButtonBase>
          <Collapse in={openDone}>
            <Box component="ul" sx={{ m: 0, mt: 0.5, p: 0, listStyle: 'none', display: 'grid', gap: 0.5 }}>
              {split.done.map((person) => (
                <Box component="li" key={person.id} sx={{ ...name, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <CheckRounded aria-hidden="true" sx={{ fontSize: 16, color: 'var(--mst-ok-ink)' }} />
                  {person.name}
                </Box>
              ))}
            </Box>
          </Collapse>
        </Box>
      ) : null}
    </Box>
  );
}
