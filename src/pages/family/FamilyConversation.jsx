import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, LinearProgress, Menu, MenuItem, TextField, Typography } from '@mui/material';
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import AttachFileRounded from '@mui/icons-material/AttachFileRounded';
import MenuBookRounded from '@mui/icons-material/MenuBookRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import AddRounded from '@mui/icons-material/AddRounded';
import TuneRounded from '@mui/icons-material/TuneRounded';
import QuizRounded from '@mui/icons-material/QuizRounded';
import LightbulbOutlined from '@mui/icons-material/LightbulbOutlined';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { queryClient, sessionGeneration } from '../../services/queryCache';
import MathText from '../../components/common/MathTextDisplay';
import api from '../../services/api';
import { isRunning as running, kindWords, levelWords } from './familyWords';
import { StatusChip, kindIcon } from './FamilyParts';

const levelName = value => (levelWords.find(([v]) => v === value) || [, value])[1];

/** The card a parent acts on in the chat; it reads the same state as "Done so far", so the two never disagree. */
function ActivityCard({ row, attempt, onOpen }) {
  const Icon = kindIcon[row.kind] || AutoAwesomeRounded;
  const words = kindWords[row.kind] || { label: 'Activity', making: 'Getting it ready', ready: 'It’s ready' };
  const ready = row.status === 'completed';
  const what = row.kind === 'quiz' || row.kind === 'flashcards' ? `${row.count} ${row.kind === 'quiz' ? 'question' : 'card'}${row.count === 1 ? '' : 's'} · ` : '';
  return <article className="fam-card-act" data-state={running(row) ? 'busy' : ready ? 'ready' : 'other'}>
    <span className="fam-act-icon" aria-hidden><Icon /></span>
    <div className="fam-card-act-body">
      <span className="fam-card-act-chip-inline"><StatusChip row={row} attempt={attempt} /></span>
      <Typography component="h3" className="fam-card-act-title">{running(row) ? `${words.making}…` : ready ? (attempt ? `${words.label}: ${row.title}` : words.ready) : row.title}</Typography>
      <Typography className="fam-small">{what}{row.title}{row.kind === 'quiz' && row.difficulty ? ` · ${levelName(row.difficulty)}` : ''}</Typography>
      {running(row) && <><LinearProgress className="fam-making-bar" /><Typography className="fam-small">Usually under a minute. You can keep chatting.</Typography></>}
      {!running(row) && <div className="fam-card-act-actions">
        {ready && row.kind === 'quiz' && !attempt && <Button variant="contained" onClick={() => onOpen(row)}>Start quiz</Button>}
        {ready && row.kind === 'quiz' && attempt && <><Button variant="outlined" onClick={() => onOpen(row, { retry: true })}>Try again</Button><Button onClick={() => onOpen(row)}>See results</Button></>}
        {ready && row.kind !== 'quiz' && <Button variant="contained" onClick={() => onOpen(row)}>Open</Button>}
        {!ready && <Button variant="outlined" onClick={() => onOpen(row)}>See what happened</Button>}
      </div>}
    </div>
    <span className="fam-card-act-chip"><StatusChip row={row} attempt={attempt} /></span>
  </article>;
}

/** "Today", "Yesterday" or "28 Oct": the separators a parent knows from messaging apps. */
function dayLabel(ms) {
  const d = new Date(ms); const today = new Date(); const start = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(today) - start(d)) / 86400000);
  return diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
}
const clock = ms => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/** The assistant is working: three soft dots and words that change with the wait (honest, never a fake percentage). */
function Thinking({ since, topic }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const s = Math.max(0, Math.floor((now - since) / 1000));
  const words = s < 6 ? 'Thinking…' : s < 20 ? `Reading ${topic || 'your notes'}…` : s < 45 ? 'Writing the answer…' : 'Still working on it. You can leave and come back.';
  return <div className="fam-msg fam-msg-ai fam-thinking" role="status" aria-live="polite">
    <span className="fam-msg-avatar fam-avatar-busy" aria-hidden><AutoAwesomeRounded /></span>
    <div className="fam-bubble fam-bubble-thinking"><span className="fam-dots" aria-hidden><i /><i /><i /></span><span>{words}</span></div>
  </div>;
}

/** Reconnect observes saved jobs. Only an explicit Send dispatches new work. */
export default function FamilyConversation({ child, suggestion, materials = [], available = [], onUseMaterial, materialIds, onMaterials, onToggleMaterial, onCreate, onUpload, onTopic, activities, attempts = [], onActivity, starter, compact }) {
  const { user } = useAuth(), generation = sessionGeneration();
  const key = ['family', generation, user.id, child.id, 'conversation'];
  const draftKey = [...key, 'draft'];
  const base = `/api/family/children/${child.id}/conversation`;
  const conversation = useQuery({ queryKey: key, queryFn: async ({ signal }) => (await api.get(base, { signal })).data,
    refetchInterval: q => q.state.data?.turns.some(t => running(t.activity)) ? 1500 : false });
  const [text, setText] = useState(() => queryClient.getQueryData(draftKey) || '');
  const [pending, setPending] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [outgoing, setOutgoing] = useState(null);
  const [context, setContext] = useState(false), [preference, setPreference] = useState(''), [newDialog, setNewDialog] = useState(false), [menu, setMenu] = useState(null);
  const alive = useRef(true), log = useRef(null), nearBottom = useRef(true), input = useRef(null), lastSeen = useRef(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const valid = () => alive.current && generation === sessionGeneration();
  const data = conversation.data;
  const waiting = data?.turns.some(t => running(t.activity));
  function change(value) { setText(value); queryClient.setQueryData(draftKey, value); }
  const topicName = materials.length === 1 ? materials[0].title : materials.length ? `${materials.length} topics` : '';

  // One timeline: messages and activity cards stay where they happened; new things arrive at the bottom.
  const items = [
    ...(data?.turns || []).map(turn => ({ kind: 'turn', key: `t${turn.id}`, at: Date.parse(turn.activity?.createdAt) || 0, turn })),
    ...activities.slice(0, 12).map(row => ({ kind: 'act', key: `a${row.id}`, at: Date.parse(row.createdAt) || 0, row })),
  ].sort((a, b) => a.at - b.at);
  const tail = items.at(-1);
  // Changes when something is added at the end or the newest item changes state; waits until the chat itself has loaded.
  const tailSignature = !data ? '' : outgoing ? `out:${outgoing.at}` : `${items.length}:${tail ? `${tail.key}:${tail.kind === 'turn' ? tail.turn.activity.status : tail.row.status}` : ''}`;

  // Follow the conversation only when the parent is already at the bottom (or has just sent something).
  useLayoutEffect(() => {
    const el = log.current; if (!el || !tailSignature || lastSeen.current === tailSignature) return;
    const first = lastSeen.current === null; lastSeen.current = tailSignature;
    if (!first && !nearBottom.current) return;
    const answer = el.querySelector('[data-fresh-answer="true"]');
    if (answer && answer.offsetHeight > el.clientHeight * 0.6) answer.scrollIntoView({ block: 'start' });
    else el.scrollTop = el.scrollHeight;
  }, [tailSignature]);
  useEffect(() => { if (suggestion) { change(suggestion.text); input.current?.focus(); } }, [suggestion?.id]);

  async function send() {
    if (!text.trim() || !materialIds.length || !data || busy || waiting) return;
    const sent = text.trim();
    const payload = { conversationId: data.id, revision: data.revision, text: sent, materialIds };
    const signature = JSON.stringify({ conversationId: payload.conversationId, text: payload.text, materialIds: payload.materialIds });
    const request = pending?.signature === signature ? pending : { id: crypto.randomUUID(), signature, payload };
    setPending(request); setBusy(true); setError('');
    nearBottom.current = true; setOutgoing({ text: sent, at: Date.now() }); change('');
    try {
      await api.put(`${base}/messages/${request.id}`, request.payload);
      if (valid()) { setPending(null); await queryClient.invalidateQueries({ queryKey: key }); setOutgoing(null); }
    } catch (e) {
      if (valid()) {
        setOutgoing(null); change(sent); // the same words come back, so Send retries the same request
        setError(typeof e.response?.data?.detail === 'string' ? e.response.data.detail : 'The message may not have sent. Tap send again: it won’t be sent twice.');
        if (e.response?.status === 409) { setPending(null); await conversation.refetch(); }
      }
    } finally { if (valid()) setBusy(false); }
  }
  async function saveContext() { setBusy(true); setError(''); try { await api.patch(`${base}/${data.id}`, { preference }); if (valid()) { await conversation.refetch(); setContext(false); } } catch { if (valid()) setError('Could not save. Please try again.'); } finally { if (valid()) setBusy(false); } }
  async function newConversation() { setBusy(true); try { await api.put(`${base}/${crypto.randomUUID()}`); if (valid()) { setNewDialog(false); change(''); setPending(null); await conversation.refetch(); } } catch { if (valid()) setError('Could not start a new chat. Please try again.'); } finally { if (valid()) setBusy(false); } }
  const canSend = !!data && !busy && !waiting && !!text.trim() && !!materialIds.length;
  let lastDay = '';
  const dayRow = at => { if (!at) return null; const label = dayLabel(at); if (label === lastDay) return null; lastDay = label; return <div className="fam-day" role="separator"><span>{label}</span></div>; };
  return <section className="fam-chat" aria-label="Chat">
    <div className="fam-chat-tools"><Button size="small" startIcon={<TuneRounded />} onClick={e => setMenu(e.currentTarget)} disabled={!data}>Chat settings</Button></div>
    <Menu open={!!menu} anchorEl={menu} onClose={() => setMenu(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
      <MenuItem onClick={() => { setMenu(null); setPreference(data?.preference || ''); setContext(true); }}>Explanation style…</MenuItem>
      <MenuItem onClick={() => { setMenu(null); setNewDialog(true); }} disabled={waiting}>Start a new chat…</MenuItem>
    </Menu>
    <div className="fam-log" ref={log} role="log" aria-label="Chat messages" aria-live="polite" aria-relevant="additions text"
      onScroll={e => { const el = e.currentTarget; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120; }}>
      <div className="fam-log-inner">
        <div className="fam-msg fam-msg-ai">
          <span className="fam-msg-avatar" aria-hidden><AutoAwesomeRounded /></span>
          <div className="fam-bubble">
            <Typography className="fam-bubble-title">Hello! Let’s help {child.displayName} today.</Typography>
            <Typography>{materialIds.length ? `We’re looking at ${topicName}. What would help most?` : available.length ? 'What shall we work on? Choose a topic below.' : `Pick a ${child.gradeLevel || ''} topic below, or add a worksheet, and we’ll take it one step at a time.`.replace('  ', ' ')}</Typography>
          </div>
        </div>
        {starter}
        {!materialIds.length && available.length > 0 && <div className="fam-suggest" role="group" aria-label="Your topics">
          {available.slice(0, 3).map(item => <button key={item.id} type="button" className="fam-suggest-chip" onClick={() => onUseMaterial(item.id)}><MenuBookRounded aria-hidden />Use {item.title}</button>)}
          <button type="button" className="fam-suggest-chip" onClick={onTopic}><AddRounded aria-hidden />Pick a new topic</button>
        </div>}
        {materialIds.length > 0 && <div className="fam-suggest" role="group" aria-label="Ideas">
          <button type="button" className="fam-suggest-chip" onClick={() => onCreate('quiz')}><QuizRounded aria-hidden />Make a quiz</button>
          <button type="button" className="fam-suggest-chip" onClick={() => { change(`Explain ${topicName} to ${child.displayName} in a simple way, with one example.`); input.current?.focus(); }}><LightbulbOutlined aria-hidden />Explain it simply</button>
        </div>}
        {conversation.isPending && <CircularProgress size={24} aria-label="Loading the chat" />}
        {conversation.isError && <Alert severity="error" action={<Button onClick={() => conversation.refetch()}>Try again</Button>}>Could not load the chat.</Alert>}
        {items.map((item, index) => {
          if (item.kind === 'act') return <React.Fragment key={item.key}>{dayRow(item.at)}
            <ActivityCard row={item.row} attempt={attempts.find(a => a.activityId === item.row.id)} onOpen={onActivity} /></React.Fragment>;
          const { turn } = item; const status = turn.activity.status; const latest = index === items.length - 1;
          return <React.Fragment key={item.key}>{dayRow(item.at)}
            <div className="fam-msg fam-msg-me"><div className="fam-bubble">{turn.text}</div></div>
            <span className="fam-time fam-time-me">{item.at ? clock(item.at) : ''}</span>
            {running(turn.activity) ? <Thinking since={item.at || Date.now()} topic={topicName} />
              : <div className="fam-msg fam-msg-ai" key={`${turn.id}:${status}`} data-fresh-answer={latest}>
                <span className="fam-msg-avatar" aria-hidden><AutoAwesomeRounded /></span>
                <div className="fam-bubble fam-bubble-answer">{turn.activity.result ? <><div className="fam-prose"><MathText text={turn.activity.result.explanation || turn.activity.result.message} /></div>
                  {turn.activity.result.references?.length > 0 && <Typography className="fam-small">From {turn.activity.result.references.map(r => `${turn.activity.sourceFiles?.[r.fileNumber - 1]?.name || `file ${r.fileNumber}`}, page ${r.page}`).join(' · ')}</Typography>}</>
                  : <Alert severity="warning">{turn.activity.error || 'This reply couldn’t finish. Please send the question again.'}</Alert>}</div>
              </div>}
          </React.Fragment>;
        })}
        {outgoing && <>{dayRow(outgoing.at)}
          <div className="fam-msg fam-msg-me fam-sending"><div className="fam-bubble">{outgoing.text}</div></div>
          <span className="fam-time fam-time-me">Sending…</span>
          <Thinking since={outgoing.at} topic={topicName} /></>}
      </div>
    </div>
    <div className="fam-compose-wrap">
      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 1 }}>{error}</Alert>}
      <div className="fam-compose">
        <div className="fam-compose-chips">
          {materials.map(item => <span key={item.id} className="fam-topic-chip"><MenuBookRounded aria-hidden /><button type="button" className="fam-topic-chip-name" onClick={onMaterials}>{item.title}</button>
            <IconButton size="small" aria-label={`Stop using ${item.title}`} onClick={() => onToggleMaterial(item.id)}><CloseRounded fontSize="small" /></IconButton></span>)}
          <Button size="small" startIcon={<AddRounded />} onClick={onTopic}>{materials.length ? (compact ? 'Add' : 'Add topic or worksheet') : 'Pick a topic'}</Button>
        </div>
        <div className="fam-compose-row">
          <TextField inputRef={input} fullWidth multiline minRows={1} maxRows={4} variant="standard" className="fam-compose-input"
            placeholder={materialIds.length ? (waiting || outgoing ? 'You can type your next question…' : compact ? 'Ask a question…' : `Ask anything about ${topicName}`) : 'Pick a topic to start'} value={text} onChange={e => change(e.target.value)}
            InputProps={{ disableUnderline: true }} inputProps={{ maxLength: 4000, 'aria-label': 'Message' }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }} />
          <IconButton className="fam-send" aria-label={waiting || outgoing ? 'Wait for the answer before sending' : 'Send'} disabled={!canSend} onClick={send}><ArrowUpwardRounded /></IconButton>
        </div>
      </div>
      <Typography className="fam-small fam-disclaimer">{waiting || outgoing ? 'Answering… you can send your next question when it’s done.' : `AI can make mistakes. Check before you share it with ${child.displayName}.`}</Typography>
    </div>
    <Dialog open={context} onClose={() => !busy && setContext(false)} fullWidth maxWidth="sm" className="fam-dialog"><DialogTitle>Explanation style</DialogTitle><DialogContent>
      <div className="fam-form"><Typography className="fam-lead-s">Tell us what works for {child.displayName}. We only use the topics you pick and this chat.</Typography>
      <TextField fullWidth multiline minRows={3} label="Your note" placeholder="For example: short sentences, lots of pictures in words, use football examples" value={preference} inputProps={{ maxLength: 500 }} onChange={e => setPreference(e.target.value)} /></div>
    </DialogContent><DialogActions><Button onClick={() => setContext(false)} disabled={busy}>Cancel</Button><Button variant="contained" disabled={busy} onClick={saveContext}>{busy ? 'Saving…' : 'Save'}</Button></DialogActions></Dialog>
    <Dialog open={newDialog} onClose={() => !busy && setNewDialog(false)} fullWidth maxWidth="xs" className="fam-dialog"><DialogTitle>Start a new chat?</DialogTitle>
      <DialogContent><Typography>Nothing is deleted. Your topics, quizzes and scores stay, and the old messages are kept. The new chat simply starts fresh.</Typography></DialogContent>
      <DialogActions><Button onClick={() => setNewDialog(false)}>Cancel</Button><Button variant="contained" disabled={busy || waiting} onClick={newConversation}>{busy ? 'Starting…' : 'Start a new chat'}</Button></DialogActions></Dialog>
  </section>;
}
