// A quiz's questions one at a time (Phase 1.38 design §6.5): read with the child, press their answer, Check answer, the
// feedback in words, then the next question. The full quiz saves its place through `update`; a practice run its own.
// Area: family

import { useEffect, useRef, useState } from 'react';
import { Button, Typography } from '@mui/material';
import CheckRounded from '@mui/icons-material/CheckRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import LightbulbOutlined from '@mui/icons-material/LightbulbOutlined';
import MathText from '../MathText';
import { Prose, SaveNote, Steps, reduced } from './resultParts';

const letters = 'ABCD';

/** `draft` holds { answers, checked, index }, and `update(patch)` changes it. `saved` shows a save failure, if any. */
export default function QuizRunner({ questions, draft, update, busy, saveError, saved, childName, onFinish }) {
  const index = Math.min(draft.index || 0, questions.length - 1);
  const q = questions[index];
  const chosen = draft.answers[q.id];
  const checked = !!draft.checked?.[q.id];
  const last = index === questions.length - 1;
  const correct = checked && chosen === q.correctIndex;
  const [dir, setDir] = useState('none');
  const [hint, setHint] = useState(''); // the question whose hint is showing
  const feedback = useRef(null);
  const allAnswered = questions.every((item) => draft.answers[item.id] !== undefined);
  useEffect(() => {
    if (checked) feedback.current?.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' });
  }, [checked, q.id]);
  const go = (n) => {
    setDir(n > index ? 'next' : 'back');
    update({ index: n });
  };
  const choose = (i) => {
    if (!checked && !busy) update({ answers: { ...draft.answers, [q.id]: i }, practising: true });
  };
  const check = () => update({ checked: { ...(draft.checked || {}), [q.id]: true }, practising: true });
  return (
    <>
      <div className="fam-viewer-scroll">
        <div className="fam-col">
          <Steps count={questions.length} now={index} />
          <div key={q.id} className="fam-quiz-q" data-dir={dir}>
            <Typography className="fam-quiz-hint">
              Read the question with {childName}, then press {childName}’s answer.
            </Typography>
            <Typography component="h2" className="fam-quiz-text">
              <MathText text={q.text} />
            </Typography>
            <div className="fam-options" role="radiogroup" aria-label={`Answers for question ${index + 1}`}>
              {q.options.map((option, i) => {
                const state = checked
                  ? i === q.correctIndex
                    ? 'correct'
                    : i === chosen
                      ? 'wrong'
                      : 'idle'
                  : chosen === i
                    ? 'selected'
                    : 'idle';
                return (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={chosen === i}
                    className="fam-opt"
                    data-state={state}
                    disabled={checked || busy}
                    onClick={() => choose(i)}
                  >
                    <span className="fam-opt-badge" aria-hidden>
                      {state === 'correct' ? <CheckRounded /> : state === 'wrong' ? <CloseRounded /> : letters[i]}
                    </span>
                    <span className="fam-opt-text">
                      <MathText text={option} />
                    </span>
                    {/* A 20 px radio at the right until the answer is checked (§6.5): the chosen row reads as chosen. */}
                    {!checked && <span className="fam-opt-radio" aria-hidden />}
                    {state === 'selected' && <span className="fam-sr">{childName}’s answer</span>}
                    {state === 'correct' && (
                      <span className="fam-opt-note" data-tone="ok">
                        Right answer
                      </span>
                    )}
                    {state === 'wrong' && (
                      <span className="fam-opt-note" data-tone="warm">
                        {childName}’s answer
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {q.hint && !checked && (
              <>
                <Button
                  className="fam-hint-btn"
                  startIcon={<LightbulbOutlined />}
                  aria-expanded={hint === q.id}
                  onClick={() => setHint(hint === q.id ? '' : q.id)}
                >
                  {hint === q.id ? 'Hide the hint' : 'Show a hint'}
                </Button>
                {hint === q.id && (
                  <div className="fam-hint-text">
                    <Prose text={q.hint} />
                  </div>
                )}
              </>
            )}
            {checked && (
              <div ref={feedback} className="fam-feedback" data-tone={correct ? 'ok' : 'warm'} role="status">
                <Typography className="fam-feedback-title">{correct ? 'Right' : 'Not quite'}</Typography>
                {!correct && (
                  <Typography className="fam-feedback-answer">
                    The right answer is <MathText text={q.options[q.correctIndex]} />.
                  </Typography>
                )}
                <Prose text={q.explanation} />
              </div>
            )}
            {saved?.error && <SaveNote saved={saved} />}
            {saveError && <Typography className="fam-save-note">{saveError}</Typography>}
          </div>
        </div>
      </div>
      <footer className="fam-viewer-foot" data-col="680">
        {/* "Previous question", not "Back": a tester read Back as "leave the quiz" (§6.5). */}
        <Button
          onClick={() => go(index - 1)}
          disabled={index === 0 || busy}
          className="fam-back"
          data-hide={index === 0}
        >
          Previous question
        </Button>
        <span className="fam-grow" />
        {!checked ? (
          <Button variant="contained" disabled={chosen === undefined || busy} onClick={check}>
            Check answer
          </Button>
        ) : last ? (
          <Button variant="contained" disabled={busy || !allAnswered} onClick={onFinish}>
            {busy ? 'Saving…' : 'See the result'}
          </Button>
        ) : (
          <Button variant="contained" disabled={busy} endIcon={<ArrowForwardRounded />} onClick={() => go(index + 1)}>
            Next question
          </Button>
        )}
      </footer>
    </>
  );
}
