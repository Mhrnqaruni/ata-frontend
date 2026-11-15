// The top 5 between questions (design.md §3.7; SOT-9), only when the quiz has the leaderboard on: each place, name and
// points. Equal scores share a place, as the server sends them ("1st, 1st, 3rd"); never shown in the lobby.
// Area: quizzes

import { Box, Typography } from '@mui/material';
import { LIVE, ordinal } from './words';

// entries: the socket's leaderboard ({ rank, participant_id, display_name, score }), best first. nameOf(id) gives the
// class list's name for a participant, as the rest of the page shows it, or nothing for a walk-in.
export default function Leaderboard({ entries, nameOf = () => null }) {
  return (
    <Box component="section" aria-label={LIVE.top5}>
      <Typography
        component="h3"
        sx={{ fontSize: 12, lineHeight: '16px', fontWeight: 600, color: 'var(--mst-ink-2)', mb: 1 }}
      >
        {LIVE.top5}
      </Typography>
      <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 0.75 }}>
        {entries.slice(0, 5).map((entry, index) => (
          <Box
            component="li"
            key={entry.participant_id}
            sx={{ display: 'grid', gridTemplateColumns: '40px minmax(0, 1fr) auto', alignItems: 'center', gap: 1 }}
          >
            <Box
              component="span"
              sx={{ fontSize: 14, fontWeight: 600, color: 'var(--mst-ink-2)', fontVariantNumeric: 'tabular-nums' }}
            >
              {ordinal(entry.rank || index + 1)}
            </Box>
            <Box
              component="span"
              sx={{ fontSize: 14, lineHeight: '20px', color: 'var(--mst-ink)', overflowWrap: 'break-word' }}
            >
              {nameOf(entry.participant_id) || entry.display_name}
            </Box>
            <Box
              component="span"
              sx={{ fontSize: 14, fontWeight: 600, color: 'var(--mst-ink)', fontVariantNumeric: 'tabular-nums' }}
            >
              {LIVE.points(entry.score)}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
