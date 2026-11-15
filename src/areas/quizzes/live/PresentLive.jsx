// What Present shows the class (design.md §3.8): "24 of 28 here" with first names before the start, then the question,
// its answers, the clock and "18 answered". Never names, scores, or the right answer before Show answers.
// Area: quizzes

import { Box, Typography } from '@mui/material';
import NameChips from './NameChips';
import QuestionCard from './QuestionCard';
import TimerRing from './TimerRing';
import { LIVE } from './words';

// Before the start: how many are here, and their first names.
export function PresentHere({ people }) {
  const { here, expected } = people;
  return (
    <Box sx={{ display: 'grid', gap: 2, justifyItems: 'center', maxWidth: 960, mx: 'auto' }}>
      <Typography
        component="p"
        sx={{ fontSize: 30, lineHeight: '36px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
      >
        {here.length ? LIVE.here(here.length, expected) : LIVE.waitingForPupils}
      </Typography>
      {here.length ? <NameChips people={here} max={16} big sx={{ justifyContent: 'center' }} /> : null}
    </Box>
  );
}

// During the quiz: the question as the class reads it, with the clock and the answered count; once it closes, the
// right count, or "Marking typed answers…" while the AI marks (design.md §3.4).
export function PresentQuestion({ room, keyQuestion, total, seconds, answered, counts }) {
  const { question, closed } = room;
  return (
    <Box sx={{ position: 'relative', width: 'min(1200px, 100%)', display: 'grid', gap: 3 }} data-mst="present-question">
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
        <Typography sx={{ fontSize: 24, lineHeight: '32px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {LIVE.answeredBare(answered)}
        </Typography>
        {closed ? null : <TimerRing seconds={seconds} limit={question.time_limit_seconds} size={140} />}
      </Box>
      <QuestionCard
        big
        question={question}
        keyQuestion={keyQuestion}
        number={question.order_index + 1}
        total={total}
        revealed={closed}
        counts={counts}
        answered={answered}
        marking={room.marksPending}
      />
    </Box>
  );
}

const barWords = {
  px: 1.5,
  fontSize: 17,
  lineHeight: '24px',
  fontWeight: 600,
  fontVariantNumeric: 'tabular-nums',
  color: 'var(--mst-ink)',
  whiteSpace: 'nowrap',
};

// The control bar's clock beside the main button: the seconds left while answering.
export function PresentClock({ seconds }) {
  return (
    <Typography component="span" sx={barWords}>
      {seconds} {LIVE.secondsLeft}
    </Typography>
  );
}

// The control bar's "18 answered", in a timed run, where the bar has no main button while pupils answer (§3.2).
export function PresentAnswered({ count }) {
  return (
    <Typography component="span" sx={{ ...barWords, fontWeight: 500, color: 'var(--mst-ink-2)' }}>
      {LIVE.answeredBare(count)}
    </Typography>
  );
}
