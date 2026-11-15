// The "Live now" strip above the quiz list (L13; design.md §3.1, §6): a pulsing dot, "Live now: Year 9 Cells · 8B"
// and Open for up to 2 live quizzes, then "+3 more". The page shows it only while a live quiz isn't in the first 5 rows.
// Area: quizzes

import { Box, Button, Typography } from '@mui/material';
import { classList } from '../words';
import { displayTitle } from './rows';
import { LIBRARY } from './words';

// quizzes: the live quizzes to name (library items); onOpen(quiz) opens its live page; onShowAll lists them all.
export default function LiveNowStrip({ quizzes, onOpen, onShowAll }) {
  if (!quizzes.length) return null;
  const shown = quizzes.slice(0, 2);
  const more = quizzes.length - shown.length;
  return (
    <Box
      component="section"
      aria-label={LIBRARY.liveNow.replace(':', '')}
      className="mst-g1"
      sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 48, px: 2, py: 0.5, mb: 0.75, minWidth: 0 }}
    >
      <Box
        component="span"
        aria-hidden="true"
        className="mst-dot"
        data-pulse="true"
        sx={{ width: 8, height: 8, flex: 'none', color: 'var(--mst-ok)' }}
      />
      <Typography component="span" sx={{ fontSize: 14, fontWeight: 600, flex: 'none' }}>
        {LIBRARY.liveNow}
      </Typography>
      {shown.map((quiz) => (
        <Box key={quiz.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: '0 1 auto' }}>
          <Typography component="span" noWrap sx={{ fontSize: 14, minWidth: 0 }}>
            {displayTitle(quiz)} · {classList(quiz.classes)}
          </Typography>
          <Button
            size="small"
            variant="contained"
            aria-label={`${LIBRARY.open}: ${displayTitle(quiz)}`}
            onClick={() => onOpen(quiz)}
            sx={{ flex: 'none' }}
          >
            {LIBRARY.open}
          </Button>
        </Box>
      ))}
      {more > 0 ? (
        <Button size="small" onClick={onShowAll} sx={{ flex: 'none' }}>
          {LIBRARY.moreLive(more)}
        </Button>
      ) : null}
    </Box>
  );
}
