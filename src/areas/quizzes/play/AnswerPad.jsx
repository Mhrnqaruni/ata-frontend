// The pupil's answers on a phone, live and homework (Phase 1.47 R4; design.md §3.5): choices fill the space to the bar
// (72–120 px each, True and False up to 160 px), and a typed answer gets a 3-line box where Enter sends.
// Area: quizzes

import { Box, ButtonBase, TextField, Typography } from '@mui/material';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import MathTextDisplay from '../../../components/common/MathTextDisplay';
import { answerTexts } from '../live/answers';
import { PLAY } from './words';

const LETTERS = 'ABCDEFGH';
const focusRing = { '&.Mui-focusVisible': { outline: '2px solid var(--mst-accent)', outlineOffset: 2 } };

// question: { type, options } (homework passes its question_type as type); value: the choice (an index, true or
// false, or text); onChange(value); disabled once it's sent or the time is up; label: the question, for the group's
// name; onEnter: Enter in the typed box (live sends).
export default function AnswerPad({ question, value, onChange, disabled = false, label, onEnter }) {
  if (question.type === 'short_answer') {
    return (
      <Box sx={{ display: 'grid', gap: 1, alignContent: 'start' }}>
        <Typography
          component="label"
          htmlFor="mst-pupil-answer"
          sx={{ fontSize: 14, lineHeight: '20px', fontWeight: 600 }}
        >
          {PLAY.yourAnswer}
        </Typography>
        <TextField
          id="mst-pupil-answer"
          fullWidth
          multiline
          minRows={3}
          placeholder={PLAY.typeAnswer}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && onEnter) {
              event.preventDefault();
              onEnter();
            }
          }}
          disabled={disabled}
          inputProps={{ maxLength: 500, enterKeyHint: onEnter ? 'send' : 'next' }}
          sx={{
            '& .MuiInputBase-root': {
              minHeight: 112,
              alignItems: 'flex-start',
              fontSize: 17,
              lineHeight: '24px',
              bgcolor: 'var(--mst-solid)',
            },
          }}
        />
      </Box>
    );
  }
  const truth = question.type === 'true_false';
  const texts = answerTexts(question);
  const valueOf = (index) => (truth ? index === 0 : index);
  return (
    <Box
      role="radiogroup"
      aria-label={label}
      data-mst="answer-pad"
      sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}
    >
      {texts.map((text, index) => {
        const chosen = value === valueOf(index);
        return (
          <ButtonBase
            key={index}
            role="radio"
            aria-checked={chosen}
            disabled={disabled}
            onClick={() => onChange(valueOf(index))}
            data-choice={index}
            sx={{
              flex: '1 1 0',
              minHeight: 72,
              maxHeight: truth ? 160 : 120,
              justifyContent: truth ? 'center' : 'flex-start',
              gap: 1.5,
              px: 2,
              py: 1.5,
              borderRadius: '16px',
              textAlign: truth ? 'center' : 'left',
              bgcolor: chosen ? 'var(--mst-accent-tint)' : 'var(--mst-solid)',
              border: '1px solid',
              borderColor: chosen ? 'var(--mst-accent)' : 'var(--mst-edge-control)',
              // The chosen edge is 2 px without moving anything: the second pixel is drawn inside.
              boxShadow: chosen ? 'inset 0 0 0 1px var(--mst-accent)' : 'none',
              color: 'var(--mst-ink)',
              opacity: disabled && !chosen ? 0.6 : 1,
              transition: 'background-color 150ms var(--mst-ease), border-color 150ms var(--mst-ease)',
              ...focusRing,
            }}
          >
            {truth ? null : (
              <Box
                component="span"
                aria-hidden="true"
                sx={{
                  flex: 'none',
                  display: 'grid',
                  placeItems: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: '1px solid var(--mst-edge-control)',
                  bgcolor: chosen ? 'var(--mst-accent-solid)' : 'transparent',
                  color: chosen ? 'primary.contrastText' : 'var(--mst-ink)',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {LETTERS[index]}
              </Box>
            )}
            <Box
              component="span"
              sx={{
                flex: truth ? 'none' : 1,
                minWidth: 0,
                fontSize: truth ? 22 : 17,
                lineHeight: truth ? '28px' : '24px',
                fontWeight: truth ? 600 : 500,
                overflowWrap: 'break-word',
              }}
            >
              <MathTextDisplay text={text} />
            </Box>
            {chosen ? (
              <CheckCircleRounded aria-hidden="true" sx={{ flex: 'none', color: 'var(--mst-accent)' }} />
            ) : null}
          </ButtonBase>
        );
      })}
    </Box>
  );
}
