// Check answers before handing in (design.md §3.12; SP8, SP10): every question, Answered or Not answered (the empty ones
// first in mind, a tap away), then one Hand in, which asks in an in-app window: "You can't change your answers after."
// Area: quizzes

import { useState } from 'react';
import { Box, Button, ButtonBase, Paper, Typography } from '@mui/material';
import CheckRounded from '@mui/icons-material/CheckRounded';
import ConfirmDialog from '../shared/ConfirmDialog';
import BottomBar from './BottomBar';
import { PLAY } from './words';

// play: useHomeworkPlay()'s (its handIn() moves the page on); questions; mustAnswerAll: every answer is needed first;
// onOpen(index) goes to a question.
export default function CheckAnswers({ play, questions, mustAnswerAll, onOpen }) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const empty = questions.filter((question) => !play.answered(question)).length;
  const blocked = mustAnswerAll && empty > 0;
  const handIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await play.handIn();
    } catch (failure) {
      setError(failure.message);
      setBusy(false);
    }
  };
  return (
    <>
      <Typography
        component="h1"
        sx={{ fontFamily: 'var(--font-display)', fontSize: 24, lineHeight: '30px', fontWeight: 600, mb: 1 }}
      >
        {PLAY.checkAnswers}
      </Typography>
      <Typography sx={{ fontSize: 15, lineHeight: '24px', color: 'var(--mst-ink-2)', mb: 2 }}>
        {empty ? PLAY.emptyOnes(empty) : PLAY.allAnswered}
      </Typography>
      <Paper
        sx={{
          bgcolor: 'var(--mst-solid)',
          border: '1px solid var(--mst-edge)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
      >
        <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none' }}>
          {questions.map((question, index) => {
            const done = play.answered(question);
            return (
              <Box component="li" key={question.id} sx={{ borderTop: index ? '1px solid var(--mst-edge)' : 0 }}>
                <ButtonBase
                  onClick={() => onOpen(index)}
                  sx={{
                    width: '100%',
                    minHeight: 56,
                    px: 2,
                    gap: 1.5,
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                  }}
                >
                  <Box
                    component="span"
                    sx={{ width: 28, flex: 'none', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
                  >
                    {index + 1}
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: 14,
                      lineHeight: '20px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {question.question_text}
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                      fontSize: 12,
                      fontWeight: 600,
                      color: done ? 'var(--mst-ink-2)' : 'var(--mst-warn-ink)',
                    }}
                  >
                    {done ? <CheckRounded aria-hidden="true" sx={{ fontSize: 16 }} /> : null}
                    {done ? PLAY.answered : PLAY.notAnswered}
                  </Box>
                </ButtonBase>
              </Box>
            );
          })}
        </Box>
      </Paper>
      <BottomBar status={blocked ? PLAY.answerAll : null}>
        <Button
          fullWidth
          variant="contained"
          size="large"
          disabled={blocked || play.closed}
          onClick={() => setAsking(true)}
          data-mst="pupil-hand-in"
        >
          {PLAY.handIn}
        </Button>
      </BottomBar>
      <ConfirmDialog
        open={asking}
        title={PLAY.handInTitle}
        confirmLabel={PLAY.handIn}
        cancelLabel={PLAY.keepWorking}
        busy={busy}
        busyLabel={PLAY.handingIn}
        error={error}
        onCancel={() => setAsking(false)}
        onConfirm={handIn}
      >
        {PLAY.handInLine}
      </ConfirmDialog>
    </>
  );
}
