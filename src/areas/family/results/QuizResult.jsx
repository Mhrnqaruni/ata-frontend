// A quiz at full screen: its questions, then the score and each answer once the attempt is recorded, and a practice
// of just the missed questions (Phase 1.37 S4.3; Phase 1.38 design §6.5: a bar, not a ring, and one score).
// Area: family

import { useEffect, useRef, useState } from 'react';
import { Button, CircularProgress, Collapse, Typography } from '@mui/material';
import CheckRounded from '@mui/icons-material/CheckRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import ReplayRounded from '@mui/icons-material/ReplayRounded';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import { queryClient } from '../../../services/queryCache';
import MathText from '../MathText';
import { forChild } from '../familyWords';
import { whenLabel } from '../whenLabel';
import useActivityProgress from '../useActivityProgress';
import useDialogParam from '../useDialogParam';
import QuizRunner from './QuizRunner';
import { NextStep, Prose, SaveNote } from './resultParts';

const freshDraft = (practising) => ({ answers: {}, checked: {}, index: 0, attemptId: crypto.randomUUID(), practising });

/** The questions an attempt got wrong, in the quiz's order: what "Practise the missed questions" asks (B17.4). */
export function missedQuestions(questions, attempt) {
  return questions.filter((question) => attempt?.answers?.[question.id] !== question.correctIndex);
}

/**
 * Loads saved progress, then shows the question runner, or the result once the parent has recorded the attempt.
 * `advanced` is the frame's Advanced disclosure, shown at the end of the result; `backLabel` and `onClose` its back.
 */
export default function Quiz({
  activity,
  result,
  childName,
  onRecord,
  busy,
  attempts,
  draftKey,
  saveError,
  onAsk,
  onNewVersion,
  onProgress,
  advanced = null,
}) {
  const saved = useActivityProgress(activity, freshDraft(false));
  const draft = saved.value;
  const update = (patch) => {
    saved.update(patch);
    queryClient.setQueryData(draftKey, { ...draft, ...patch });
  };
  // A fresh try asked for elsewhere starts once the saved place has loaded. This runs after each render, and acts once.
  const restart = useRef(queryClient.getQueryData(draftKey)?.restartRequested);
  useEffect(() => {
    if (saved.ready && restart.current) {
      restart.current = false;
      update(freshDraft(true));
    }
  });
  // Practising the missed questions keeps its answers in the page: the server keeps one saved place per quiz and
  // records only whole attempts (B17.4), so neither hears of it. Its own history entry lets Back end it.
  const [practising, openPractice, closePractice] = useDialogParam('missed');
  const [run, setRun] = useState(null);
  // A run in the address when the quiz opens is left from before a reload, with nothing to show: drop it, once.
  const leftOver = useRef(practising);
  useEffect(() => {
    if (!leftOver.current) return;
    leftOver.current = false;
    closePractice();
  });
  const questions = result.questions;
  const recorded = attempts.filter((row) => row.activityId === activity.id);
  const shownAttempt = recorded.find((row) => row.id === draft.finishedAttempt) || recorded[0];
  const showResult = !draft.practising && recorded.length > 0;
  const inRun = showResult && practising && run;
  async function finish() {
    const id = draft.attemptId;
    if (await onRecord(id, draft.answers)) update({ ...freshDraft(false), finishedAttempt: id });
  }
  const runnerIndex = Math.min(draft.index || 0, (questions?.length || 1) - 1);
  let progress = '';
  if (saved.ready && inRun && !run.done) {
    progress = `Question ${Math.min(run.draft.index || 0, run.questions.length - 1) + 1} of ${run.questions.length}`;
  } else if (saved.ready && !showResult) progress = `Question ${runnerIndex + 1} of ${questions.length}`;
  useEffect(() => {
    onProgress(progress);
    return () => onProgress('');
  }, [onProgress, progress]);
  if (!saved.ready)
    return (
      <div className="fam-viewer-scroll fam-centre">
        {saved.error ? <SaveNote saved={saved} /> : <CircularProgress aria-label="Loading the quiz" />}
      </div>
    );
  if (showResult && draft.finishedAttempt && !recorded.some((row) => row.id === draft.finishedAttempt))
    return (
      <div className="fam-viewer-scroll fam-centre">
        <CircularProgress aria-label="Saving the result" />
      </div>
    );
  if (inRun)
    return run.done ? (
      <MissedEnd run={run} onBack={closePractice} />
    ) : (
      <QuizRunner
        questions={run.questions}
        draft={run.draft}
        update={(patch) => setRun((current) => ({ ...current, draft: { ...current.draft, ...patch } }))}
        busy={false}
        childName={childName}
        onFinish={() => setRun((current) => ({ ...current, done: true }))}
      />
    );
  if (showResult) {
    const missed = missedQuestions(questions, shownAttempt);
    return (
      <QuizResult
        attempt={shownAttempt}
        earlier={recorded.filter((row) => row.id !== shownAttempt.id)}
        questions={questions}
        childName={childName}
        nextStep={result.nextStep}
        busy={busy || !!saved.error}
        missed={missed.length}
        onPractise={() => {
          setRun({ questions: missed, draft: { answers: {}, checked: {}, index: 0 }, done: false });
          openPractice();
        }}
        onNewVersion={onNewVersion}
        onAsk={() => onAsk?.(activity.title)}
        onRetry={() => update(freshDraft(true))}
        advanced={advanced}
      />
    );
  }
  return (
    <QuizRunner
      questions={questions}
      draft={draft}
      update={update}
      busy={busy || !!saved.error}
      saveError={saveError}
      saved={saved}
      childName={childName}
      onFinish={finish}
    />
  );
}

// The end of a missed-questions practice: how many are right now. It records nothing, so the quiz's score stays.
function MissedEnd({ run, onBack }) {
  const right = run.questions.filter((question) => run.draft.answers[question.id] === question.correctIndex).length;
  return (
    <>
      <div className="fam-viewer-scroll">
        <div className="fam-col">
          <section className="fam-end mst-g1 mst-rim" role="status">
            <Typography component="h2" className="fam-end-title">
              {right} of {run.questions.length} right now
            </Typography>
            <Typography className="fam-end-sub">Practice only, so the quiz’s saved score stays the same.</Typography>
          </section>
        </div>
      </div>
      <footer className="fam-viewer-foot">
        <span className="fam-grow" />
        <Button variant="contained" onClick={onBack} data-mst="family-practise-back">
          Back to results
        </Button>
      </footer>
    </>
  );
}

// The day of an earlier try, as "today", "yesterday" or "28 Oct", for "Last time (28 Oct): 3 of 5".
const dayOf = (iso) => {
  const label = iso ? whenLabel(iso) : '';
  return label ? (label[0].toLowerCase() + label.slice(1)).replace(/ at \d\d:\d\d$/, '') : '';
};

// The score in one place (design §6.5): a word, "4 of 5 right", a bar of one segment per question and the last try.
// Then each answer, with Why? on the wrong ones, the next step (where new questions are offered) and Advanced; the
// bar at the bottom holds Try all again and Practise the missed questions. The frame's Close is the one exit (§6.4).
function QuizResult({
  attempt,
  earlier,
  questions,
  childName,
  nextStep,
  busy,
  missed,
  onPractise,
  onRetry,
  onNewVersion,
  onAsk,
  advanced,
}) {
  const ratio = attempt.total ? attempt.score / attempt.total : 0;
  const headline = ratio === 1 ? 'Brilliant' : ratio >= 0.5 ? 'Good work' : 'Worth another go';
  const marks = questions.map((q) => attempt.answers?.[q.id] === q.correctIndex);
  const right = marks.filter(Boolean).length;
  const [open, setOpen] = useState(null);
  const lastDay = earlier.length > 0 ? dayOf(earlier[0].createdAt) : '';
  // New questions ask first and use AI, so they're a link in words, not a third "go again" button (§6.5).
  const newLink = (
    <p className="fam-tip-more">
      Want different questions?{' '}
      <Button
        size="small"
        className="fam-tip-link"
        disabled={busy}
        onClick={onNewVersion}
        startIcon={<AutoAwesomeRounded />}
        data-mst="family-quiz-new"
      >
        Make {questions.length} new ones
      </Button>
    </p>
  );
  return (
    <>
      <div className="fam-viewer-scroll">
        <div className="fam-result">
          <section className="fam-score mst-g1 mst-rim">
            <Typography className="fam-score-title">{headline}</Typography>
            <Typography component="h2" className="fam-score-num">
              {attempt.score} of {attempt.total} right
            </Typography>
            {marks.length > 0 && (
              <div className="fam-segs" role="img" aria-label={`${right} right, ${marks.length - right} not right`}>
                {marks.map((ok, i) => (
                  <span key={questions[i].id} data-ok={ok} />
                ))}
              </div>
            )}
            {earlier.length > 0 && (
              <Typography className="fam-score-last">
                Last time{lastDay ? ` (${lastDay})` : ''}: {earlier[0].score} of {earlier[0].total}
              </Typography>
            )}
          </section>
          <div className="fam-result-list">
            {questions.length > 0 && (
              <ol className="fam-qrows mst-g1 mst-rim" aria-label="Each question">
                {questions.map((q, i) => {
                  const answer = attempt.answers?.[q.id];
                  const ok = marks[i];
                  const expanded = open === q.id;
                  return (
                    <li key={q.id} className="fam-qrow" data-ok={ok}>
                      <span className="fam-qrow-mark" role="img" aria-label={ok ? 'Right' : 'Not right'}>
                        {ok ? <CheckRounded /> : <CloseRounded />}
                      </span>
                      <div className="fam-qrow-body">
                        <div className="fam-qrow-q">
                          <MathText text={q.text} />
                        </div>
                        <div className="fam-qrow-a">
                          {childName} answered <MathText text={q.options[answer] ?? '—'} />
                          {!ok && (
                            <>
                              {' '}
                              · The right answer is <MathText text={q.options[q.correctIndex]} />
                            </>
                          )}
                        </div>
                        <Collapse in={expanded} unmountOnExit>
                          <Prose text={q.explanation} />
                        </Collapse>
                      </div>
                      {!ok && (
                        <Button
                          size="small"
                          className="fam-qrow-why"
                          aria-expanded={expanded}
                          onClick={() => setOpen(expanded ? null : q.id)}
                        >
                          Why?
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
            {ratio === 1 ? (
              <section className="fam-tip">
                <AutoAwesomeRounded className="fam-tip-icon" aria-hidden />
                <div className="fam-tip-body">
                  <Typography className="fam-tip-title">Ready for a harder one?</Typography>
                  <Typography>
                    Every answer in this practice was correct. You can try new questions at a harder level.
                  </Typography>
                  {newLink}
                </div>
              </section>
            ) : (
              <NextStep
                text={nextStep ? forChild(nextStep, childName) : ''}
                onAsk={nextStep ? onAsk : undefined}
                extra={newLink}
              />
            )}
            {advanced}
          </div>
        </div>
      </div>
      <footer className="fam-viewer-foot" data-col="680" data-layout="result">
        <span className="fam-grow" />
        <Button
          variant={missed > 0 ? 'outlined' : 'contained'}
          disabled={busy}
          onClick={onRetry}
          startIcon={<ReplayRounded />}
          data-mst="family-quiz-retry"
        >
          Try all {questions.length} again
        </Button>
        {missed > 0 && (
          <Button variant="contained" onClick={onPractise} data-mst="family-practise-missed">
            {missed === 1 ? 'Practise the missed question' : `Practise the ${missed} missed questions`}
          </Button>
        )}
      </footer>
    </>
  );
}
