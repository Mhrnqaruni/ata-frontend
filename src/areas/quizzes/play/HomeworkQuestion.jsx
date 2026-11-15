// One homework question on a phone (Phase 1.47 design.md §3.5; SP6, SP7): the live top and AnswerPad, "Saved ✓
// · you can change it until you hand in" in the bar, and a small Back beside a big Next (Check answers on the last).
// Area: quizzes

import { Box, Button } from '@mui/material';
import AnswerPad from './AnswerPad';
import BottomBar from './BottomBar';
import QuestionTop from './QuestionTop';
import { pointsLine } from './playState';
import { PLAY } from './words';

const SAVED_LINE = { saving: PLAY.saving, saved: PLAY.saved, earlier: PLAY.savedEarlier, failed: PLAY.notSaved };

// play: useHomeworkPlay()'s; question and total; back: Back is allowed; onCheck opens Check answers; due: its line;
// scoreShown: the run shows pupils their score, so the points line shows (C10).
export default function HomeworkQuestion({ play, question, total, back, onCheck, due, scoreShown = true }) {
  const id = String(question.id);
  const state = play.saved[id];
  const last = play.index >= total - 1;
  // The homework question list names its type question_type; the live screen's parts read type.
  const asLive = { ...question, type: question.question_type };
  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <QuestionTop
        number={play.index + 1}
        total={total}
        points={pointsLine(asLive, { scoreShown })}
        note={due}
        aside={
          <Button size="small" onClick={onCheck} sx={{ minWidth: 0, minHeight: 40, flex: 'none' }}>
            {PLAY.allQuestions}
          </Button>
        }
        text={question.question_text}
        mediaUrl={question.media_url}
      />
      <AnswerPad
        question={asLive}
        value={play.answers[id] ?? null}
        onChange={(value) => play.choose(question, value)}
        disabled={play.closed}
        label={question.question_text}
      />
      <BottomBar
        small={state !== 'failed'}
        status={
          state === 'failed' ? (
            <Box component="span" sx={{ color: 'var(--mst-bad-ink)', fontWeight: 600 }}>
              {play.closed ? PLAY.closedNow : PLAY.notSaved}
            </Box>
          ) : (
            SAVED_LINE[state] || null
          )
        }
      >
        {back && play.index > 0 ? (
          <Button variant="outlined" size="large" onClick={() => play.setIndex(play.index - 1)}>
            {PLAY.previous}
          </Button>
        ) : null}
        {state === 'failed' && !play.closed ? (
          <Button
            variant="contained"
            size="large"
            sx={{ flex: 1 }}
            onClick={() => play.save(question, play.answers[id])}
          >
            {PLAY.tryAgain}
          </Button>
        ) : (
          <Button
            variant="contained"
            size="large"
            sx={{ flex: 1 }}
            onClick={() => (last ? onCheck() : play.setIndex(play.index + 1))}
          >
            {last ? PLAY.checkAnswers : PLAY.next}
          </Button>
        )}
      </BottomBar>
    </Box>
  );
}
