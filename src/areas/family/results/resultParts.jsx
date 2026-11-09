// Small parts the family result screens share: prose with maths, the Next step card, the save note, the step bar
// and the reduced-motion check (Phase 1.37, S4.3; Phase 1.38 design §6.4–§6.6).
// Area: family

import { Box, Button, Typography } from '@mui/material';
import LightbulbOutlined from '@mui/icons-material/LightbulbOutlined';
import ChatBubbleOutlineRounded from '@mui/icons-material/ChatBubbleOutlineRounded';
import MathText from '../MathText';

export const Prose = ({ text }) => (
  <Box className="fam-prose">
    <MathText text={text} />
  </Box>
);

export const reduced = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

/** `extra` is one more line at the end, such as the quiz's "Want different questions? Make 5 new ones" (§6.5). */
export function NextStep({ text, onAsk, extra = null }) {
  return (
    <section className="fam-tip">
      <LightbulbOutlined className="fam-tip-icon" aria-hidden />
      <div className="fam-tip-body">
        <Typography className="fam-tip-title">Next step</Typography>
        {text && <Prose text={text} />}
        {onAsk && (
          <Button size="small" startIcon={<ChatBubbleOutlineRounded />} onClick={onAsk} className="fam-tip-action">
            Ask about this
          </Button>
        )}
        {extra}
      </div>
    </section>
  );
}

/** The step bar over a quiz or a deck: one 6 px segment per step, lit up to the current one (design §6.5). */
export function Steps({ count, now }) {
  return (
    <div className="fam-prog" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} data-on={i <= now} />
      ))}
    </div>
  );
}

/** Saving is silent; only a failure is shown, as one calm line. */
export function SaveNote({ saved, text }) {
  return (
    <Typography component="div" className="fam-save-note" role="status">
      {saved?.error || text}
      {saved?.error &&
        (saved.conflict ? (
          <Button size="small" onClick={saved.reload}>
            Show latest
          </Button>
        ) : (
          <Button size="small" onClick={saved.retry}>
            Try again
          </Button>
        ))}
    </Typography>
  );
}
