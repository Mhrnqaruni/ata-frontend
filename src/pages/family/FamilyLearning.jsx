import React, { useEffect, useRef, useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Menu, MenuItem, Paper, Stack, IconButton,
  TextField, Typography } from '@mui/material';
import CloseRounded from '@mui/icons-material/CloseRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import UploadFileRounded from '@mui/icons-material/UploadFileRounded';
import AutoStoriesRounded from '@mui/icons-material/AutoStoriesRounded';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { queryClient, sessionGeneration } from '../../services/queryCache';
import api from '../../services/api';
import FamilyResult from './FamilyResult';
import FamilySource from './FamilySource';

const active = row => ['queued', 'running'].includes(row?.status);
const kindLabel = { learn: 'Explanation', quiz: 'Quiz', flashcards: 'Flashcards', check: 'Work check' };
const panel = { p: { xs: 2, sm: 3 }, borderRadius: '16px',
  background: theme => theme.palette.mode === 'dark' ? 'rgba(17,29,51,.96)' : 'rgba(247,250,255,.98)' };

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
  const selectionKey = ['family', generation, user.id, child.id, 'selectedActivity'];
  const [activityId, setActivityIdState] = useState(() => queryClient.getQueryData(selectionKey));
  const setActivityId = id => { setActivityIdState(id); queryClient.setQueryData(selectionKey, id); };
  const [topicDialog, setTopicDialog] = useState(false);
  const [upload, setUpload] = useState(null);
  const [more, setMore] = useState(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [actionKind, setActionKind] = useState(null);
  const [confirmNew, setConfirmNew] = useState(null);
  const [count, setCount] = useState('5');
  const [focus, setFocus] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [recordError, setRecordError] = useState('');
  const [pending, setPending] = useState(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const valid = () => alive.current && generation === sessionGeneration();
  const sources = home.data?.materials || [];
  const history = home.data?.activities || [];
  const selectedActivityId = activityId === undefined ? history[0]?.id : activityId;
  const detailKey = ['family', generation, user.id, child.id, 'activity', selectedActivityId];
  const detail = useQuery({ queryKey: detailKey, enabled: Boolean(selectedActivityId),
    queryFn: async ({ signal }) => (await api.get(`${base}/activities/${selectedActivityId}`, { signal })).data,
    refetchInterval: query => active(query.state.data) ? 2500 : false });
  const activity = detail.data;
  useEffect(() => {
    if (activity) { setCount(String(activity.count)); setFocus(activity.focus || ''); setRecordError(''); }
  }, [activity?.id]);
  const source = sources.find(item => item.id === sourceId) || (!sourceId && sources.find(item => item.id === activity?.materialId));
  const years = Number((child.gradeLevel || '').replace(/[^0-9]/g, ''));
  const topics = catalogue.data?.topics || [];
  const suggested = topics.filter(topic => topic.year === years);
  async function refresh() { await queryClient.invalidateQueries({ queryKey: key }); }
  async function command(work, onError) {
    if (busy) return false;
    setBusy(true); setError('');
    try { await work(); return true; }
    catch (e) { if (valid()) { const message = typeof e.response?.data?.detail === 'string' ? e.response.data.detail : 'This could not finish. Your saved work is safe.'; setError(message); onError?.(message); } return false; }
    finally { if (valid()) setBusy(false); }
  }
  function selectSource(id) { setSetupOpen(true); setSourceId(id); setActivityId(null); setFocus(''); setPending(null); setError(''); }
  function choose(topic) {
    const existing = sources.find(item => item.provenance?.id === topic.id);
    if (existing) { selectSource(existing.id); setTopicDialog(false); return; }
    const request = pending?.type === 'topic' && pending.topicId === topic.id ? pending : { type: 'topic', id: crypto.randomUUID(), topicId: topic.id };
    setPending(request);
    void command(async () => {
      const { data } = await api.put(`${base}/topics/${request.id}`, { topicId: topic.id });
      await refresh(); if (valid()) { selectSource(data.id); setTopicDialog(false); }
    });
  }
  function newUpload(purpose) { setError(''); setUpload({ id: crypto.randomUUID(), purpose, title: '', files: [] }); }
  function addMissingPages() {
    if (!source) return;
    void command(async () => {
      // Preserve original answer pages in a NEW immutable group, not an in-place edit.
      const files = await Promise.all(source.files.map(async (file, index) => {
        const { data } = await api.get(`${base}/materials/${source.id}/files/${index}`, { responseType: 'blob' });
        return new File([data], file.name, { type: file.mime });
      }));
      if (valid()) setUpload({ id: crypto.randomUUID(), purpose: source.purpose,
        title: source.title, files, reason: 'missing' });
    });
  }
  function saveUpload() {
    const captured = upload;
    setUpload({ ...upload, submitted: true });
    void command(async () => {
      const form = new FormData(); form.append('title', captured.title); form.append('purpose', captured.purpose);
      captured.files.forEach(file => form.append('files', file));
      const { data } = await api.put(`${base}/materials/${captured.id}`, form, { timeout: 120000, headers: { "Content-Type": undefined } });
      await refresh(); if (valid()) { selectSource(data.id); setUpload(null); }
    });
  }
  function start(kind, again = false, requestedCount = Number(count) || 5) {
    if (!source) return;
    const payload = { materialId: source.id, kind, count: requestedCount, focus };
    const signature = JSON.stringify({ ...payload, again });
    const request = pending?.type === 'activity' && pending.signature === signature ? pending : {
      type: 'activity', id: crypto.randomUUID(), signature,
      payload: again ? { ...payload, newAttemptKey: crypto.randomUUID() } : payload,
    };
    setPending(request);
    void command(async () => {
      const { data } = await api.put(`${base}/activities/${request.id}`, request.payload);
      await refresh(); if (valid()) { setActivityId(data.id); setPending(null); setSetupOpen(false); setActionKind(null); }
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
  if (home.isPending) return <CircularProgress aria-label="Loading saved learning" />;
  if (home.isError && (!home.data || [403,404].includes(home.error?.response?.status))) return <Alert severity="error" action={<Button onClick={() => home.refetch()}>Retry</Button>}>Could not load this child's learning space.</Alert>;
  return <Stack spacing={2.5}>
    {home.isError && <Alert severity="warning" action={<Button onClick={() => home.refetch()}>Refresh</Button>}>Couldn’t refresh. Showing the last saved update.</Alert>}
    <Paper sx={panel}>
      {selectedActivityId && !setupOpen ? <>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ sm: 'center' }}>
          <Box><Typography variant="overline">For {child.displayName} · {child.gradeLevel}</Typography>
            <Typography variant="subtitle1">{source?.title || 'Saved activity'}</Typography></Box>
          <Button variant="outlined" size="small" onClick={() => setSetupOpen(true)}>Prepare another activity</Button>
        </Stack>
        {source && <FamilySource key={source.id} base={base} source={source} />}
      </> : <>
      {selectedActivityId && <Button size="small" sx={{ mb: 1 }} onClick={() => setSetupOpen(false)}>Back to saved activity</Button>}
      <Typography variant="h4">{source ? source.title : `What would you like to help ${child.displayName} with?`}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 2 }}>Choose a starting point. Review each activity before using it together.</Typography>
      {!source ? <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <Button variant="contained" startIcon={<AutoStoriesRounded />} onClick={() => setTopicDialog(true)}>Choose a Maths topic</Button>
        <Button variant="outlined" startIcon={<UploadFileRounded />} onClick={() => newUpload('learning')}>Upload material</Button>
        <Button onClick={() => newUpload('work')}>Check completed work</Button>
      </Stack> : <Stack spacing={2}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip size="small" label={child.gradeLevel || 'Year not set'} />
          <Chip size="small" label={source.files.length ? `${source.files.length} file(s) · ${source.files.reduce((n, f) => n + f.pages, 0)} pages` : 'MST starter notes'} />
          <Button size="small" onClick={() => { setSourceId(''); setActivityId(null); setPending(null); }}>Change material</Button>
        </Stack>
        <FamilySource key={source.id} base={base} source={source} />
        <Accordion disableGutters elevation={0} sx={{ bgcolor: 'transparent', borderRadius: 0 }}>
          <AccordionSummary expandIcon={<ExpandMoreRounded />}>Focus on a topic or page (optional)</AccordionSummary>
          <AccordionDetails><TextField fullWidth size="small" label="Topic or pages" value={focus} onChange={e => setFocus(e.target.value)} inputProps={{ maxLength: 300 }} /></AccordionDetails>
        </Accordion>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
          <Button variant="contained" disabled={busy} onClick={() => start(source.purpose === 'work' ? 'check' : 'learn')}>
            {source.purpose === 'work' ? 'Check this work' : 'Prepare an explanation'}</Button>
          <Button variant="outlined" disabled={busy} onClick={() => setActionKind('quiz')}>Make a quiz</Button>

          <Button aria-haspopup="menu" onClick={e => setMore(e.currentTarget)}>More activities</Button>
        </Stack>
        <Menu open={Boolean(more)} anchorEl={more} onClose={() => setMore(null)}>
          <MenuItem onClick={() => { setMore(null); setActionKind('flashcards'); }}>Make flashcards</MenuItem>
          <MenuItem onClick={() => { setMore(null); newUpload('work'); }}>Check other work</MenuItem>
        </Menu>
      </Stack>}
      </>}
      {busy && <LinearProgress sx={{ mt: 2 }} aria-label="Saving your request" />}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </Paper>
    {selectedActivityId && <Paper sx={panel}>
      {detail.isPending ? <CircularProgress aria-label="Loading preparation" /> : detail.isError && (!activity || [403,404].includes(detail.error?.response?.status)) ?
        <Alert severity="error" action={<Button onClick={() => detail.refetch()}>Retry</Button>}>Could not load this preparation.</Alert> : activity && <>
          {detail.isError && <Alert severity="warning" action={<Button onClick={() => detail.refetch()}>Refresh status</Button>}>Couldn’t refresh. Showing the last saved update.</Alert>}
          <Typography variant="overline">{kindLabel[activity.kind]} · {child.displayName} · {activity.year}</Typography>
          {active(activity) ? <Stack spacing={1.5}><Typography variant="h5">{activity.stage}</Typography><LinearProgress />
            <Typography color="text.secondary">{Math.floor(seconds / 60)}m {seconds % 60}s elapsed · You can leave and return to this saved preparation.</Typography></Stack> :
            activity.result ? <FamilyResult key={activity.id} activity={activity} onRecord={record} busy={busy} attempts={home.data.attempts}
              draftKey={['family', generation, user.id, child.id, 'quizDraft', activity.id]} saveError={recordError}
              sourceFiles={source?.files || []} onNext={() => start('quiz', false, 3)} /> :
            <Alert severity="warning">{activity.error || activity.stage} {activity.status === 'outcome_unknown' ? 'Review this outcome before deliberately starting a new preparation, which may incur another AI charge.' : ''}</Alert>}
          {!active(activity) && <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
            {activity.status === 'needs_input' && <Button variant="contained" disabled={busy} onClick={addMissingPages}>Add missing pages</Button>}
            {['needs_input','failed'].includes(activity.status) && <Button onClick={() => { setSourceId(''); setActivityId(null); setSetupOpen(true); }}>Choose another material</Button>}
            {activity.status === 'outcome_unknown' && <Button variant="contained" onClick={() => detail.refetch()}>Check saved status</Button>}
            <Button size="small" disabled={busy || !source} onClick={() => setConfirmNew(activity.kind)}>Prepare a new version</Button>
          </Stack>}
        </>}
    </Paper>}
    {sources.length > 0 && <Accordion disableGutters elevation={0} sx={{ borderRadius: 2 }}>
      <AccordionSummary expandIcon={<ExpandMoreRounded />}><Typography>Materials · {sources.length}</Typography></AccordionSummary>
      <AccordionDetails><Stack spacing={1}>
        <Stack direction="row" spacing={1}><Button onClick={() => setTopicDialog(true)}>Choose a Maths topic</Button><Button onClick={() => newUpload('learning')}>Upload material</Button></Stack>
        {sources.map(item => <Button key={item.id} sx={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => selectSource(item.id)}>{item.title}</Button>)}
      </Stack></AccordionDetails>
    </Accordion>}
    {history.length > 0 && <Accordion disableGutters elevation={0}>
      <AccordionSummary expandIcon={<ExpandMoreRounded />}><Typography>Recent work & recorded practice</Typography></AccordionSummary>
      <AccordionDetails><Stack spacing={1}>
        <Typography variant="body2" color="text.secondary">{home.data.attempts.length} parent-recorded practice sessions shown. Generated activities are not counted as completed learning.</Typography>
        {history.map(row => <Button key={row.id} sx={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => { setActivityId(row.id); setSourceId(row.materialId); }}>
          {kindLabel[row.kind]} · {row.title} · {row.status.replace('_', ' ')}</Button>)}
      </Stack></AccordionDetails>
    </Accordion>}
    <Dialog open={topicDialog} onClose={() => { if (!busy) setTopicDialog(false); }} fullWidth maxWidth="sm">
      <DialogTitle>Maths starter topics</DialogTitle><DialogContent>
        <Typography color="text.secondary" sx={{ mb: 2 }}>A small set of original MST topics. Upload material for other subjects.</Typography>
        {catalogue.isError && <Alert severity="error" action={<Button onClick={() => catalogue.refetch()}>Retry</Button>}>Topics could not load.</Alert>}
        {suggested.length > 0 && <Typography variant="subtitle2">Suggested for {child.gradeLevel}</Typography>}
        {catalogue.isPending && <CircularProgress aria-label="Loading starter topics" />}
        {!catalogue.isPending && !catalogue.isError && topics.length === 0 && <Typography>No starter topics are available. You can upload material instead.</Typography>}
        <Stack spacing={1}>{suggested.map(topic => <Button key={topic.id} disabled={busy} variant="outlined" sx={{ justifyContent: 'flex-start', textAlign: 'left', minHeight: 44 }} onClick={() => choose(topic)}>{topic.title}</Button>)}</Stack>
        {topics.length > suggested.length && <Accordion disableGutters elevation={0} sx={{ mt: 2, bgcolor: 'transparent' }}>
          <AccordionSummary expandIcon={<ExpandMoreRounded />}>Browse other years</AccordionSummary>
          <AccordionDetails><Stack spacing={1}>{topics.filter(t => !suggested.includes(t)).map(topic =>
            <Button key={topic.id} disabled={busy} sx={{ justifyContent: 'flex-start', textAlign: 'left', minHeight: 44 }} onClick={() => choose(topic)}>Year {topic.year} · {topic.title}</Button>)}</Stack></AccordionDetails>
        </Accordion>}
        <Typography variant="caption" color="text.secondary">Secondary year placement is a suggestion, not compulsory curriculum sequencing.</Typography>
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent><DialogActions><Button disabled={busy} onClick={() => { setTopicDialog(false); newUpload('learning'); }}>Upload material</Button><Button onClick={() => setTopicDialog(false)} disabled={busy}>Close</Button></DialogActions>
    </Dialog>
    <Dialog open={!!upload} onClose={() => { if (!busy) setUpload(null); }} fullWidth maxWidth="sm">
      <DialogTitle>{upload?.reason === 'missing' ? 'Add missing pages' : upload?.purpose === 'work' ? 'Upload completed work' : 'Upload learning material'}</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
        <Typography color="text.secondary">PDF, PNG or JPG · up to 10 files, 20 pages and 20 MB combined. Upload only pages you may use.</Typography>
        {upload?.reason === 'missing' ? <Typography>Your original pages are included below. Add the missing questions or answer key, then save the combined files.</Typography> : upload?.purpose === 'work' && <Typography>Include the questions with the answers. Add the answer key too if you have one.</Typography>}
        <TextField label="Material name (optional)" size="small" value={upload?.title || ''} disabled={busy} onChange={e => setUpload({ ...upload, title: e.target.value, changed: upload.submitted || upload.changed })} />
        <Button component="label" variant="outlined" startIcon={<UploadFileRounded />} disabled={busy}>{upload?.files.length ? 'Add more files' : 'Choose files'}
          <input hidden type="file" multiple accept=".pdf,.png,.jpg,.jpeg" onChange={e => {
            const files = [...upload.files, ...Array.from(e.target.files || [])].filter((file, index, all) =>
              all.findIndex(other => other.name === file.name && other.size === file.size && other.lastModified === file.lastModified) === index);
            setUpload({ ...upload, files, changed: upload.submitted || upload.changed });
            e.target.value = ''; // Allow reselecting a file after removing it.
          }} />
        </Button>
        {(upload?.files || []).map((file,i) => <Stack key={i} direction="row" spacing={1} alignItems="center" sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{i+1}. {file.name}</Typography><Typography variant="caption" color="text.secondary">{Math.ceil(file.size / 1024)} KB</Typography></Box>
          <IconButton disabled={busy} aria-label={`Remove ${file.name}`} onClick={() => setUpload({ ...upload, files: upload.files.filter((_, index) => index !== i), changed: upload.submitted || upload.changed })}><CloseRounded fontSize="small" /></IconButton>
        </Stack>)}
        {error && <Alert severity="error">{error}</Alert>}
        {upload?.changed && <Alert severity="info">The previous upload may already be saved. Keep it separate from these edits.
          <Button onClick={() => { setUpload(null); void refresh(); }}>Check saved materials</Button>
          <Button onClick={() => setUpload({ ...upload, id: crypto.randomUUID(), submitted: false, changed: false })}>Save changed files separately</Button></Alert>}
        <Typography variant="caption" color="text.secondary">Saving files does not start AI generation. Choose an activity next.</Typography>
      </Stack></DialogContent>
      <DialogActions><Button disabled={busy} onClick={() => setUpload(null)}>Cancel</Button>
        <Button variant="contained" disabled={busy || upload?.changed || !upload?.files.length} onClick={saveUpload}>{busy ? 'Saving…' : 'Use these files'}</Button></DialogActions>
    </Dialog>
    <Dialog open={Boolean(actionKind)} onClose={() => { if (!busy) setActionKind(null); }} fullWidth maxWidth="xs">
      <DialogTitle>{actionKind === 'quiz' ? 'Make a practice quiz' : 'Make flashcards'}</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{ pt: 1 }}><Typography color="text.secondary">For {child.displayName} · {source?.title}</Typography>
        <TextField disabled={busy} select label={actionKind === 'quiz' ? 'Questions' : 'Cards'} value={count} onChange={e => setCount(e.target.value)} sx={{ width: 130 }}>
          {[1,3,5,10].map(n => <MenuItem key={n} value={String(n)}>{n}</MenuItem>)}</TextField>
        {error && <Alert severity="error">{error}</Alert>}
      </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={() => setActionKind(null)}>Cancel</Button><Button variant="contained" disabled={busy} onClick={() => start(actionKind)}>Prepare {count} {actionKind === 'quiz' ? 'questions' : 'cards'}</Button></DialogActions>
    </Dialog>
    <Dialog open={Boolean(confirmNew)} onClose={() => setConfirmNew(null)} fullWidth maxWidth="xs">
      <DialogTitle>Prepare a new version?</DialogTitle><DialogContent>
        <Typography>{activity?.status === 'outcome_unknown' ? 'The previous request may have finished. Starting another version may incur another AI charge.' : 'This uses AI again. Your saved version and any practice results will remain available.'}</Typography>
      </DialogContent><DialogActions><Button onClick={() => setConfirmNew(null)}>Keep saved version</Button><Button variant="contained" onClick={() => { const kind = confirmNew; setConfirmNew(null); start(kind, true); }}>Prepare new version</Button></DialogActions>
    </Dialog>
  </Stack>;
}
