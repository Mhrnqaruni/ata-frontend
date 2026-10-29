import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Alert, Badge, Button, Checkbox, CircularProgress, Collapse, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, LinearProgress, MenuItem, TextField, Typography, useMediaQuery } from '@mui/material';
import CloseRounded from '@mui/icons-material/CloseRounded';
import AddRounded from '@mui/icons-material/AddRounded';
import RemoveRounded from '@mui/icons-material/RemoveRounded';
import UploadFileRounded from '@mui/icons-material/UploadFileRounded';
import MenuBookRounded from '@mui/icons-material/MenuBookRounded';
import QuizRounded from '@mui/icons-material/QuizRounded';
import StyleRounded from '@mui/icons-material/StyleRounded';
import AccountTreeRounded from '@mui/icons-material/AccountTreeRounded';
import AutoStoriesRounded from '@mui/icons-material/AutoStoriesRounded';
import PhotoCameraRounded from '@mui/icons-material/PhotoCameraRounded';
import ChatRounded from '@mui/icons-material/ChatRounded';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import ThumbsUpDownRounded from '@mui/icons-material/ThumbsUpDownRounded';
import ListRounded from '@mui/icons-material/ListRounded';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { queryClient, sessionGeneration } from '../../services/queryCache';
import api from '../../services/api';
import useFamilyChats from './useFamilyChats';
import FamilyConversation from './FamilyConversation';
import FamilyResult from './FamilyResult';
import FamilySource from './FamilySource';
import FamilyLoading from './FamilyLoading';
import { StatusChip, TopicCard, kindIcon } from './FamilyParts';
import { isRunning as active, kindWords, levelWords, statusOf, ukDate } from './familyWords';

const makeTiles = [['quiz', 'Quiz', 'Questions to answer'], ['flashcards', 'Flashcards', 'Cards to flip'], ['mindmap', 'Mind map', 'See the big picture'], ['story', 'Story', 'Learn through a story']];
const makeTitle = { quiz: 'a quiz', flashcards: 'flashcards', mindmap: 'a mind map', story: 'a story' };


/** A radio group drawn as one track with a sliding thumb (transform only). */
function Segmented({ label, options, value, onChange, id }) {
  const index = options.findIndex(([v]) => v === value);
  const refs = useRef([]);
  function onKey(e, i) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!step) return;
    e.preventDefault(); const next = (i + step + options.length) % options.length; onChange(options[next][0]); refs.current[next]?.focus();
  }
  return <div className="fam-seg-field"><Typography component="div" className="fam-label" id={id}>{label}</Typography>
    <div className="fam-seg" role="radiogroup" aria-labelledby={id} style={{ '--n': options.length, '--i': index }}>
      <span className="fam-seg-thumb" aria-hidden style={{visibility:index<0?"hidden":undefined}} />
      {options.map(([v, text], i) => <button key={v} type="button" role="radio" aria-checked={v === value} tabIndex={v === value || (index<0 && i===0) ? 0 : -1}
        ref={el => { refs.current[i] = el; }} className="fam-seg-btn" data-on={v === value} onClick={() => onChange(v)} onKeyDown={e => onKey(e, i)}>{text}</button>)}
    </div></div>;
}

function ChoiceCards({ label, id, options, value, onChange }) {
  return <div><Typography component="div" className="fam-label" id={id}>{label}</Typography>
    <div className="fam-choices" role="radiogroup" aria-labelledby={id}>
      {options.map(([v, title, hint, Icon]) => <button key={v} type="button" role="radio" aria-checked={v === value} className="fam-choice" data-on={v === value} onClick={() => onChange(v)}>
        <Icon className="fam-choice-icon" aria-hidden /><span className="fam-choice-title">{title}</span><span className="fam-choice-hint">{hint}</span>
        {v === value && <CheckRounded className="fam-choice-tick" aria-hidden />}</button>)}
    </div></div>;
}


export default function FamilyLearning({ child }) {
  const { user } = useAuth();
  const generation = sessionGeneration();
  const key = ['family', generation, user.id, child.id, 'home'];
  const base = `/api/family/children/${child.id}`;
  const home = useQuery({ queryKey: key, queryFn: async ({ signal }) => (await api.get(base, { signal })).data,
    refetchInterval: query => query.state.data?.activities.some(active) ? 3000 : false });
  const catalogue = useQuery({ queryKey: ['family', generation, user.id, 'topics'],
    queryFn: async ({ signal }) => (await api.get('/api/family/topics', { signal })).data });
  const [sourceId, setSourceId] = useState('');
  const chats=useFamilyChats(child);
  const selectedSources=chats.data?.materialIds||[];
  const setSelectedSources=ids=>chats.setSources(ids);
  const [basis,setBasis]=useState('topic'),[topicText,setTopicText]=useState('');
  const [cardStyle,setCardStyle]=useState('question_answer'),[mapDepth,setMapDepth]=useState(3),[mapBreadth,setMapBreadth]=useState(4);
  const [storyLength,setStoryLength]=useState('short'),[storyTheme,setStoryTheme]=useState(''),[storyTone,setStoryTone]=useState('calm');
  const [questionSuggestion, setQuestionSuggestion] = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const desktop = useMediaQuery('(min-width:1000px)');
  const phone = useMediaQuery('(max-width:599px)');
  const [pane, setPane] = useState('chat');
  const [panelTab, setPanelTab] = useState(null);
  const [allDone, setAllDone] = useState(false);
  const [actionSources, setActionSources] = useState([]);
  const [title, setTitle] = useState(''), [tag, setTag] = useState(''), [difficulty, setDifficulty] = useState('Standard'), [quizType, setQuizType] = useState('mcq');
  const [moreOptions, setMoreOptions] = useState(false);
  const [countOther, setCountOther] = useState(false);
  const selectionKey = ['family', generation, user.id, child.id, 'selectedActivity'];
  const [activityId, setActivityIdState] = useState(() => queryClient.getQueryData(selectionKey));
  const setActivityId = id => { setActivityIdState(id); queryClient.setQueryData(selectionKey, id); };
  const [picker, setPicker] = useState(false);
  const [otherYear, setOtherYear] = useState(null);
  const [upload, setUpload] = useState(null);
  const [actionKind, setActionKind] = useState(null);
  const [confirmNew, setConfirmNew] = useState(null);
  const [stopAsk, setStopAsk] = useState(false);
  const [viewerProgress, setViewerProgress] = useState('');
  const [viewerAction, setViewerAction] = useState(null);
  const [count, setCount] = useState('5');
  const [focus, setFocus] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [recordError, setRecordError] = useState('');
  const [pending, setPending] = useState(null);
  const alive = useRef(true);
  const topicsRef = useRef(null);
  const panelRef = useRef(null), doneRef = useRef(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const valid = () => alive.current && generation === sessionGeneration();
  const sources = home.data?.materials || [];
  const history = home.data?.activities || [];
  const attempts = home.data?.attempts || [];
  const attemptFor = row => attempts.find(a => a.activityId === row.id);
  const selectedActivityId = activityId === undefined ? history[0]?.id : activityId;
  const detailKey = ['family', generation, user.id, child.id, 'activity', selectedActivityId];
  const detail = useQuery({ queryKey: detailKey, enabled: Boolean(selectedActivityId),
    queryFn: async ({ signal }) => (await api.get(`${base}/activities/${selectedActivityId}`, { signal })).data,
    refetchInterval: query => active(query.state.data) ? 2500 : false });
  const activity = detail.data;
  const draftKeyFor = id => ['family', generation, user.id, child.id, 'quizDraft', id];
  useEffect(() => {
    if (activity) { setCount(String(activity.count)); setFocus(activity.focus || ''); setRecordError(''); }
  }, [activity?.id]);
  const selectedIds = (selectedSources === undefined ? (sources[0] ? [sources[0].id] : []) : selectedSources).filter(id => sources.some(s => s.id === id));
  const source = sources.find(item => item.id === sourceId) || sources.find(item => item.id === selectedIds[0]);
  const activitySource = sources.find(item => item.id === activity?.materialId);
  function openActivity(row, { retry = false } = {}) {
    if (retry) queryClient.setQueryData(draftKeyFor(row.id), { answers: {}, checked: {}, index: 0, attemptId: crypto.randomUUID(), practising: true, restartRequested:true });
    setActivityId(row.id); setViewerOpen(true);
  }
  function closeViewer(force = false) {
    const draft = activity && queryClient.getQueryData(draftKeyFor(activity.id));
    if (!force && activity?.kind === 'quiz' && draft?.practising && Object.keys(draft.answers || {}).length > 0) { setStopAsk(true); return; }
    setStopAsk(false); setViewerOpen(false); setViewerProgress('');
  }
  function openCreate(kind) {
    setBasis(sources.length?'materials':chats.data?.turns.some(t=>t.activity.status==='completed')?'conversation':'topic');setTopicText('');
    setActionSources(selectedIds.length ? [...selectedIds] : sources[0] ? [sources[0].id] : []); setActionKind(kind); setTitle(''); setTag(''); setFocus(''); setMoreOptions(false); setError('');
    setCountOther(false); setCount('5'); if (kind === 'quiz') setDifficulty('Standard');
  }
  function toggleSource(id, checked) { setSelectedSources(checked ? [...selectedIds, id] : selectedIds.filter(x => x !== id)); setSourceId(''); }
  const years = Number((child.gradeLevel || '').replace(/[^0-9]/g, ''));
  const topics = catalogue.data?.topics || [];
  const suggested = topics.filter(topic => topic.year === years);
  const otherYears = [...new Set(topics.filter(t => t.year !== years).map(t => t.year))].sort((a, b) => a - b);
  async function refresh() { await queryClient.invalidateQueries({ queryKey: key }); }
  async function command(work, onError) {
    if (busy) return false;
    setBusy(true); setError('');
    try { await work(); return true; }
    catch (e) { if (valid()) { const message = typeof e.response?.data?.detail === 'string' ? e.response.data.detail : 'This could not finish. Your saved work is safe.'; setError(message); onError?.(message); } return false; }
    finally { if (valid()) setBusy(false); }
  }
  function selectSource(id) { setSelectedSources([id]); setSourceId(id); setFocus(''); setPending(null); setError(''); }
  function choose(topic) {
    const existing = sources.find(item => item.provenance?.id === topic.id);
    if (existing) { selectSource(existing.id); setPicker(false); setPane('chat'); return; }
    const request = pending?.type === 'topic' && pending.topicId === topic.id ? pending : { type: 'topic', id: crypto.randomUUID(), topicId: topic.id };
    setPending(request);
    void command(async () => {
      const { data } = await api.put(`${base}/topics/${request.id}`, { topicId: topic.id });
      await refresh(); if (valid()) { selectSource(data.id); setPicker(false); setPane('chat'); }
    });
  }
  function newUpload(purpose, files = []) { if(busy)return; setError(''); setPicker(false); setUpload({ id: crypto.randomUUID(), checkId: crypto.randomUUID(), purpose, title: '', files, conversationId:chats.id }); }
  function addMissingPages() {
    const original = sources.find(item => item.id === activity?.materialId) || source;
    if (!original) return;
    void command(async () => {
      // Preserve original answer pages in a NEW immutable group, not an in-place edit.
      const files = await Promise.all(original.files.map(async (file, index) => {
        const { data } = await api.get(`${base}/materials/${original.id}/files/${index}`, { responseType: 'blob' });
        return new File([data], file.name, { type: file.mime });
      }));
      if (valid()) setUpload({ id: crypto.randomUUID(), checkId: crypto.randomUUID(), purpose: original.purpose, title: original.title, files, reason: 'missing' });
    });
  }
  function saveUpload() {
    const captured = upload;
    setUpload({ ...upload, submitted: true });
    void command(async () => {
      const form = new FormData(); form.append('title', captured.title || (captured.purpose === 'work' ? 'Homework' : 'Worksheet')); form.append('purpose', captured.purpose);
      captured.files.forEach(file => form.append('files', file));
      const { data } = await api.put(`${base}/materials/${captured.id}`, form, { timeout: 120000, headers: { "Content-Type": undefined },onUploadProgress:e=>{if(valid())setUpload(u=>u?{...u,percent:e.total?Math.round(e.loaded/e.total*100):null}:u)} });
      await refresh();
      if (captured.purpose === 'work') {
        // Marking is the reason a parent uploads homework, so it starts here (one explicit tap, one AI check).
        const { data: job } = await api.put(`${base}/activities/${captured.checkId}`, { materialId: data.id, materialIds: [data.id], kind: 'check',
          count: 5, focus: '', title: captured.title || 'Homework check', tag: '', difficulty: 'Standard', quizType: 'mcq' });
        await refresh(); if (valid()) { setUpload(null); setActivityId(job.id); setViewerOpen(true); }
        return;
      }
      if(captured.conversationId)await api.put(`${base}/conversations/${captured.conversationId}/materials/${data.id}`);
      await queryClient.invalidateQueries({queryKey:['family',generation,user.id,child.id,'conversation',captured.conversationId]});
      if (valid()) { setUpload(null); setPane('chat'); }
    });
  }
  function start(kind, again = false, requestedCount = Number(count) || 5) {
    const ids = again ? (activity.materialIds || [activity.materialId]) : actionKind ? actionSources : selectedIds;
    const selectedBasis=again?activity.basis:basis;
    if(selectedBasis==='materials'&&!ids.length)return;
    const payload = { materialId: selectedBasis==='materials'?ids[0]:null, materialIds:selectedBasis==='materials'?ids:[], kind, count: requestedCount, focus,
      basis:selectedBasis,topic:again?activity.settings?.topic:topicText,
      conversationId:selectedBasis==='conversation'?(again?activity.settings?.conversationId:chats.id):null,
      conversationRevision:selectedBasis==='conversation'?(again?activity.settings?.conversationRevision:chats.data?.revision):null,
      sourceActivityId:again?activity.id:null,originConversationId:chats.id,
      cardStyle:again?activity.settings?.cardStyle||'question_answer':cardStyle,mapDepth:again?activity.settings?.mapDepth||3:mapDepth,mapBreadth:again?activity.settings?.mapBreadth||4:mapBreadth,
      storyLength:again?activity.settings?.storyLength||'short':storyLength,storyTheme:again?activity.settings?.storyTheme||'':storyTheme,storyTone:again?activity.settings?.storyTone||'calm':storyTone,
      title: again ? activity.title : title, tag: again ? activity.tag : tag, difficulty: again ? activity.difficulty : difficulty, quizType: again ? activity.quizType : quizType };
    const signature = JSON.stringify({ ...payload, again });
    const request = pending?.type === 'activity' && pending.signature === signature ? pending : {
      type: 'activity', id: crypto.randomUUID(), signature,
      payload: again ? { ...payload, newAttemptKey: crypto.randomUUID() } : payload,
    };
    setPending(request);
    void command(async () => {
      const { data } = await api.put(`${base}/activities/${request.id}`, request.payload);
      await refresh(); if (valid()) { setActivityId(data.id); setPending(null); setActionKind(null); setViewerOpen(again); setPane('chat'); }
    });
  }
  async function record(id, answers) {
    setRecordError('');
    return command(async () => { await api.put(`${base}/activities/${activity.id}/attempts/${id}`, { answers }); await refresh(); }, setRecordError);
  }
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active(activity)) return;
    const tick = () => setSeconds(Math.max(0, Math.floor((Date.now() - Date.parse(activity.createdAt)) / 1000)));
    tick(); const timer = setInterval(tick, 1000); return () => clearInterval(timer);
  }, [activity?.id, activity?.status, activity?.createdAt]);
  if (home.isPending) return <FamilyLoading variant="body" label="Opening the notebook" />;
  if (home.isError && (!home.data || [403, 404].includes(home.error?.response?.status))) return <main className="fam-centre-page"><Alert severity="error" action={<Button onClick={() => home.refetch()}>Try again</Button>}>Could not load this child’s notebook.</Alert></main>;
  const showTopics = () => { if (desktop) setPanelTab('materials'); else setPane('topics'); };
  const doneRows = allDone ? history : history.slice(0, 5);
  const tab = panelTab || (sources.length ? 'activities' : 'materials');
  function quizFrom(ids) { setSelectedSources(ids); setActionSources(ids); setBasis('materials'); setCountOther(false); setTitle(''); setTag(''); setFocus(''); setMoreOptions(false); setError(''); if (!['3', '5', '10'].includes(count)) setCount('5'); setActionKind('quiz'); }

  const topicsSection = <section className="fam-sec" ref={topicsRef} tabIndex={-1} aria-label="Materials">
    <div className="fam-add-grid">
      <button type="button" className="fam-add-card" onClick={() => setPicker(true)} disabled={busy}>
        <span className="fam-act-icon" data-kind="learn" aria-hidden><MenuBookRounded /></span>
        <span className="fam-topic-text"><span className="fam-topic-title">Choose a topic</span><span className="fam-topic-sub">Maths topics by school year</span></span></button>
      <button type="button" className="fam-add-card" onClick={() => newUpload('learning')} disabled={busy}>
        <span className="fam-act-icon" data-kind="cards" aria-hidden><UploadFileRounded /></span>
        <span className="fam-topic-text"><span className="fam-topic-title">Upload a worksheet or book</span><span className="fam-topic-sub">A photo or a PDF, any subject</span></span></button>
    </div>
    {(() => {
      const row = item => <li key={item.id} className="fam-src">
        <Checkbox disabled={chats.busy} checked={selectedIds.includes(item.id)} onChange={e => toggleSource(item.id, e.target.checked)} inputProps={{ 'aria-label': `Use ${item.title} in the chat` }} />
        <div className="fam-src-text"><span className="fam-src-title">{item.title}</span>
          <span className="fam-small">{item.purpose === 'work' ? 'Homework' : item.files.length ? 'Your worksheet' : 'MySmartTeach notes'}</span></div>
        <FamilySource base={base} source={item} onQuiz={() => quizFrom([item.id])} />
      </li>;
      const used = sources.filter(item => selectedIds.includes(item.id)), unused = sources.filter(item => !selectedIds.includes(item.id));
      return <>
        <header className="fam-sec-head"><Typography component="h2" className="fam-sec-title">Your materials</Typography></header>
        {sources.length > 0 && <Typography className="fam-small fam-sec-note">Tick the ones the chat should use.</Typography>}
        {used.length > 0 && <ul className="fam-list">{used.map(row)}</ul>}
        {unused.length > 0 && (used.length ? <details className="fam-src-group"><summary>Not in use ({unused.length})<ExpandMoreRounded className="fam-chev" aria-hidden /></summary><ul className="fam-list">{unused.map(row)}</ul></details>
          : <ul className="fam-list">{unused.map(row)}</ul>)}
        {!sources.length && <Typography className="fam-small fam-empty-line">Nothing here yet. Add a topic or upload a worksheet.</Typography>}</>;
    })()}
  </section>;

  const makeSection = <section className="fam-sec" aria-labelledby="fam-sec-make">
    <header className="fam-sec-head"><Typography component="h2" id="fam-sec-make" className="fam-sec-title">Make something</Typography></header>
    <div className="fam-tiles">{makeTiles.map(([kind, label, hint]) => { const Icon = kindIcon[kind]; return <button key={kind} type="button" className="fam-tile" data-kind={kind}
      disabled={busy || !chats.id} onClick={() => openCreate(kind)}><Icon className="fam-tile-icon" aria-hidden /><span className="fam-tile-label">{label}</span><span className="fam-tile-hint">{hint}</span></button>; })}</div>
  </section>;

  const homeworkSection = <section className="fam-sec" aria-labelledby="fam-sec-hw">
    <header className="fam-sec-head"><Typography component="h2" id="fam-sec-hw" className="fam-sec-title">Homework</Typography></header>
    <button type="button" className="fam-hwbtn" disabled={busy} onClick={() => newUpload('work')}>
      <span className="fam-act-icon" data-kind="check" aria-hidden><PhotoCameraRounded /></span>
      <span className="fam-topic-text"><span className="fam-topic-title">Check homework</span>
        <span className="fam-topic-sub">Photo of finished work, marked by AI</span></span>
      <ChevronRightRounded className="fam-topic-go" aria-hidden /></button>
  </section>;

  const doneSection = <section className="fam-sec" aria-labelledby="fam-sec-done">
    <header className="fam-sec-head"><Typography component="h2" id="fam-sec-done" className="fam-sec-title">Done so far</Typography></header>
    <ul className="fam-list" ref={doneRef}>{doneRows.map(row => { const Icon = kindIcon[row.kind] || AutoAwesomeRounded; return <li key={row.id}>
      <button type="button" className="fam-act" onClick={() => openActivity(row)}>
        <span className="fam-act-icon" data-kind={row.kind} aria-hidden><Icon /></span>
        <span className="fam-act-text"><span className="fam-act-title">{row.title}</span><span className="fam-small">{row.title === kindWords[row.kind]?.label ? '' : `${kindWords[row.kind]?.label} · `}{ukDate(row.createdAt).replace(/ \d{4}$/, '')}</span></span>
        <StatusChip row={row} attempt={attemptFor(row)} />
      </button></li>; })}</ul>
    {history.length > doneRows.length && <Button size="small" onClick={() => setAllDone(true)}>See all ({history.length})</Button>}
    {allDone && history.length > 5 && <Button size="small" onClick={() => setAllDone(false)}>Show fewer</Button>}
    {!history.length && <Typography className="fam-small fam-empty-line">Quizzes and cards you make will appear here.</Typography>}
  </section>;

  const starter = <div className="fam-starter">
    {catalogue.isPending && <CircularProgress size={24} aria-label="Loading topics" />}
    {suggested.map(topic => <TopicCard key={topic.id} topic={topic} busy={busy} loading={busy && pending?.topicId === topic.id} onClick={() => choose(topic)} />)}
    <button type="button" className="fam-topic" onClick={() => newUpload('learning')} disabled={busy}>
      <span className="fam-topic-icon" aria-hidden><UploadFileRounded /></span>
      <span className="fam-topic-text"><span className="fam-topic-title">Use your own worksheet</span><span className="fam-topic-sub">Add a photo or a PDF</span></span>
      <ChevronRightRounded className="fam-topic-go" aria-hidden /></button>
    {topics.length > suggested.length && <Button onClick={() => setPicker(true)}>See all topics</Button>}
    {error && !picker && !upload && !actionKind && <Alert severity="error">{error}</Alert>}
  </div>;

  const conversation = <FamilyConversation key={`${child.id}:${chats.id||"loading"}`} chat={chats} child={child} suggestion={questionSuggestion} materials={sources.filter(s => selectedIds.includes(s.id))} materialIds={selectedIds}
    available={sources.filter(s => !selectedIds.includes(s.id) && s.purpose !== 'work')} onUseMaterial={id => toggleSource(id, true)}
    activities={history} attempts={attempts} onActivity={openActivity} onToggleMaterial={id => toggleSource(id, false)} onMaterials={showTopics}
    onCreate={openCreate} onHomework={() => newUpload('work')} onUpload={files => newUpload('learning',files||[])} uploadState={upload} onTopic={() => setPicker(true)} starter={sources.length ? null : starter} compact={phone} />;

  const viewerBody = !activity ? (detail.isError ? <div className="fam-viewer-scroll fam-centre"><Alert severity="error" action={<Button onClick={() => detail.refetch()}>Try again</Button>}>Could not open this.</Alert></div>
      : <div className="fam-viewer-scroll fam-centre"><CircularProgress aria-label="Opening" /></div>)
    : active(activity) ? <><div className="fam-viewer-scroll fam-centre"><section className="fam-making" role="status">
        <AutoAwesomeRounded className="fam-making-icon" aria-hidden /><Typography component="h2" className="fam-h">{kindWords[activity.kind]?.making || 'Getting it ready'}…</Typography>
        <LinearProgress className="fam-making-bar" /><Typography className="fam-small">About a minute. You can close this.</Typography>
      </section></div><footer className="fam-viewer-foot"><span className="fam-grow" /><Button variant="outlined" onClick={() => closeViewer(true)}>Back to notebook</Button></footer></>
    : activity.result ? <FamilyResult key={activity.id} activity={activity} childName={child.displayName} onProgress={setViewerProgress} onHeaderAction={setViewerAction} base={base} onRecord={record} busy={busy} attempts={attempts}
        draftKey={draftKeyFor(activity.id)} saveError={recordError} sourceFiles={activity.sourceFiles || activitySource?.files || []}
        onClose={() => closeViewer(true)} onNewVersion={() => setConfirmNew(activity.kind)}
        onAsk={label => { setSelectedSources(activity.materialIds || [activity.materialId]); setQuestionSuggestion({ text: `Help me explain ${label} to ${child.displayName} in a simple way.`, id: crypto.randomUUID() }); closeViewer(true); setPane('chat'); }}
        onExplain={text => { setQuestionSuggestion({ text: text.slice(0, 3900), id: crypto.randomUUID(), send: true }); closeViewer(true); setPane('chat'); }}
        onMakeQuiz={() => { closeViewer(true); const ids = (activity.materialIds?.length ? activity.materialIds : activity.materialId ? [activity.materialId] : []).filter(id => sources.some(x => x.id === id));
          if (ids.length) setSelectedSources(ids); setActionSources(ids); setBasis(ids.length ? 'materials' : activity.settings?.topic ? 'topic' : 'conversation'); setTopicText(activity.settings?.topic || '');
          setTitle(''); setTag(''); setFocus(''); setMoreOptions(false); setCountOther(false); setCount('3'); setDifficulty('Standard'); setActionKind('quiz'); }} />
    : <><div className="fam-viewer-scroll fam-centre"><section className="fam-making">
        <Typography component="h2" className="fam-h">{activity.status === 'needs_input' ? 'Some pages are missing' : `We couldn’t make this ${(kindWords[activity.kind]?.label || 'activity').toLowerCase()}`}</Typography>
        <Typography className="fam-done-sub">{activity.status === 'needs_input' ? (activity.error || 'Add them and we’ll try again.') : 'Your other work is safe.'}</Typography>
        {error && <Alert severity="error">{error}</Alert>}</section></div>
      <footer className="fam-viewer-foot"><Button onClick={() => closeViewer(true)}>Back to notebook</Button><span className="fam-grow" />
        {activity.status === 'needs_input' ? <Button variant="contained" disabled={busy} onClick={() => { setSourceId(activity.materialId); closeViewer(true); void addMissingPages(); }}>Add the missing pages</Button>
          : <Button variant="contained" disabled={busy} onClick={() => setConfirmNew(activity.kind)}>Try again</Button>}</footer></>;

  const KindIcon = kindIcon[activity?.kind] || AutoAwesomeRounded;
  const readyCount = history.filter(row => row.status === 'completed' && !attemptFor(row) && row.kind === 'quiz').length;
  return <div className="fam-body">
    {home.isError && <Alert severity="warning" className="fam-banner">Could not refresh. Showing what was saved.</Alert>}
    {desktop ? <div className="fam-main">
      {conversation}
      <aside className="fam-panel" ref={panelRef} aria-label={`${child.displayName}’s materials and activities`}>
        <div className="fam-panel-tabs" role="tablist" aria-label="Side panel">
          {[['materials', 'Materials', 0], ['activities', 'Activities', 0]].map(([id, label, n]) =>
            <button key={id} type="button" role="tab" aria-selected={tab === id} className="fam-panel-tab" data-on={tab === id} onClick={() => setPanelTab(id)}>
              {label}{n ? <span className="fam-panel-n">{n}</span> : null}</button>)}
        </div>
        <div role="tabpanel" className="fam-panel-body">{tab === 'materials' ? topicsSection : <>{makeSection}{homeworkSection}{doneSection}</>}</div>
      </aside>
    </div> : <>
      <div className="fam-main fam-main-phone">
        <div className="fam-pane-chat" hidden={pane !== 'chat'}>{conversation}</div>
        <div className="fam-pane" hidden={pane !== 'topics'}>{topicsSection}</div>
        <div className="fam-pane" hidden={pane !== 'activities'}>{makeSection}{homeworkSection}{doneSection}</div>
      </div>
      <nav className="fam-bottom" aria-label="Notebook sections">
        {[['chat', 'Chat', ChatRounded, 0], ['topics', 'Materials', MenuBookRounded, sources.length], ['activities', 'Activities', AutoAwesomeRounded, readyCount]].map(([id, label, Icon, n]) =>
          <button key={id} type="button" className="fam-bottom-btn" data-on={pane === id} aria-current={pane === id ? 'page' : undefined} onClick={() => setPane(id)}>
            <span className="fam-bottom-pill">{id === 'activities' && n > 0 ? <Badge color="primary" badgeContent={n} aria-hidden><Icon /></Badge> : <Icon />}</span>
            <span>{label}{id === 'topics' && n ? ` (${n})` : ''}{id === 'activities' && n ? <span className="fam-sr"> ({n} ready)</span> : ''}</span></button>)}
      </nav></>}

    <Dialog open={viewerOpen} onClose={() => closeViewer()} fullScreen className="fam-viewer" TransitionProps={{ timeout: { enter: 240, exit: 180 } }}>
      <header className="fam-viewer-head">
        <IconButton className="fam-icon-btn" aria-label="Close and go back to the notebook" onClick={() => closeViewer()}><CloseRounded /></IconButton>
        <span className="fam-viewer-kind" data-kind={activity?.kind} aria-hidden><KindIcon /></span>
        <div className="fam-viewer-title"><Typography component="h1" className="fam-viewer-name">{activity?.kind === 'check' && /^homework( check)?$/i.test(activity?.title || '') ? `${child.displayName}’s homework` : activity?.title || 'Activity'}</Typography>
          {viewerProgress && <Typography className="fam-small fam-viewer-progress-inline">{viewerProgress}</Typography>}</div>
        {viewerProgress && <span className="fam-viewer-progress" aria-live="polite">{viewerProgress}</span>}
        {viewerAction && <span className="fam-viewer-action">{viewerAction}</span>}
      </header>
      <div className="fam-viewer-main">{viewerBody}</div>
    </Dialog>

    <Dialog open={stopAsk} onClose={() => setStopAsk(false)} maxWidth="xs" fullWidth className="fam-dialog">
      <DialogTitle>Stop for now?</DialogTitle>
      <DialogContent><Typography>Your answers are kept. You can carry on later.</Typography></DialogContent>
      <DialogActions><Button onClick={() => closeViewer(true)}>Stop for now</Button><Button variant="contained" onClick={() => setStopAsk(false)}>Keep going</Button></DialogActions>
    </Dialog>

    <Dialog open={picker} onClose={() => { if (!busy) setPicker(false); }} fullWidth maxWidth="sm" fullScreen={phone} className="fam-dialog fam-dialog-top">
      <DialogTitle>What shall we learn?</DialogTitle>
      <DialogContent>
        {catalogue.isError && <Alert severity="error" action={<Button onClick={() => catalogue.refetch()}>Try again</Button>}>Topics could not load.</Alert>}
        {catalogue.isPending && <CircularProgress aria-label="Loading topics" />}
        {suggested.length > 0 && <><Typography className="fam-label">{child.gradeLevel} topics</Typography>
          <div className="fam-topic-list">{suggested.map(topic => <TopicCard key={topic.id} topic={topic} busy={busy} loading={busy && pending?.topicId === topic.id} onClick={() => choose(topic)} />)}</div></>}
        {otherYears.length > 0 && <details className="fam-src-group fam-gap-d" open={!suggested.length || undefined}><summary>Other years<ExpandMoreRounded className="fam-chev" aria-hidden /></summary>
          <div className="fam-yearchips" role="group" aria-label="Other years">{otherYears.map(y => <button key={y} type="button" className="fam-yearchip" data-on={otherYear === y} aria-pressed={otherYear === y}
            onClick={() => setOtherYear(otherYear === y ? null : y)}>Year {y}</button>)}</div>
          {otherYear && <div className="fam-topic-list">{topics.filter(t => t.year === otherYear).map(topic => <TopicCard key={topic.id} topic={topic} busy={busy} loading={busy && pending?.topicId === topic.id} onClick={() => choose(topic)} />)}</div>}</details>}
        <Typography className="fam-label fam-gap">Your own worksheet</Typography>
        <button type="button" className="fam-topic" onClick={() => newUpload('learning')} disabled={busy}>
          <span className="fam-topic-icon" aria-hidden><UploadFileRounded /></span>
          <span className="fam-topic-text"><span className="fam-topic-title">Add a photo or PDF</span><span className="fam-topic-sub">Any subject</span></span>
          <ChevronRightRounded className="fam-topic-go" aria-hidden /></button>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions><Button onClick={() => setPicker(false)} disabled={busy}>Close</Button></DialogActions>
    </Dialog>

    <Dialog open={!!upload} onClose={() => { if (!busy) setUpload(null); }} fullWidth maxWidth="sm" fullScreen={phone} className="fam-dialog">
      <DialogTitle>{upload?.reason === 'missing' ? 'Add the missing pages' : upload?.purpose === 'work' ? `Check ${child.displayName}’s homework` : 'Add a worksheet'}</DialogTitle>
      <DialogContent><div className="fam-form">
        <Typography className="fam-lead-s">{upload?.reason === 'missing' ? 'Your first pages are already here. Add the pages that were missing, then save.'
          : upload?.purpose === 'work' ? 'Photograph each page, questions and answers.' : 'Photograph the sheet, or choose a PDF.'}</Typography>
        <div className="fam-drop-row">
          {['photo', 'files'].map(way => <Button key={way} component="label" className="fam-drop" disabled={busy}>
            {way === 'photo' ? <PhotoCameraRounded aria-hidden /> : <UploadFileRounded aria-hidden />}<span>{way === 'photo' ? 'Take a photo' : 'Choose files'}</span>
            <input hidden type="file" multiple={way === 'files'} accept={way === 'photo' ? 'image/jpeg,image/png' : '.pdf,.png,.jpg,.jpeg'} capture={way === 'photo' ? 'environment' : undefined} onChange={e => {
              const files = [...upload.files, ...Array.from(e.target.files || [])].filter((file, index, all) =>
                all.findIndex(other => other.name === file.name && other.size === file.size && other.lastModified === file.lastModified) === index);
              setUpload({ ...upload, files, changed: upload.submitted || upload.changed });
              e.target.value = ''; // Allow reselecting a file after removing it.
            }} />
          </Button>)}
        </div>
        <Typography className="fam-small">Up to 10 photos or PDFs</Typography>
        {(upload?.files || []).length > 0 && <ul className="fam-files">{upload.files.map((file, i) => <li key={i}>
          <span className="fam-file-name">{i + 1}. {file.name}</span><span className="fam-small">{Math.ceil(file.size / 1024)} KB</span>
          <IconButton disabled={busy} aria-label={`Remove ${file.name}`} onClick={() => setUpload({ ...upload, files: upload.files.filter((_, index) => index !== i), changed: upload.submitted || upload.changed })}><CloseRounded fontSize="small" /></IconButton>
        </li>)}</ul>}
        {upload?.purpose !== 'work' && <TextField label="Name (optional)" placeholder="For example: Times tables sheet" value={upload?.title || ''} disabled={busy}
          onChange={e => setUpload({ ...upload, title: e.target.value, changed: upload.submitted || upload.changed })} fullWidth />}
        {upload?.purpose === 'work' && !upload?.reason && <Typography className="fam-small">AI marking takes about a minute. It’s a guide, not a final mark.</Typography>}
        {error && <Alert severity="error">{error}</Alert>}
        {upload?.changed && <Alert severity="info">The earlier files may already be saved.
          <Button onClick={() => { setUpload(null); void refresh(); }}>See what’s saved</Button>
          <Button onClick={() => setUpload({ ...upload, id: crypto.randomUUID(), checkId: crypto.randomUUID(), submitted: false, changed: false })}>Save these as new</Button></Alert>}
      </div></DialogContent>
      <DialogActions><Button disabled={busy} onClick={() => setUpload(null)}>Cancel</Button>
        <Button variant="contained" disabled={busy || upload?.changed || !upload?.files.length} onClick={saveUpload}>{busy ? (upload?.percent===100?'Saving…':`Uploading ${upload?.percent||0}%`) : upload?.purpose === 'work' && !upload?.reason ? 'Mark it' : upload?.reason ? 'Save pages' : 'Add worksheet'}</Button></DialogActions>
    </Dialog>

    {chats.error&&<Alert severity="error">{chats.error}</Alert>}
    <Dialog open={Boolean(actionKind)} onClose={() => !busy && setActionKind(null)} fullWidth maxWidth="sm" fullScreen={phone} className="fam-dialog">
      <DialogTitle>{{ quiz: 'Make a quiz', flashcards: 'Make flashcards', mindmap: 'Make a mind map', story: 'Make a story' }[actionKind] || 'Make something'}</DialogTitle>
      <DialogContent><div className="fam-form">
        {(() => {
          const canChat = !!chats.data?.turns.some(t => t.activity.status === 'completed');
          const about = [...(sources.length ? [['materials', 'My topics']] : []), ...(canChat ? [['conversation', 'This chat']] : []), ['topic', 'Describe it']];
          return <Segmented id="fam-about" label="About" value={basis} options={about}
            onChange={v => { setBasis(v); if (v === 'materials' && !actionSources.length) setActionSources(selectedIds.length ? [...selectedIds] : [sources[0].id]); }} />;
        })()}
        {basis === 'materials' && (sources.length > 1 ? <div className="fam-yearchips" role="group" aria-label="Which topics">{sources.map(item => { const on = actionSources.includes(item.id);
            return <button key={item.id} type="button" className="fam-yearchip" data-on={on} aria-pressed={on} onClick={() => setActionSources(on ? actionSources.filter(id => id !== item.id) : [...actionSources, item.id])}>{on && <CheckRounded aria-hidden />}{item.title}</button>; })}</div>
          : <Typography className="fam-small">{sources[0]?.title}</Typography>)}
        {basis === 'topic' && <TextField multiline minRows={1} maxRows={3} label="What should it be about?" placeholder="For example: times tables to 12" value={topicText} onChange={e => setTopicText(e.target.value)} inputProps={{ maxLength: 1500 }} fullWidth />}
        {actionKind === 'quiz' && <ChoiceCards label="Type" id="fam-type" value={quizType} onChange={setQuizType}
          options={[['mcq', 'Multiple choice', 'Pick from 4 answers', ListRounded], ['boolean', 'True or false', 'Is it true or not?', ThumbsUpDownRounded]]} />}
        {['quiz', 'flashcards'].includes(actionKind) && <div>
          <Segmented id="fam-count" label={actionKind === 'quiz' ? 'Questions' : 'Cards'} value={countOther ? 'other' : count}
            onChange={v => { if (v === 'other') setCountOther(true); else { setCountOther(false); setCount(v); } }} options={[['3', '3'], ['5', '5'], ['10', '10'], ['other', 'Other']]} />
          {countOther && <div className="fam-stepper" role="group" aria-label={actionKind === 'quiz' ? 'Number of questions' : 'Number of cards'}>
            <IconButton aria-label="One fewer" disabled={Number(count) <= 1} onClick={() => setCount(String(Math.max(1, (Number(count) || 5) - 1)))}><RemoveRounded /></IconButton>
            <span className="fam-stepper-n" aria-live="polite">{Number(count) || 5}</span>
            <IconButton aria-label="One more" disabled={Number(count) >= 10} onClick={() => setCount(String(Math.min(10, (Number(count) || 5) + 1)))}><AddRounded /></IconButton>
          </div>}</div>}
        {actionKind === 'quiz' && <Segmented id="fam-level" label="Level" value={difficulty} onChange={setDifficulty} options={levelWords} />}
        {actionKind === 'mindmap' && <Segmented id="fam-size" label="Size" value={String(mapDepth)} onChange={v => { const n = Number(v); setMapDepth(n); setMapBreadth(n + 1); }} options={[['2', 'Small'], ['3', 'Medium'], ['4', 'Big']]} />}
        {actionKind === 'story' && <><Segmented id="fam-length" label="Length" value={storyLength} onChange={setStoryLength} options={[['short', 'Short'], ['standard', 'Long']]} />
          <TextField label="Story idea (optional)" placeholder="For example: space pirates" value={storyTheme} onChange={e => setStoryTheme(e.target.value)} inputProps={{ maxLength: 100 }} fullWidth /></>}
        <TextField label="Anything to focus on? (optional)" placeholder="For example: tenths and hundredths" value={focus} onChange={e => setFocus(e.target.value)} inputProps={{ maxLength: 300 }} fullWidth />
        <div><Button size="small" onClick={() => setMoreOptions(!moreOptions)} aria-expanded={moreOptions} endIcon={<ExpandMoreRounded className="fam-chev" data-open={moreOptions} />}>More options</Button>
          <Collapse in={moreOptions}><div className="fam-form fam-more-opts">
            {actionKind === 'flashcards' && <Segmented id="fam-style" label="Card style" value={cardStyle} onChange={setCardStyle} options={[['question_answer', 'Q & A'], ['definitions', 'Words'], ['worked_examples', 'Examples']]} />}
            {actionKind === 'story' && <Segmented id="fam-tone" label="Tone" value={storyTone} onChange={setStoryTone} options={[['calm', 'Calm'], ['playful', 'Playful'], ['adventure', 'Adventure']]} />}
            <TextField label="Name (optional)" placeholder="We’ll name it for you" value={title} onChange={e => setTitle(e.target.value)} inputProps={{ maxLength: 160 }} fullWidth />
            <TextField label="Tag (optional)" placeholder="For example: homework" value={tag} onChange={e => setTag(e.target.value)} inputProps={{ maxLength: 30 }} fullWidth /></div></Collapse></div>
        {error && <Alert severity="error">{error}</Alert>}
      </div></DialogContent>
      <DialogActions><Typography className="fam-small fam-grow">Takes about a minute.</Typography>
        <Button disabled={busy} onClick={() => setActionKind(null)}>Cancel</Button>
        <Button variant="contained" disabled={busy || !Number.isInteger(Number(count)) || Number(count) < 1 || Number(count) > 10 || (basis === 'materials' && !actionSources.length) || (basis === 'topic' && !topicText.trim())} onClick={() => start(actionKind)} startIcon={<AutoAwesomeRounded />}>
          {busy ? 'Starting…' : { quiz: 'Make quiz', flashcards: 'Make cards', mindmap: 'Make map', story: 'Make story' }[actionKind] || 'Make it'}</Button></DialogActions>
    </Dialog>

    <Dialog open={Boolean(confirmNew)} onClose={() => setConfirmNew(null)} fullWidth maxWidth="xs" className="fam-dialog">
      <DialogTitle>{confirmNew === 'quiz' ? 'Make new questions?' : 'Make a new one?'}</DialogTitle>
      <DialogContent><Typography>{activity?.status === 'outcome_unknown' ? 'The last one may have finished already. Making another uses AI again.' : `This uses AI to make a fresh set. Your current ${kindWords[confirmNew]?.label.toLowerCase() || 'one'} and scores stay saved.`}</Typography></DialogContent>
      <DialogActions><Button onClick={() => setConfirmNew(null)}>Keep this one</Button><Button variant="contained" onClick={() => { const kind = confirmNew; setConfirmNew(null); start(kind, true); }}>{confirmNew === 'quiz' ? 'Make new questions' : 'Make a new one'}</Button></DialogActions>
    </Dialog>
  </div>;
}
