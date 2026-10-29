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

const letters = 'ABCD';
const Prose = ({ text }) => <Box className="fam-prose"><MathText text={text} /></Box>;
const freshDraft = practising => ({ answers: {}, checked: {}, index: 0, attemptId: crypto.randomUUID(), practising });
const reduced = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };

/** One activity, full screen. Quiz practice is parent-recorded; generated work is not completion. */
export default function FamilyResult({ activity, childName, onRecord, busy, attempts = [], draftKey, saveError,
  onAsk, onMakeQuiz, onNewVersion, onClose, sourceFiles = [] }) {
  const result = activity.result;
  if (!result) return null;
  if (activity.kind === 'quiz' && result.questions?.length > 0)
    return <Quiz activity={activity} result={result} childName={childName} onRecord={onRecord} busy={busy} attempts={attempts}
      draftKey={draftKey} saveError={saveError} onAsk={onAsk} onNewVersion={onNewVersion} onClose={onClose} />;
  if (activity.kind === 'mindmap' && !result.needsInformation && result.mindmap?.length) return <>
    <div className="fam-mm-wrap"><FamilyMindMap title={result.title || activity.title} overview={result.explanation} branches={result.mindmap}
      nextStep={forChild(result.nextStep, childName)} onAsk={onAsk} /></div>
    <footer className="fam-viewer-foot fam-mm-foot" data-wide="true">
      <Button onClick={onClose}><span className="fam-long">Back to notebook</span><span className="fam-short">Back</span></Button>
      <span className="fam-grow" />
      <Button variant="outlined" disabled={busy} onClick={onNewVersion} startIcon={<ReplayRounded />}>New map</Button>
      <Button variant="contained" disabled={busy} onClick={onMakeQuiz} startIcon={<AutoAwesomeRounded />}><span className="fam-long">Practise with a quiz</span><span className="fam-short">Quiz</span></Button>
    </footer>
  </>;
  return <>
    <div className="fam-viewer-scroll"><div className="fam-read">
      {result.needsInformation && <Alert severity="warning">{result.message}</Alert>}
      {result.explanation && !['check','story'].includes(activity.kind) && <div className="fam-lead"><MathText text={result.explanation} /></div>}
      {activity.kind === 'flashcards' && <Flashcards activity={activity} cards={result.cards || []} />}
      {activity.kind === 'mindmap' && <MindMap title={result.title} branches={result.mindmap || []} onAsk={onAsk} />}
      {activity.kind === 'story' && <><Story activity={activity} sections={result.story || []}/>{result.explanation&&<details className="fam-tip"><summary>What this helps explain</summary><Prose text={result.explanation}/></details>}</>}
      {activity.kind === 'check' && !result.needsInformation && <WorkCheck checks={result.checks || []} />}
      {result.references?.length > 0 && <Typography className="fam-small">From {result.references.map(ref => `${sourceFiles[ref.fileNumber - 1]?.name || `file ${ref.fileNumber}`}, page ${ref.page}`).join(' · ')}</Typography>}
      {result.nextStep && <NextStep text={forChild(result.nextStep, childName)} onAsk={() => onAsk?.(activity.title)} />}
    </div></div>
    <footer className="fam-viewer-foot">
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
    <div className="fam-tip-body"><Typography className="fam-tip-title">What to do next</Typography><Prose text={text} />
      {onAsk && <Button size="small" startIcon={<ChatBubbleOutlineRounded />} onClick={onAsk} className="fam-tip-action">Explain this in the chat</Button>}</div>
  </section>;
}

function Quiz({ activity, result, childName, onRecord, busy, attempts, draftKey, saveError, onAsk, onNewVersion, onClose }) {
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
  if(!saved.ready)return <div className="fam-viewer-scroll fam-centre">{saved.error?<Alert severity="error">{saved.error}</Alert>:<CircularProgress aria-label="Loading saved practice"/>}</div>;
  if (showResult && draft.finishedAttempt && !recorded.some(row => row.id === draft.finishedAttempt))
    return <div className="fam-viewer-scroll fam-centre"><CircularProgress aria-label="Saving the result" /></div>;
  if (showResult) return <QuizResult attempt={shownAttempt} earlier={recorded.filter(row => row.id !== shownAttempt.id)} questions={questions}
    childName={childName} nextStep={result.nextStep} busy={busy||!!saved.error} onClose={onClose} onNewVersion={onNewVersion}
    onAsk={() => onAsk?.(activity.title)} onRetry={() => update(freshDraft(true))} />;
  return <QuizRunner questions={questions} draft={draft} update={update} busy={busy||!!saved.error} saveError={saveError||saved.error} childName={childName} onFinish={finish} />;
}

function QuizRunner({ questions, draft, update, busy, saveError, childName, onFinish }) {
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
      <Typography className="fam-small" aria-live="polite">Question {index + 1} of {questions.length}</Typography>
    </div>
    <div className="fam-viewer-scroll">
      <div key={q.id} className="fam-quiz-q" data-dir={dir}>
        {index === 0 && <Typography className="fam-quiz-hint">Read the question with {childName}, then tap their answer.</Typography>}
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
          {!correct && <Typography>The answer is {letters[q.correctIndex]}: <MathText text={q.options[q.correctIndex]} /></Typography>}
          <Prose text={q.explanation} />
        </div>}
        {saveError && <Alert severity="error" sx={{ mt: 2 }}>{saveError}</Alert>}
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
  const sub = ratio === 1 ? `${childName} got every question right.` : ratio >= 0.5 ? `${childName} is getting there. Look at the ones to try again.`
    : `This one was tricky. Go through the answers below with ${childName}.`;
  const shown = useCountUp(attempt.score);
  const [ring, setRing] = useState(reduced() ? ratio : 0);
  useEffect(() => { const t = requestAnimationFrame(() => setRing(ratio)); return () => cancelAnimationFrame(t); }, [ratio]);
  const [open, setOpen] = useState(null);
  const phone = useMediaQuery('(max-width:599px)');
  const [all, setAll] = useState(false);
  const rows = phone && !all ? [] : questions;
  const right = questions.filter(q => attempt.answers?.[q.id] === q.correctIndex).length;
  const C = 2 * Math.PI * 52;
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
          {earlier.length > 0 && <Typography className="fam-small">Earlier tries: {earlier.slice(0, 3).map(row => `${row.score} of ${row.total}`).join(', ')}</Typography>}</div>
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
      {rows.length < questions.length && <button type="button" className="fam-rows-summary" onClick={() => setAll(true)}>
        <span><b>{right} of {questions.length} right</b> · see each question</span><ExpandMoreRounded aria-hidden /></button>}
      {ratio === 1 ? <section className="fam-tip"><AutoAwesomeRounded className="fam-tip-icon" aria-hidden /><div className="fam-tip-body">
          <Typography className="fam-tip-title">Ready for a harder one?</Typography><Typography>Every answer in this practice was correct. You can try new questions at a harder level.</Typography></div></section>
        : nextStep && <NextStep text={forChild(nextStep, childName)} onAsk={onAsk} />}
      </div>
    </div></div>
    <footer className="fam-viewer-foot" data-wide="true" data-layout="result">
      <Button onClick={onClose} className="fam-foot-back">Back to notebook</Button>
      <span className="fam-grow" />
      {ratio === 1 ? <>
        <Button variant="outlined" disabled={busy} onClick={onRetry} startIcon={<ReplayRounded />}>Try again</Button>
        <Button variant="contained" size="large" disabled={busy} onClick={onNewVersion} startIcon={<AutoAwesomeRounded />}>New questions</Button></>
      : <>
        <Button variant="outlined" disabled={busy} onClick={onNewVersion} startIcon={<AutoAwesomeRounded />} title="Makes a fresh set of questions">New questions</Button>
        <Button variant="contained" size="large" disabled={busy} onClick={onRetry} startIcon={<ReplayRounded />}>Try again</Button></>}
    </footer>
  </>;
}

function Flashcards({cards,activity}) {
  const saved=useActivityProgress(activity,{index:0,ratings:{},finished:false});
  const [flipped,setFlipped]=useState(false);
  const ids=cards.map((c,i)=>c.id||`c${i+1}`),order=saved.value.order||ids;
  const i=Math.min(saved.value.index||0,order.length-1),card=cards[ids.indexOf(order[i])];
  const ratings=saved.value.ratings||{},missed=ids.filter(id=>ratings[id]==='practise');
  if(!saved.ready)return saved.error?<Alert severity="error">{saved.error}</Alert>:<CircularProgress aria-label="Loading saved cards"/>;
  if(!card)return null;
  const move=n=>{setFlipped(false);saved.update({index:n})};
  const rate=value=>{setFlipped(false);saved.update({ratings:{...ratings,[order[i]]:value},index:i<order.length-1?i+1:i,finished:i===order.length-1})};
  return <section className="fam-cards">
    {saved.error&&<Alert severity="error">{saved.error}</Alert>}
    {saved.value.finished?<><Typography component="h2">Cards reviewed</Typography><Typography>{Object.keys(ratings).length} of {ids.length} rated · {missed.length} to practise again.</Typography><Button disabled={!missed.length||!!saved.error} onClick={()=>saved.update({order:missed,index:0,finished:false})}>Practise missed cards</Button><Button disabled={!!saved.error} onClick={()=>saved.update({order:ids,index:0,finished:false})}>Review all cards</Button></>:<>
    <Typography className="fam-small" aria-live="polite">Card {i+1} of {order.length} · {saved.error?'Not saved':saved.saving?'Saving…':'Progress saved'}</Typography>
    <button type="button" className="fam-flip" data-flipped={flipped} onClick={()=>setFlipped(!flipped)} aria-label={flipped?'Show question':'Reveal answer'}>
      <span className="fam-flip-inner"><span className="fam-flip-face fam-flip-front" aria-hidden={flipped}><MathText text={card.front}/><span className="fam-flip-hint">Tap to see the answer</span></span><span className="fam-flip-face fam-flip-back" aria-hidden={!flipped}><MathText text={card.back}/></span></span>
    </button>
    {flipped&&<><Prose text={card.explanation||''}/><div className="fam-cards-nav"><Button disabled={!!saved.error} onClick={()=>rate('practise')}>Practise again</Button><Button variant="contained" disabled={!!saved.error} onClick={()=>rate('got_it')}>Got it</Button></div></>}
    <div className="fam-cards-nav"><Button disabled={i===0||!!saved.error} onClick={()=>move(i-1)}>Previous card</Button><Button disabled={i>=order.length-1||!!saved.error} onClick={()=>move(i+1)}>Next card</Button></div>
    </>}
  </section>;
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

function Story({sections,activity}) {
  const saved=useActivityProgress(activity,{index:0,finished:false});
  if(!saved.ready)return saved.error?<Alert severity="error">{saved.error}</Alert>:<CircularProgress aria-label="Loading reading position"/>;
  const i=Math.min(saved.value.index||0,sections.length-1),section=sections[i];
  if(!section)return null;
  return <section className="fam-story"><Typography className="fam-small">Fictional learning story · Section {i+1} of {sections.length}</Typography>
    {saved.error&&<Alert severity="error">{saved.error}</Alert>}<article><Typography component="h3" className="fam-story-title">{section.title}</Typography><Prose text={section.text}/></article>
    <div className="fam-cards-nav"><Button disabled={i===0||!!saved.error} onClick={()=>saved.update({index:i-1,finished:false})}>Previous</Button>{i<sections.length-1?<Button disabled={!!saved.error} onClick={()=>saved.update({index:i+1})}>Next section</Button>:<Button disabled={!!saved.error} onClick={()=>saved.update(saved.value.finished?{index:0,finished:false}:{finished:true})}>{saved.value.finished?'Read again':'Finish reading'}</Button>}</div>
    {saved.value.finished&&<Typography className="fam-small">Reading finished. You can return to this story any time.</Typography>}
  </section>;
}

function WorkCheck({ checks }) {
  const right = checks.filter(check => check.judgement === 'correct').length;
  return <section className="fam-check">
    <Alert severity="info">This is AI guidance, not an official mark. Check it against the work.</Alert>
    {checks.length > 0 && <Typography className="fam-check-sum"><b>{right}</b> look right · <b>{checks.length - right}</b> to look at again</Typography>}
    {checks.map(check => { const [tone, label] = judgement[check.judgement] || judgement.uncertain;
      return <article key={check.label} className="fam-check-card" data-tone={tone}>
        <header><Typography component="h3" className="fam-branch-title">{check.label}</Typography><span className="fam-status" data-tone={tone}>{label}</span></header>
        {check.question && <Prose text={check.question} />}
        <div className="fam-check-pair"><div><Typography className="fam-small">Your child wrote</Typography><Prose text={check.studentAnswer} /></div>
          <div><Typography className="fam-small">Suggested answer</Typography><Prose text={check.expectedAnswer} /></div></div>
        <Prose text={check.feedback} />
      </article>; })}
  </section>;
}
