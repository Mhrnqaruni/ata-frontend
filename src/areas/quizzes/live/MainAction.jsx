// The live page's one main button (design.md §3.7): Start quiz, Show answers, Next question, or Finish and see
// results, following the question. The page and Present's control bar show the same button.
// Area: quizzes

import { Button } from '@mui/material';
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded';
import VisibilityRounded from '@mui/icons-material/VisibilityRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import FlagRounded from '@mui/icons-material/FlagRounded';
import { LIVE } from './words';

const ICONS = {
  start: <PlayArrowRounded />,
  reveal: <VisibilityRounded />,
  next: <ArrowForwardRounded />,
  finish: <FlagRounded />,
};

// The button's words: busy, held for the marks ("Marking… one moment", design.md §3.4), the pause counting down in a
// run that moves on by itself ("Next question in 8 s", §3.2), or the action's own.
function wordsOf(action, { busy, waiting, seconds }) {
  if (busy) return LIVE.working;
  if (waiting) return LIVE.markingWait;
  if (action === 'next' && seconds != null) return LIVE.nextIn(seconds);
  return LIVE[action];
}

// action: mainAction()'s key; busy: the action running, if any; onPress(action) runs it; waiting: the press is held
// until the typed answers' marks arrive; seconds: the pause left before the run moves on by itself.
export default function MainAction({
  action,
  busy,
  onPress,
  waiting = false,
  seconds = null,
  size = 'large',
  fullWidth = false,
}) {
  if (!action) return null;
  const stopped = action === 'starting' || Boolean(busy) || waiting;
  return (
    <Button
      variant="contained"
      size={size}
      fullWidth={fullWidth}
      disabled={stopped}
      startIcon={ICONS[action]}
      onClick={() => onPress(action)}
      data-mst="live-main"
      data-action={action}
      sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}
    >
      {wordsOf(action, { busy, waiting, seconds })}
    </Button>
  );
}
