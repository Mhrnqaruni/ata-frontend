// The live page during a question, all on the first screen (design.md §3.7; LV1): the question card, then the clock,
// "18 of 28 answered", who's still to answer and the main button, beside it, under it, or on a phone in a strip.
// Area: quizzes

import { Alert, Box, LinearProgress, Paper, Typography, useMediaQuery } from '@mui/material';
import CheckRounded from '@mui/icons-material/CheckRounded';
import AnsweredList from './AnsweredList';
import Leaderboard from './Leaderboard';
import MainAction from './MainAction';
import PhoneStrip from './PhoneStrip';
import QuestionCard from './QuestionCard';
import StillToAnswer from './StillToAnswer';
import TimedChoice from './TimedChoice';
import TimerRing from './TimerRing';
import { LIVE } from './words';

const WIDE = '@container (min-width: 900px)';
// Below 600 px (a phone, design.md §3.6) the clock, the count and the main button move to a strip kept on screen.
export const PHONE = '(max-width: 599px)';

// room: the room state; keyQuestion: the run's copy of the question; total: the quiz's questions; split: who answered;
// seconds and movesOnIn: the clocks in whole seconds; counts: the answer counts once shown; showBoard: the top 5, with
// nameOf(id) for its class-list names. action and actions: the main button; choice: a timed run's small control in its
// place (timedChoice()); everyone: every pupil has answered; waiting: Next is held for the marks; last: last question.
export default function QuestionPanel({
  room,
  keyQuestion,
  total,
  split,
  seconds,
  movesOnIn,
  counts,
  showBoard,
  nameOf,
  action,
  actions,
  choice,
  everyone,
  waiting,
  last,
}) {
  const { question, closed } = room;
  const share = split.total ? Math.round((split.count / split.total) * 100) : 0;
  const phone = useMediaQuery(PHONE, { noSsr: true });
  const control = choice ? (
    <TimedChoice choice={choice} last={last} busy={actions.busy} onPress={actions.onPress} />
  ) : (
    <MainAction
      action={action}
      busy={actions.busy}
      onPress={actions.onPress}
      waiting={waiting}
      seconds={closed ? movesOnIn : null}
      size={phone ? 'medium' : 'large'}
      fullWidth={!phone}
    />
  );
  const card = (
    <Paper
      className="mst-rim"
      sx={{ p: phone ? 2 : 3, borderRadius: '20px', minWidth: 0, display: 'flex', flexDirection: 'column' }}
      data-mst="live-question"
    >
      <QuestionCard
        question={question}
        keyQuestion={keyQuestion}
        number={question.order_index + 1}
        total={total}
        revealed={closed}
        counts={counts}
        answered={split.count}
        marking={room.marksPending}
        phone={phone}
      />
    </Paper>
  );
  if (phone) {
    return (
      <Box sx={{ display: 'grid', gap: 1.5 }}>
        {card}
        {closed && showBoard ? (
          <Paper className="mst-rim" sx={{ p: 2, borderRadius: '16px' }}>
            <Leaderboard entries={room.leaderboard} nameOf={nameOf} />
          </Paper>
        ) : (
          <StillToAnswer split={split} />
        )}
        <PhoneStrip
          seconds={seconds}
          limit={question.time_limit_seconds}
          split={split}
          everyone={everyone}
          choice={choice}
          control={control}
          error={actions.error}
          onClearError={actions.clearError}
        />
      </Box>
    );
  }
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: 'minmax(0, 1fr)',
        [WIDE]: { gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', alignItems: 'stretch' },
      }}
    >
      {card}
      <Paper
        className="mst-rim"
        data-mst="live-side"
        sx={{
          p: 2.5,
          borderRadius: '20px',
          display: 'grid',
          gap: 2,
          alignContent: 'start',
          gridTemplateColumns: 'auto minmax(0, 1fr) auto',
          alignItems: 'center',
          [WIDE]: {
            gridTemplateColumns: 'minmax(0, 1fr)',
            gridTemplateRows: 'auto auto minmax(0, 1fr) auto',
            alignItems: 'stretch',
          },
        }}
      >
        <Box sx={{ justifySelf: 'center' }}>
          <TimerRing seconds={seconds} limit={question.time_limit_seconds} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{ fontSize: 17, lineHeight: '24px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', mb: 1 }}
          >
            {LIVE.answeredOf(split.count, split.total)}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={share}
            aria-hidden="true"
            sx={{
              height: 8,
              borderRadius: 999,
              bgcolor: 'var(--mst-neutral)',
              '& .MuiLinearProgress-bar': { borderRadius: 999, background: 'var(--mst-accent)' },
            }}
          />
        </Box>
        <Box
          sx={{
            gridColumn: '1 / -1',
            gridRow: 2,
            overflowY: 'auto',
            minHeight: 0,
            maxHeight: 280,
            // The names scroll inside the column, so it stays no taller than the first screen.
            [WIDE]: { gridColumn: 'auto', gridRow: 'auto', maxHeight: 'max(160px, calc(100vh - 470px))' },
          }}
        >
          {closed && showBoard ? (
            <Leaderboard entries={room.leaderboard} nameOf={nameOf} />
          ) : (
            <AnsweredList split={split} />
          )}
        </Box>
        <Box
          sx={{
            display: 'grid',
            gap: 1,
            justifyItems: 'stretch',
            gridRow: 1,
            gridColumn: 3,
            [WIDE]: { gridRow: 'auto', gridColumn: 'auto' },
          }}
        >
          {everyone && action === 'reveal' ? (
            // "I'll press Next": the answered line moves up beside the main button (design.md §3.2).
            <Typography
              role="status"
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                fontSize: 14,
                lineHeight: '20px',
                fontWeight: 600,
                color: 'var(--mst-ok-ink)',
              }}
            >
              <CheckRounded aria-hidden="true" sx={{ fontSize: 18 }} />
              {LIVE.everyoneAnswered}
            </Typography>
          ) : null}
          {control}
          {actions.error ? (
            <Alert severity="error" onClose={actions.clearError} sx={{ py: 0 }}>
              {actions.error}
            </Alert>
          ) : null}
        </Box>
      </Paper>
    </Box>
  );
}
