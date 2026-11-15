// A timed run's small control while its question is open (Phase 1.47 R2; design.md §3.2): "Show answers now", a quiet
// text button, then, once everyone has answered, "✓ Everyone's answered · Move on", outlined, fading in. No big button.
// Area: quizzes

import { Button } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import CheckRounded from '@mui/icons-material/CheckRounded';
import { LIVE } from './words';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

// choice: timedChoice()'s 'early' or 'everyone'; last: the last question ("· Finish"); busy: an action is running;
// onPress('reveal') closes the question now, and the pause and the move on follow, as when its time is up.
export default function TimedChoice({ choice, last, busy, onPress }) {
  if (choice === 'everyone') {
    return (
      <Button
        variant="outlined"
        size="small"
        disabled={Boolean(busy)}
        startIcon={<CheckRounded sx={{ color: 'var(--mst-ok-ink)' }} />}
        onClick={() => onPress('reveal')}
        data-mst="live-everyone"
        sx={{
          minHeight: 36,
          whiteSpace: 'nowrap',
          animation: `${fadeIn} 200ms var(--mst-ease) both`,
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      >
        {busy ? LIVE.working : last ? LIVE.everyoneFinish : LIVE.everyoneMoveOn}
      </Button>
    );
  }
  if (choice !== 'early') return null;
  return (
    <Button
      variant="text"
      size="small"
      disabled={Boolean(busy)}
      onClick={() => onPress('reveal')}
      data-mst="live-early"
      sx={{ minHeight: 36, whiteSpace: 'nowrap', fontSize: 14, color: 'var(--mst-accent-ink)' }}
    >
      {busy ? LIVE.working : LIVE.showAnswersNow}
    </Button>
  );
}
