import React, { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Collapse, Typography, useMediaQuery } from '@mui/material';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import ReplayRounded from '@mui/icons-material/ReplayRounded';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import LightbulbOutlined from '@mui/icons-material/LightbulbOutlined';
import ChatBubbleOutlineRounded from '@mui/icons-material/ChatBubbleOutlineRounded';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '../../services/queryCache';
import MathText from '../../components/common/MathTextDisplay';
import { forChild, ukDate } from './familyWords';
import useActivityProgress from './useActivityProgress';
import FamilyMindMap from './FamilyMindMap';
import FamilyHomework from './FamilyHomework';

const letters = 'ABCD';
const Prose = ({ text }) => <Box className="fam-prose"><MathText text={text} /></Box>;
const freshDraft = practising => ({ answers: {}, checked: {}, index: 0, attemptId: crypto.randomUUID(), practising });
const reduced = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };

/** One activity, full screen. Quiz practice is parent-recorded; generated work is not completion. */
export default function FamilyResult({ activity, childName, onRecord, busy, attempts = [], draftKey, saveError,
  onAsk, onMakeQuiz, onNewVersion, onClose, onProgress = () => {}, onExplain, onHeaderAction, base, sourceFiles = [] }) {
  const result = activity.result;
  if (!result) return null;
  if (activity.kind === 'quiz' && result.questions?.length > 0)
    return <Quiz activity={activity} result={result} childName={childName} onRecord={onRecord} busy={busy} attempts={attempts}
      draftKey={draftKey} saveError={saveError} onAsk={onAsk} onNewVersion={onNewVersion} onClose={onClose} onProgress={onProgress} />;
  if (activity.kind === 'check' && !result.needsInformation && result.checks?.length)
    return <FamilyHomework activity={activity} result={result} childName={childName} base={base} sourceFiles={sourceFiles} busy={busy}
      onExplain={onExplain || (text => onAsk?.(text))} onMakeQuiz={onMakeQuiz} onClose={onClose} onHeaderAction={onHeaderAction} />;
  if (activity.kind === 'mindmap' && !result.needsInformation && result.mindmap?.length) return <>
    <div className="fam-mm-wrap"><FamilyMindMap title={result.title || activity.title} overview={result.explanation} branches={result.mindmap}
      nextStep={forChild(result.nextStep, childName)} onAsk={onAsk} /></div>
    <footer className="fam-viewer-foot" data-wide="true" data-layout="result">
      <Button onClick={onClose}>Back to notebook</Button>
      <span className="fam-grow" />
      <Button variant="outlined" disabled={busy} onClick={onNewVersion} startIcon={<ReplayRounded />}>New map</Button>
      <Button variant="contained" disabled={busy} onClick={onMakeQuiz} startIcon={<AutoAwesomeRounded />}>Practise with a quiz</Button>
    </footer>
  </>;
  const tip = result.nextStep ? <NextStep text={forChild(result.nextStep, childName)} onAsk={() => onAsk?.(activity.title)} /> : null;
  if (activity.kind === 'flashcards' && !result.needsInformation && result.cards?.length)
    return <Flashcards activity={activity} cards={result.cards} end={tip} onProgress={onProgress} onQuiz={onMakeQuiz} onNewVersion={onNewVersion} busy={busy} />;
  if (activity.kind === 'story' && !result.needsInformation && result.story?.length)
    return <Story activity={activity} sections={result.story} end={tip} onProgress={onProgress} onQuiz={onMakeQuiz} onNewVersion={onNewVersion} busy={busy} />;
  return <>
    <div className="fam-viewer-scroll"><div className="fam-read">
      {result.needsInformation && <Alert severity="warning">{result.message}</Alert>}
      {activity.kind === 'mindmap' && <MindMap title={result.title} branches={result.mindmap || []} onAsk={onAsk} />}
      {activity.kind === 'check' && !result.needsInformation && <><WorkCheck checks={result.checks || []} childName={childName} />{tip}</>}
      {result.references?.length > 0 && <Typography className="fam-small">From {result.references.map(ref => `${sourceFiles[ref.fileNumber - 1]?.name || `file ${ref.fileNumber}`}, page ${ref.page}`).join(' · ')}</Typography>}
    </div></div>
    <footer className="fam-viewer-foot" data-layout="result">
      <Button onClick={onClose}>Back to notebook</Button>
      <span className="fam-grow" />
      {activity.kind !== 'check' && <Button variant="outlined" disabled={busy} onClick={onNewVersion} startIcon={<ReplayRounded />}>{{ flashcards: 'New cards', mindmap: 'New map', story: 'New story' }[activity.kind] || 'Make a new one'}</Button>}
      {!result.needsInformation && <Button variant="contained" disabled={busy} onClick={onMakeQuiz} startIcon={<AutoAwesomeRounded />}>Practise with a quiz</Button>}
    </footer>
  </>;
}

function NextStep({ text, onAsk }) {
  return <section className="fam-tip">
    <LightbulbOutlined className="fam-tip-icon" aria-hidden />
    <div className="fam-tip-body"><Typography className="fam-tip-title">Next step</Typography><Prose text={text} />
      {onAsk && <Button size="small" startIcon={<ChatBubbleOutlineRounded />} onClick={onAsk} className="fam-tip-action">Ask about this</Button>}</div>
  </section>;
}

function Quiz({ activity, result, childName, onRecord, busy, attempts, draftKey, saveError, onAsk, onNewVersion, onClose, onProgress }) {
  const saved=useActivityProgress(activity,freshDraft(false));
  const draft=saved.value;
  const update=patch=>{saved.update(patch);queryClient.setQueryData(draftKey,{...draft,...patch})};
  const restart=useRef(queryClient.getQueryData(draftKey)?.restartRequested);
  useEffect(()=>{if(saved.ready&&restart.current){restart.current=false;update(freshDraft(true))}},[saved.ready]);
  const questions = result.questions;
  const recorded = attempts.filter(row => row.activityId === activity.id);
  const shownAttempt = recorded.find(row => row.id === draft.finishedAttempt) || recorded[0];
  const showResult = !draft.practising && recorded.length > 0;
  async function finish() {
    const id = draft.attemptId;
    if (await onRecord(id, draft.answers)) update({ ...freshDraft(false), finishedAttempt: id });
  }
  const runnerIndex = Math.min(draft.index || 0, (result.questions?.length || 1) - 1);
  const showingResult = !draft.practising && recorded.length > 0;
  useEffect(() => { onProgress(showingResult || !saved.ready ? '' : `Question ${runnerIndex + 1} of ${result.questions.length}`); }, [showingResult, saved.ready, runnerIndex]);
  useEffect(() => () => onProgress(''), []);
  if(!saved.ready)return <div className="fam-viewer-scroll fam-centre">{saved.error?<SaveNote saved={saved} />:<CircularProgress aria-label="Loading the quiz"/>}</div>;
  if (showResult && draft.finishedAttempt && !recorded.some(row => row.id === draft.finishedAttempt))
    return <div className="fam-viewer-scroll fam-centre"><CircularProgress aria-label="Saving the result" /></div>;
  if (showResult) return <QuizResult attempt={shownAttempt} earlier={recorded.filter(row => row.id !== shownAttempt.id)} questions={questions}
    childName={childName} nextStep={result.nextStep} busy={busy||!!saved.error} onClose={onClose} onNewVersion={onNewVersion}
    onAsk={() => onAsk?.(activity.title)} onRetry={() => update(freshDraft(true))} />;
  return <QuizRunner questions={questions} draft={draft} update={update} busy={busy||!!saved.error} saveError={saveError} saved={saved} childName={childName} onFinish={finish} />;
}

function QuizRunner({ questions, draft, update, busy, saveError, saved, childName, onFinish }) {
  const index = Math.min(draft.index || 0, questions.length - 1);
  const q = questions[index];
  const chosen = draft.answers[q.id];
  const checked = !!draft.checked?.[q.id];
  const last = index === questions.length - 1;
  const correct = checked && chosen === q.correctIndex;
  const [dir, setDir] = useState('none');
  const feedback = useRef(null);
  const allAnswered = questions.every(item => draft.answers[item.id] !== undefined);
  useEffect(() => { if (checked) feedback.current?.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' }); }, [checked, q.id]);
  const go = n => { setDir(n > index ? 'next' : 'back'); update({ index: n }); };
  const choose = i => { if (!checked && !busy) update({ answers: { ...draft.answers, [q.id]: i }, practising: true }); };
  const check = () => update({ checked: { ...(draft.checked || {}), [q.id]: true }, practising: true });
  return <>
    <div className="fam-quiz-progress">
      <div className="fam-steps" aria-hidden>{questions.map((item, i) => <span key={item.id}
        data-state={draft.checked?.[item.id] ? (draft.answers[item.id] === item.correctIndex ? 'ok' : 'miss') : i === index ? 'now' : 'todo'} />)}</div>
    </div>
    <div className="fam-viewer-scroll">
      <div key={q.id} className="fam-quiz-q" data-dir={dir}>
        {index === 0 && <Typography className="fam-quiz-hint">Read each question with {childName} and tap their answer.</Typography>}
        <Typography component="h2" className="fam-quiz-text"><MathText text={q.text} /></Typography>
        <div className="fam-options" role="radiogroup" aria-label={`Answers for question ${index + 1}`}>
          {q.options.map((option, i) => {
            const state = checked ? (i === q.correctIndex ? 'correct' : i === chosen ? 'wrong' : 'idle') : chosen === i ? 'selected' : 'idle';
            return <button key={i} type="button" role="radio" aria-checked={chosen === i} className="fam-opt" data-state={state}
              disabled={checked || busy} onClick={() => choose(i)}>
              <span className="fam-opt-badge" aria-hidden>{state === 'correct' ? <CheckRounded /> : state === 'wrong' ? <CloseRounded /> : letters[i]}</span>
              <span className="fam-opt-text"><MathText text={option} /></span>
              {state === 'selected' && <CheckRounded className="fam-opt-tick" aria-hidden />}
              {state === 'correct' && <span className="fam-opt-note" data-tone="ok">Right answer</span>}
              {state === 'wrong' && <span className="fam-opt-note" data-tone="warm">Your answer</span>}
            </button>;
          })}
        </div>
        {q.hint&&!checked&&<details className="fam-tip"><summary>Give me a hint</summary><Prose text={q.hint}/></details>}
        {checked && <div ref={feedback} className="fam-feedback" data-tone={correct ? 'ok' : 'warm'} role="status">
          <Typography className="fam-feedback-title">{correct ? 'Well done!' : 'Not quite.'}</Typography>
          <Prose text={q.explanation} />
        </div>}
        {saved?.error && <SaveNote saved={saved} />}
        {saveError && <Typography className="fam-save-note">{saveError}</Typography>}
      </div>
    </div>
    <footer className="fam-viewer-foot">
      <Button onClick={() => go(index - 1)} disabled={index === 0 || busy} startIcon={<ArrowBackRounded />} className="fam-back" data-hide={index === 0}>Previous question</Button>
      <span className="fam-grow" />
      {!checked ? <Button variant="contained" size="large" disabled={chosen === undefined || busy} onClick={check}>Check answer</Button>
        : last ? <Button variant="contained" size="large" disabled={busy || !allAnswered} onClick={onFinish}>{busy ? 'Saving…' : 'See results'}</Button>
        : <Button variant="contained" size="large" disabled={busy} endIcon={<ArrowForwardRounded />} onClick={() => go(index + 1)}>Next question</Button>}
    </footer>
  </>;
}

function useCountUp(target) {
  const [value, setValue] = useState(() => (reduced() ? target : 0));
  useEffect(() => {
    if (reduced()) { setValue(target); return undefined; }
    let frame; const start = performance.now();
    const tick = now => { const t = Math.min(1, (now - start) / 700); setValue(Math.round(target * (1 - (1 - t) ** 3))); if (t < 1) frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame);
  }, [target]);
  return value;
}

function QuizResult({ attempt, earlier, questions, childName, nextStep, busy, onRetry, onNewVersion, onAsk, onClose }) {
  const ratio = attempt.total ? attempt.score / attempt.total : 0;
  const tone = ratio === 1 ? 'ok' : ratio >= 0.5 ? 'brand' : 'warm';
  const headline = ratio === 1 ? 'Brilliant!' : ratio >= 0.5 ? 'Good work!' : 'Let’s practise this together';
  const sub = `${childName} got ${attempt.score} out of ${attempt.total}.`;
  const shown = useCountUp(attempt.score);
  const [ring, setRing] = useState(reduced() ? ratio : 0);
  useEffect(() => { const t = requestAnimationFrame(() => setRing(ratio)); return () => cancelAnimationFrame(t); }, [ratio]);
  const [open, setOpen] = useState(null);
  const wide = useMediaQuery('(min-width:1000px)');
  const rows = questions;
  const right = questions.filter(q => attempt.answers?.[q.id] === q.correctIndex).length;
  const C = 2 * Math.PI * 52;
  const actions = <>
      {ratio === 1 ? <>
        <Button variant="outlined" disabled={busy} onClick={onRetry} startIcon={<ReplayRounded />}>Try again</Button>
        <Button variant="contained" size="large" disabled={busy} onClick={onNewVersion} startIcon={<AutoAwesomeRounded />}>New questions</Button></>
      : <>
        <Button variant="outlined" disabled={busy} onClick={onNewVersion} startIcon={<AutoAwesomeRounded />} title="Makes a fresh set of questions">New questions</Button>
        <Button variant="contained" size="large" disabled={busy} onClick={onRetry} startIcon={<ReplayRounded />}>Try again</Button></>}
      </>;

  return <>
    <div className="fam-viewer-scroll"><div className="fam-result">
      <section className="fam-score" data-tone={tone}>
        <div className="fam-ring" role="img" aria-label={`${attempt.score} out of ${attempt.total} correct`}>
          <svg viewBox="0 0 120 120" aria-hidden><circle cx="60" cy="60" r="52" className="fam-ring-track" />
            <circle cx="60" cy="60" r="52" className="fam-ring-fill" strokeDasharray={C} strokeDashoffset={C * (1 - ring)} /></svg>
          <span className="fam-ring-num" aria-hidden>{shown}<small>of {attempt.total}</small></span>
        </div>
        <div><Typography component="h2" className="fam-score-title">{headline}</Typography>
          <Typography className="fam-score-sub">{sub}</Typography>
          <Typography className="fam-small">Saved · {ukDate(attempt.createdAt)}</Typography>
          {earlier.length > 0 && <Typography className="fam-small">Last time: {earlier[0].score} of {earlier[0].total}</Typography>}</div>
      </section>
      <div className="fam-result-list">
      {rows.length > 0 && <ol className="fam-rows" aria-label="Each question">
        {rows.map((q, i) => {
          const answer = attempt.answers?.[q.id]; const ok = answer === q.correctIndex; const expanded = open === q.id;
          return <li key={q.id} className="fam-row" data-ok={ok} style={{ '--i': i }}>
            <span className="fam-row-icon" aria-label={ok ? 'Right' : 'Wrong'}>{ok ? <CheckRounded /> : <CloseRounded />}</span>
            <div className="fam-row-body">
              <div className="fam-row-q" data-open={expanded}><MathText text={q.text} /></div>
              <div className="fam-row-a">Answered <b><MathText text={q.options[answer] ?? '—'} /></b>
                {!ok && <> · Right answer <b><MathText text={q.options[q.correctIndex]} /></b></>}</div>
              <Collapse in={expanded} unmountOnExit><Prose text={q.explanation} /></Collapse>
            </div>
            <Button size="small" className="fam-row-why" aria-expanded={expanded} endIcon={<ExpandMoreRounded className="fam-chev" data-open={expanded} />}
              onClick={() => setOpen(expanded ? null : q.id)}>Why?</Button>
          </li>;
        })}
      </ol>}

      {ratio === 1 ? <section className="fam-tip"><AutoAwesomeRounded className="fam-tip-icon" aria-hidden /><div className="fam-tip-body">
          <Typography className="fam-tip-title">Ready for a harder one?</Typography><Typography>Every answer in this practice was correct. You can try new questions at a harder level.</Typography></div></section>
        : nextStep && <NextStep text={forChild(nextStep, childName)} onAsk={onAsk} />}
      {wide && <div className="fam-result-actions">{actions}</div>}
      </div>
    </div></div>
    {!wide && <footer className="fam-viewer-foot" data-wide="true" data-layout="result">{actions}</footer>}
  </>;
}

function Flashcards({ cards, activity, end, onProgress, onQuiz, onNewVersion, busy }) {
  const saved = useActivityProgress(activity, { index: 0, ratings: {}, finished: false });
  const [flipped, setFlipped] = useState(false);
  const ids = cards.map((c, i) => c.id || `c${i + 1}`), order = saved.value.order || ids;
  const i = Math.min(saved.value.index || 0, order.length - 1), card = cards[ids.indexOf(order[i])];
  const ratings = saved.value.ratings || {}, missed = ids.filter(id => ratings[id] === 'practise');
  useEffect(() => { onProgress(!saved.ready || saved.value.finished ? '' : `Card ${i + 1} of ${order.length}`); }, [saved.ready, saved.value.finished, i, order.length]);
  useEffect(() => () => onProgress(''), []);
  if (!saved.ready) return <div className="fam-viewer-scroll fam-centre">{saved.error ? <SaveNote saved={saved} /> : <CircularProgress aria-label="Loading the cards" />}</div>;
  if (!card) return null;
  const off = !!saved.error;
  const move = n => { setFlipped(false); saved.update({ index: n }); };
  const rate = value => { setFlipped(false); saved.update({ ratings: { ...ratings, [order[i]]: value }, index: i < order.length - 1 ? i + 1 : i, finished: i === order.length - 1 }); };
  if (saved.value.finished) return <>
    <div className="fam-viewer-scroll"><div className="fam-read"><section className="fam-cards fam-done">
      <Typography component="h2" className="fam-h">{missed.length ? 'All cards done' : 'Well done!'}</Typography>
      <Typography className="fam-done-sub">{ids.length - missed.length} got it{missed.length ? ` · ${missed.length} not yet` : ''}</Typography>
      <div className="fam-cards-nav fam-cards-nav-c"><Button disabled={off} onClick={() => saved.update({ order: ids, index: 0, finished: false })}>Start over</Button>
        {!missed.length && <Button disabled={busy} onClick={onNewVersion} startIcon={<ReplayRounded />}>New cards</Button>}</div>
      {off && <SaveNote saved={saved} />}
      {end}
    </section></div></div>
    <footer className="fam-viewer-foot"><span className="fam-grow" />
      {missed.length > 0 ? <Button variant="contained" size="large" disabled={off} onClick={() => saved.update({ order: missed, index: 0, finished: false })}>Practise {missed.length} card{missed.length === 1 ? '' : 's'} again</Button>
        : <Button variant="contained" size="large" disabled={busy} onClick={onQuiz} startIcon={<AutoAwesomeRounded />}>Practise with a quiz</Button>}</footer>
  </>;
  return <>
    <div className="fam-viewer-scroll"><div className="fam-read"><section className="fam-cards">
      <button type="button" className="fam-flip" data-flipped={flipped} onClick={() => setFlipped(!flipped)} aria-label={flipped ? 'Show the question' : 'Show the answer'}>
        <span className="fam-flip-inner"><span className="fam-flip-face fam-flip-front" aria-hidden={flipped}><MathText text={card.front} /></span>
          <span className="fam-flip-face fam-flip-back" aria-hidden={!flipped}><span className="fam-flip-q"><MathText text={card.front} /></span><MathText text={card.back} /></span></span>
      </button>
      {flipped && card.explanation && <Prose text={card.explanation} />}
      {off && <SaveNote saved={saved} />}
    </section></div></div>
    <footer className="fam-viewer-foot">
      {flipped ? <><Button variant="outlined" size="large" disabled={off} onClick={() => rate('practise')}>Not yet</Button><span className="fam-grow" />
        <Button variant="contained" size="large" disabled={off} onClick={() => rate('got_it')}>Got it</Button></>
        : <><Button className="fam-back" data-hide={i === 0} disabled={i === 0 || off} onClick={() => move(i - 1)} startIcon={<ArrowBackRounded />}>Back</Button><span className="fam-grow" />
          <Button variant="contained" size="large" onClick={() => setFlipped(true)}>Show answer</Button></>}
    </footer>
  </>;
}

/** Saving is silent; only a failure is shown, as one calm line. */
function SaveNote({ saved, text }) {
  return <Typography component="div" className="fam-save-note" role="status">{saved?.error || text}
    {saved?.error && (saved.conflict ? <Button size="small" onClick={saved.reload}>Show latest</Button> : <Button size="small" onClick={saved.retry}>Try again</Button>)}</Typography>;
}

function MindMap({ title, branches, onAsk }) {
  return <section className="fam-map">
    <div className="fam-map-centre">{title}</div>
    <div className="fam-map-grid">{branches.map(branch => <article key={branch.id} className="fam-branch">
      <Typography component="h3" className="fam-branch-title">{branch.label}</Typography>
      <Prose text={branch.explanation} />
      {branch.children.length > 0 && <ul>{branch.children.map((label, i) => <li key={i}><MathText text={label} /></li>)}</ul>}
      {onAsk && <Button size="small" startIcon={<ChatBubbleOutlineRounded />} onClick={() => onAsk(branch.label)}>Ask about this</Button>}
    </article>)}</div>
  </section>;
}

function Story({ sections, activity, end, onProgress, onQuiz, onNewVersion, busy }) {
  const saved = useActivityProgress(activity, { index: 0, finished: false });
  const i = Math.min(saved.value.index || 0, sections.length - 1), section = sections[i];
  useEffect(() => { onProgress(!saved.ready || sections.length < 2 || saved.value.finished ? '' : `Part ${i + 1} of ${sections.length}`); }, [saved.ready, saved.value.finished, i, sections.length]);
  useEffect(() => () => onProgress(''), []);
  if (!saved.ready) return <div className="fam-viewer-scroll fam-centre">{saved.error ? <SaveNote saved={saved} /> : <CircularProgress aria-label="Loading the story" />}</div>;
  if (!section) return null;
  const off = !!saved.error, last = i === sections.length - 1;
  if (saved.value.finished) return <>
    <div className="fam-viewer-scroll"><div className="fam-read"><section className="fam-story fam-done">
      <Typography component="h2" className="fam-h">The end</Typography>
      <div className="fam-cards-nav fam-cards-nav-c"><Button disabled={off} onClick={() => saved.update({ index: 0, finished: false })}>Read again</Button>
        <Button disabled={busy} onClick={onNewVersion} startIcon={<ReplayRounded />}>New story</Button></div>
      {off && <SaveNote saved={saved} />}{end}
    </section></div></div>
    <footer className="fam-viewer-foot"><span className="fam-grow" /><Button variant="contained" size="large" disabled={busy} onClick={onQuiz} startIcon={<AutoAwesomeRounded />}>Practise with a quiz</Button></footer>
  </>;
  return <>
    <div className="fam-viewer-scroll"><div className="fam-read"><section className="fam-story" key={i}>
      <article><Typography component="h2" className="fam-story-title">{section.title}</Typography><Prose text={section.text} /></article>
      {off && <SaveNote saved={saved} />}
    </section></div></div>
    <footer className="fam-viewer-foot">
      <Button className="fam-back" data-hide={i === 0} disabled={i === 0 || off} onClick={() => saved.update({ index: i - 1, finished: false })} startIcon={<ArrowBackRounded />}>Back</Button><span className="fam-grow" />
      {last ? <Button variant="contained" size="large" disabled={off} onClick={() => saved.update({ finished: true })}>Finish</Button>
        : <Button variant="contained" size="large" disabled={off} onClick={() => saved.update({ index: i + 1 })} endIcon={<ArrowForwardRounded />}>Next part</Button>}
    </footer>
  </>;
}

const judgement = { correct: ['ok', 'Right'], needs_work: ['warm', 'Not quite'], uncertain: ['neutral', 'To check'] };
function WorkCheck({ checks, childName }) {
  const right = checks.filter(check => check.judgement === 'correct').length;
  return <section className="fam-check">
    <Typography className="fam-small">A guide from AI, not a final mark.</Typography>
    {checks.length > 0 && <div className="fam-check-chips">
      <span className="fam-status" data-tone="ok">{right} right</span>
      {checks.filter(c => c.judgement === 'needs_work').length > 0 && <span className="fam-status" data-tone="warm">{checks.filter(c => c.judgement === 'needs_work').length} not quite</span>}
      {checks.filter(c => !['correct', 'needs_work'].includes(c.judgement)).length > 0 && <span className="fam-status">{checks.filter(c => !['correct', 'needs_work'].includes(c.judgement)).length} to check</span>}</div>}
    {checks.map(check => { const [tone, label] = judgement[check.judgement] || judgement.uncertain;
      return <article key={check.label} className="fam-check-card" data-tone={tone}>
        <header><Typography component="h3" className="fam-branch-title">{check.label}</Typography><span className="fam-status" data-tone={tone}>{label}</span></header>
        {check.question && <Prose text={check.question} />}
        {check.judgement === 'correct' ? <Typography className="fam-check-right">{childName} wrote <b><MathText text={check.studentAnswer} /></b> ✓</Typography>
          : <div className="fam-check-pair"><div><Typography className="fam-small">{childName} wrote</Typography><Prose text={check.studentAnswer} /></div>
          <div><Typography className="fam-small">Right answer</Typography><Prose text={check.expectedAnswer} /></div></div>}
        <Prose text={check.feedback} />
      </article>; })}
  </section>;
}
