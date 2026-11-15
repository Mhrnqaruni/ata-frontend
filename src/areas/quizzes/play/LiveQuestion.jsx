// A live question on a pupil's phone (Phase 1.47 design.md §3.5; ST4–ST9, DR-6, SOT-1.1): its top, the AnswerPad and
// Send; once the server accepts it a calm "Sent" panel shows; a failed send keeps Try again; a choice goes at 1 s.
// Area: quizzes

import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button } from '@mui/material';
import { answerTimeMs, secondsLeft, sendOutcome } from '../live/liveClock';
import { useNow } from '../live/useNow';
import AnswerPad from './AnswerPad';
import BottomBar from './BottomBar';
import PupilTimer from './PupilTimer';
import QuestionTop from './QuestionTop';
import SentPanel from './SentPanel';
import { sendLiveAnswer } from './api';
import { rememberAnswer } from './place';
import { answerWords, pointsLine, ready, sendHint } from './playState';
import { PLAY } from './words';

const AUTO_SEND_MS = 1000; // DR-6: the server closes the question at zero, so the choice goes with about 1 s left

// question: the socket's; endsAt: on this device's clock; place: the pupil's place; sentBefore: the server or this tab
// already has an answer to it (after getting back in), with savedValue, the answer this tab sent; onSent(value).
export default function LiveQuestion({ question, endsAt, place, sentBefore, savedValue, onSent }) {
  const [choice, setChoice] = useState(savedValue ?? null);
  const [send, setSend] = useState(sentBefore ? 'sent' : 'idle'); // idle | sending | sent | failed | late
  const running = useRef(false);
  const autoTried = useRef(false);
  // The clock keeps counting after an answer goes, so the pupil sees how long the class has left.
  const now = useNow(true);
  const msLeft = endsAt - now;
  const seconds = secondsLeft(endsAt, now);
  const timeUp = msLeft <= 0;

  useEffect(() => {
    if (sentBefore) setSend('sent');
  }, [sentBefore]);

  const sendNow = useCallback(async () => {
    if (running.current || !ready(question, choice)) return;
    running.current = true;
    setSend('sending');
    const value = question.type === 'short_answer' ? choice.trim() : choice;
    try {
      const timeMs = answerTimeMs(question.time_limit_seconds, secondsLeft(endsAt));
      await sendLiveAnswer(place.session.id, place.guestToken, { questionId: question.id, answer: value, timeMs });
      rememberAnswer(place.roomCode, question.id, value);
      setSend('sent');
      onSent?.(value);
    } catch (error) {
      const outcome = sendOutcome(error.message);
      setSend(outcome);
      if (outcome === 'sent') onSent?.(value);
    } finally {
      running.current = false;
    }
  }, [question, choice, endsAt, place, onSent]);

  // DR-6: with about 1 s left, a chosen answer that hasn't gone is sent once by itself.
  const autoTime = msLeft <= AUTO_SEND_MS && msLeft > -AUTO_SEND_MS;
  useEffect(() => {
    if (!autoTime || autoTried.current || !(send === 'idle' || send === 'failed') || !ready(question, choice)) return;
    autoTried.current = true;
    sendNow();
  }, [autoTime, send, question, choice, sendNow]);

  const locked = send === 'sending' || send === 'sent' || send === 'late' || (timeUp && send === 'idle');
  const status = statusLine(send, timeUp, question, choice);
  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <QuestionTop
        number={question.order_index + 1}
        points={pointsLine(question)}
        aside={
          question.time_limit_seconds ? <PupilTimer seconds={seconds} limit={question.time_limit_seconds} /> : null
        }
        text={question.text}
        mediaUrl={question.media_url}
      />
      {send === 'sent' ? (
        <SentPanel answer={answerWords(question, choice)} />
      ) : (
        <AnswerPad
          question={question}
          value={choice}
          onChange={setChoice}
          disabled={locked}
          label={question.text}
          onEnter={sendNow}
        />
      )}
      {send === 'sent' ? null : (
        <BottomBar
          status={
            status ? (
              <Box
                component="span"
                sx={{
                  color: send === 'failed' ? 'var(--mst-bad-ink)' : 'inherit',
                  fontWeight: send === 'failed' ? 600 : 400,
                }}
              >
                {status}
              </Box>
            ) : null
          }
        >
          {send === 'failed' ? (
            <Button fullWidth size="large" variant="contained" onClick={sendNow}>
              {PLAY.tryAgain}
            </Button>
          ) : send === 'idle' || send === 'sending' ? (
            <Button
              fullWidth
              size="large"
              variant="contained"
              disabled={locked || !ready(question, choice)}
              onClick={sendNow}
              data-mst="pupil-send"
            >
              {send === 'sending' ? PLAY.sending : PLAY.send}
            </Button>
          ) : null}
        </BottomBar>
      )}
    </Box>
  );
}

// The line above Send: what happened to the answer, or, before a choice, what to do (by the question's type).
function statusLine(send, timeUp, question, choice) {
  if (send === 'failed') return PLAY.notSent;
  if (send === 'late') return PLAY.timeUp;
  if (timeUp && send === 'idle') return PLAY.noAnswerSent;
  return ready(question, choice) ? null : sendHint(question);
}
