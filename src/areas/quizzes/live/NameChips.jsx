// Names as they arrive (design.md §3.7, §3.8, §6): small chips that drift in (200 ms, 8 px), then "+12 more". The
// lobby shows full names; Present shows first names only, bigger, for the class to read.
// Area: quizzes

import { Box } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import { firstName } from './people';
import { LIVE } from './words';

const driftIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
`;

// people: [{ id, name }]; max: the chips shown before "+n more"; big: Present's size, with first names.
export default function NameChips({ people, max = 24, big = false, sx }) {
  const shown = people.slice(0, max);
  const more = people.length - shown.length;
  const chip = {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: big ? 40 : 28,
    px: big ? 2 : 1.25,
    borderRadius: '999px',
    bgcolor: 'var(--mst-well)',
    border: '1px solid var(--mst-edge)',
    color: 'var(--mst-ink)',
    fontSize: big ? 17 : 14,
    lineHeight: big ? '24px' : '20px',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  };
  return (
    <Box
      component="ul"
      sx={{ display: 'flex', flexWrap: 'wrap', gap: big ? 1.5 : 1, m: 0, p: 0, listStyle: 'none', ...sx }}
    >
      {shown.map((person) => (
        <Box
          component="li"
          key={person.id}
          sx={{
            ...chip,
            animation: `${driftIn} 200ms var(--mst-ease) both`,
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        >
          {big ? firstName(person.name) : person.name}
        </Box>
      ))}
      {more > 0 ? (
        <Box component="li" sx={{ ...chip, bgcolor: 'transparent', color: 'var(--mst-ink-2)' }}>
          {LIVE.more(more)}
        </Box>
      ) : null}
    </Box>
  );
}
