// The pupil in the live room (Phase 1.47 design.md §3.5; #62): waiting with "You're in!", each question, its result
// and the end, from the room's socket, with a quiet "Reconnecting…" line and a way back in when the place is refused.
// Area: quizzes

import { useEffect, useState } from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import { getLiveResponse } from './api';
import LiveClosed from './LiveClosed';
import LiveEnd from './LiveEnd';
import LiveQuestion from './LiveQuestion';
import PlayFrame from './PlayFrame';
import { usePupilRoom } from './usePupilRoom';
import { PLAY } from './words';

const SLOW_MS = 8000;
// The waiting dot's slow 2 s breath; reduced motion keeps it still.
const breathe = keyframes`
  0%, 100% { opacity: 1; transform: none; }
  50% { opacity: 0.4; transform: scale(0.8); }
`;

// place: the pupil's saved place; onLeave() forgets it and goes back to joining.
export default function LiveRoom({ place, onLeave }) {
  const [rejected, setRejected] = useState(false);
  const [state, connected, dispatch] = usePupilRoom(place, { onRejected: () => setRejected(true) });
  const [sent, setSent] = useState(() => (place.answer ? { [place.answer.questionId]: place.answer.value } : {}));
  const slow = useSlow(!connected);
  const { question, phase } = state;

  // A short answer's AI mark arrived: read this pupil's result again (ai_grading_complete).
  useEffect(() => {
    if (!state.regrade) return;
    getLiveResponse(place.session.id, place.guestToken, state.regrade).then(
      (result) => dispatch({ message: { type: 'feedback', feedback: result } }),
      () => {}
    );
  }, [state.regrade, place, dispatch]);

  if (rejected) {
    return (
      <PlayFrame logo>
        <Paper className="mst-rim" sx={{ p: 3, borderRadius: '20px', display: 'grid', gap: 2, textAlign: 'center' }}>
          <Typography
            component="h1"
            sx={{ fontFamily: 'var(--font-display)', fontSize: 24, lineHeight: '30px', fontWeight: 600 }}
          >
            {PLAY.rejectedTitle}
          </Typography>
          <Typography sx={{ fontSize: 15, lineHeight: '24px', color: 'var(--mst-ink-2)' }}>
            {PLAY.rejectedLine}
          </Typography>
          <Button variant="outlined" size="large" onClick={onLeave}>
            {PLAY.joinWithCode}
          </Button>
        </Paper>
      </PlayFrame>
    );
  }
  const note = connected || phase === 'finished' ? null : slow ? 'slow' : 'reconnecting';
  const sentValue = question ? sent[String(question.id)] : undefined;
  const answered = Boolean(question) && (sentValue !== undefined || state.answeredId === String(question.id));
  return (
    <PlayFrame note={note} bar={phase === 'question'}>
      {phase === 'waiting' ? <Waiting place={place} onLeave={onLeave} /> : null}
      {phase === 'question' && question ? (
        <LiveQuestion
          key={question.id}
          question={question}
          endsAt={state.endsAt}
          place={place}
          sentBefore={answered}
          savedValue={sentValue}
          onSent={(value) => setSent((all) => ({ ...all, [String(question.id)]: value }))}
        />
      ) : null}
      {phase === 'closed' && question ? (
        <LiveClosed question={question} feedback={state.feedback} answered={answered} movesOnAt={state.movesOnAt} />
      ) : null}
      {phase === 'finished' ? <LiveEnd place={place} end={state.end} leaderboard={state.leaderboard} /> : null}
    </PlayFrame>
  );
}

// Before the start, centred on the screen: "You're in!", keep this page open, and the pupil's name with "Not you?
// Change"; a small dot breathes so the page looks alive.
function Waiting({ place, onLeave }) {
  const name = place.participant?.guest_name || place.participant?.display_name;
  return (
    <Box
      sx={{ flex: 1, display: 'grid', alignContent: 'center', justifyItems: 'center', gap: 1.5, textAlign: 'center' }}
      data-mst="pupil-waiting"
    >
      <Box
        aria-hidden="true"
        sx={{
          width: 12,
          height: 12,
          mb: 1,
          borderRadius: '50%',
          bgcolor: 'var(--mst-accent)',
          animation: `${breathe} 2s ease-in-out infinite`,
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      />
      {place.session?.quiz_title ? (
        <Typography
          sx={{
            fontSize: 14,
            lineHeight: '20px',
            fontWeight: 600,
            color: 'var(--mst-ink-2)',
            overflowWrap: 'break-word',
          }}
        >
          {place.session.quiz_title}
        </Typography>
      ) : null}
      <Typography
        component="h1"
        sx={{ fontFamily: 'var(--font-display)', fontSize: 30, lineHeight: '36px', fontWeight: 600 }}
      >
        {PLAY.inTitle}
      </Typography>
      <Typography sx={{ fontSize: 15, lineHeight: '24px', color: 'var(--mst-ink-2)', maxWidth: 320 }}>
        {PLAY.inLine}
      </Typography>
      <Box
        className="mst-g1"
        sx={{
          mt: 1,
          display: 'inline-flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'center',
          columnGap: 0.5,
          minHeight: 40,
          pl: 2,
          pr: 0.5,
          borderRadius: '999px',
          fontSize: 14,
          lineHeight: '20px',
        }}
      >
        {name ? (
          <Box component="span" sx={{ fontWeight: 600 }}>
            {name}
          </Box>
        ) : null}
        <Box component="span" sx={{ color: 'var(--mst-ink-2)' }}>
          {name ? ` · ${PLAY.notYou}` : PLAY.notYou}
        </Box>
        <Button size="small" onClick={onLeave} sx={{ minWidth: 0, minHeight: 36 }}>
          {PLAY.change}
        </Button>
      </Box>
    </Box>
  );
}

// True once the socket has been down for 8 s: "Still trying. Check your Wi-Fi or mobile data."
function useSlow(down) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    if (!down) return undefined;
    const timer = setTimeout(() => setSlow(true), SLOW_MS);
    return () => clearTimeout(timer);
  }, [down]);
  return slow;
}
