import React, { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, ListItemIcon, Menu, MenuItem, TextField, Typography, useMediaQuery } from '@mui/material';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import AccountMenu from '../../components/common/AccountMenu';
import logo from '../../assets/mst_logo_no_bg.png';
import darkLogo from '../../assets/mst_logo_dark_no_bg.png';
import { useThemeMode } from '../../hooks/useThemeMode';
import AddRounded from '@mui/icons-material/AddRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import AttachFileRounded from '@mui/icons-material/AttachFileRounded';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import FamilyLearning from './FamilyLearning';
import { hasMode } from '../../services/accountModes';
import { queryClient, sessionGeneration } from '../../services/queryCache';
import { childTone } from './familyWords';
import './family.css';

const YEARS = Array.from({ length: 11 }, (_, i) => `Year ${i + 1}`);
const blankChild = () => ({ id: crypto.randomUUID(), name: '', year: '', notes: '', files: [], uploadId: crypto.randomUUID() });

/** The parent space: its own calm, solid look (scoped by <html data-space="family">, so dialogs and menus follow). */
function useFamilySpace() {
  useEffect(() => {
    const root = document.documentElement; root.setAttribute('data-space', 'family');
    return () => root.removeAttribute('data-space');
  }, []);
}

export function ChildAvatar({ child, size = 36 }) {
  return <span className="fam-avatar" style={{ '--fam-avatar': childTone(child?.id), width: size, height: size, fontSize: size * 0.44 }} aria-hidden>
    {(child?.displayName || child?.name || '?').trim().charAt(0).toUpperCase() || '?'}</span>;
}

/** Name and school year are all a parent must give; notes and worksheets are optional. */
function ChildForm({ form, setForm, busy, compact, welcome, nameRef }) {
  const locked = busy || form.saved;
  const yearRefs = useRef([]);
  const pickYear = year => setForm({ ...form, year });
  function onYearKey(e, i) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return; e.preventDefault();
    const next = (i + step + YEARS.length) % YEARS.length; pickYear(YEARS[next]); yearRefs.current[next]?.focus();
  }
  return <div className="fam-form">
    <TextField inputRef={nameRef} label="First name" placeholder="For example: Sam" value={form.name} autoComplete="off" inputProps={{ maxLength: 255 }} className="fam-field-lg"
      onChange={e => setForm({ ...form, name: e.target.value })} disabled={locked} fullWidth />
    <div>
      <Typography component="div" className="fam-label" id={`year-${form.id}`}>School year</Typography>
      <div className="fam-years" role="radiogroup" aria-labelledby={`year-${form.id}`} data-size={welcome ? 'lg' : 'md'}>
        {YEARS.map((year, i) => { const on = form.year === year; return <button type="button" key={year} role="radio" aria-checked={on}
          ref={el => { yearRefs.current[i] = el; }} tabIndex={on || (!form.year && i === 0) ? 0 : -1}
          className="fam-year" data-on={on} disabled={locked} onClick={() => pickYear(year)} onKeyDown={e => onYearKey(e, i)}>
          {on && <CheckRounded aria-hidden />}{year}</button>; })}
      </div>
    </div>
    {!welcome && <TextField label="Anything we should know? (optional)" placeholder="For example: finds fractions tricky" value={form.notes || ''}
      disabled={locked} inputProps={{ maxLength: 500 }} onChange={e => setForm({ ...form, notes: e.target.value })} fullWidth />}
    {!form.edit && !welcome && <div className="fam-attach">
      <Button component="label" disabled={locked} startIcon={<AttachFileRounded />}>Add worksheet photos (optional)
        <input hidden type="file" multiple accept=".pdf,.png,.jpg,.jpeg" onChange={e => setForm({ ...form, files: Array.from(e.target.files || []) })} /></Button>
      {form.files?.length > 0 && <Typography className="fam-small">{form.files.map(f => f.name).join(' · ')}</Typography>}
    </div>}
  </div>;
}

export default function FamilyHome() {
  useFamilySpace();
  const { user, enableMode } = useAuth();
  const { mode } = useThemeMode();
  const enabled = hasMode(user, 'parent');
  const generation = sessionGeneration();
  const key = ['family', generation, user?.id, 'children'];
  const children = useQuery({ queryKey: key, enabled: !!user?.id && enabled,
    queryFn: async ({ signal }) => (await api.get('/api/parent/settings/manual-learners', { signal })).data });
  const [params, setParams] = useSearchParams();
  let rememberedChild = '';
  try { rememberedChild = sessionStorage.getItem(`mst.family.child.${user?.id}`) || ''; } catch { /* Storage is optional. */ }
  const selected = params.get('child') || rememberedChild;
  const setSelected = id => {
    try { sessionStorage.setItem(`mst.family.child.${user.id}`, id); } catch { /* URL selection still works. */ }
    setParams(id ? { child: id } : {}, { replace: true });
  };
  const [form, setForm] = useState(null);
  const [welcome, setWelcome] = useState(blankChild);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [removeAsk, setRemoveAsk] = useState(false);
  const [childMenu, setChildMenu] = useState(null);
  const phone = useMediaQuery('(max-width:599px)');
  const nameRef = useRef(null);
  const tabRefs = useRef({});
  // Never let account changes inherit child selection or pending form contents.
  useEffect(() => { setForm(null); setWelcome(blankChild()); setError(''); }, [user?.id]);
  const rows = children.data?.filter(child => child.isActive !== false) || [];
  const child = selected ? rows.find(item => item.id === selected) : rows[0];
  const firstRun = enabled && children.isSuccess && rows.length === 0;
  function addChild() { setError(''); setForm(blankChild()); }
  function editChild() { if (!child) return; setError(''); setForm({ id: child.id, name: child.displayName, year: child.gradeLevel || '', notes: child.notes || '', files: [], uploadId: crypto.randomUUID(), edit: true }); }
  async function save(current, setCurrent, done) {
    const currentGeneration = sessionGeneration();
    setBusy(true); setError('');
    try {
      const method = current.edit ? 'patch' : 'put';
      if (!current.saved) await api[method](`/api/parent/settings/manual-learners/${current.id}`, {
        displayName: current.name.trim(), gradeLevel: current.year, notes: current.notes || null,
      });
      if (currentGeneration !== sessionGeneration()) return;
      await queryClient.invalidateQueries({ queryKey: key });
      setSelected(current.id);
      // Child creation succeeds once. Optional upload retries keep its own immutable key.
      setCurrent(value => ({ ...value, saved: true }));
      if (current.files?.length) {
        const body = new FormData(); body.append('title', current.notes?.slice(0, 100) || 'Worksheet'); body.append('purpose', 'learning'); current.files.forEach(file => body.append('files', file));
        await api.put(`/api/family/children/${current.id}/materials/${current.uploadId}`, body, { timeout: 120000, headers: { 'Content-Type': undefined } });
        await queryClient.invalidateQueries({ queryKey: ['family', currentGeneration, user.id, current.id] });
      }
      if (currentGeneration === sessionGeneration()) done();
    } catch (e) {
      if (currentGeneration === sessionGeneration()) setError(typeof e.response?.data?.detail === 'string' ? e.response.data.detail : 'Could not save. Please try again.');
    } finally { setBusy(false); }
  }
  async function removeChild() {
    const currentGeneration = sessionGeneration(); const id = form?.id;
    setBusy(true); setError('');
    try {
      await api.delete(`/api/parent/settings/manual-learners/${id}`);
      if (currentGeneration !== sessionGeneration()) return;
      await queryClient.invalidateQueries({ queryKey: key });
      const next = rows.find(item => item.id !== id); setSelected(next ? next.id : '');
      setRemoveAsk(false); setForm(null);
    } catch (e) { if (currentGeneration === sessionGeneration()) { setRemoveAsk(false); setError(typeof e.response?.data?.detail === 'string' ? e.response.data.detail : 'Could not remove. Please try again.'); } }
    finally { setBusy(false); }
  }
  function onTabKey(e, index) {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!step) return;
    e.preventDefault(); const next = rows[(index + step + rows.length) % rows.length]; setSelected(next.id); tabRefs.current[next.id]?.focus();
  }
  if (user?.role === 'admin') return <Alert severity="info">Use an adult account for family learning.</Alert>;
  const ready = form && form.name.trim() && form.year;
  const welcomeReady = welcome.name.trim() && welcome.year;
  const account = <AccountMenu compact={phone} />;
  return <div className="fam-app">
    {!(phone && rows.length > 0) && <header className="fam-top">
      <img src={mode === 'dark' ? darkLogo : logo} alt="MySmartTeach" className="fam-logo" />
      <span className="fam-top-label">Parent mode</span>
      <span className="fam-grow" />{account}
    </header>}
    {!enabled ? <main className="fam-centre-page"><section className="fam-welcome">
      <Typography component="h1" className="fam-title">Start Parent mode</Typography>
      <Typography className="fam-lead">Help your own child at home. Your family space stays separate from your teaching.</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Button variant="contained" size="large" fullWidth disabled={busy} onClick={async () => {
        setBusy(true); setError('');
        try { await enableMode('parent'); } catch (e) { setError(e.message || 'Could not start Parent mode.'); } finally { setBusy(false); }
      }}>{busy ? 'Starting…' : 'Start Parent mode'}</Button></section></main>
    : children.isPending ? <main className="fam-centre-page"><CircularProgress aria-label="Loading your children" /></main>
    : children.isError ? <main className="fam-centre-page"><Alert severity="error" action={<Button onClick={() => children.refetch()}>Try again</Button>}>Could not load your children.</Alert></main>
    : firstRun ? <main className="fam-centre-page"><form className="fam-welcome" onSubmit={e => { e.preventDefault(); if (welcomeReady && !busy) void save(welcome, setWelcome, () => setWelcome(blankChild())); }}>
        <Typography component="h1" className="fam-title">Let’s set up your child</Typography>
        <Typography className="fam-lead">We’ll make quizzes and help that fit their school year. No school account needed.</Typography>
        <ChildForm form={welcome} setForm={setWelcome} busy={busy} compact={phone} welcome />
        {error && <Alert severity="error">{error}{welcome.saved && ' Your child is saved. Try the upload again, or add worksheets later.'}</Alert>}
        <Button type="submit" variant="contained" size="large" fullWidth disabled={busy || !welcomeReady}>{busy ? 'Saving…' : welcome.saved ? 'Try the upload again' : 'Start'}</Button>
        {!welcomeReady && <Typography className="fam-small fam-hint">Add a first name and a school year to start.</Typography>}
        <ol className="fam-steps-line" aria-label="How it works"><li data-on="true" aria-current="step"><b>1</b> Add your child</li><li><b>2</b> Pick a topic</li><li><b>3</b> Learn together</li></ol>
      </form></main>
    : <>
      <nav className="fam-childbar" aria-label="Your children">
        {phone && rows.length > 1 ? <>
          <button type="button" className="fam-tab fam-tab-switch" data-on="true" aria-haspopup="menu" aria-expanded={!!childMenu} onClick={e => setChildMenu(e.currentTarget)}
            aria-label={`${child?.displayName || 'Child'}, ${child?.gradeLevel || ''}. Change child`}>
            <ChildAvatar child={child} size={32} />
            <span className="fam-tab-text"><span className="fam-tab-name">{child?.displayName}</span><span className="fam-tab-year">{child?.gradeLevel || 'Year not set'}</span></span>
            <ExpandMoreRounded className="fam-chev" data-open={!!childMenu} aria-hidden /></button>
          <Menu open={!!childMenu} anchorEl={childMenu} onClose={() => setChildMenu(null)} className="fam-child-menu">
            {rows.map(item => <MenuItem key={item.id} selected={item.id === child?.id} onClick={() => { setChildMenu(null); setSelected(item.id); }}>
              <ListItemIcon><ChildAvatar child={item} size={28} /></ListItemIcon>{item.displayName} · {item.gradeLevel || 'Year not set'}</MenuItem>)}
            <Divider />
            <MenuItem onClick={() => { setChildMenu(null); addChild(); }}><ListItemIcon><AddRounded /></ListItemIcon>Add a child</MenuItem>
          </Menu>
        </> : <div className="fam-tabs" role="tablist" aria-label="Choose a child">
          {rows.map((item, index) => { const on = item.id === child?.id; return <button key={item.id} type="button" role="tab" aria-selected={on}
            tabIndex={on ? 0 : -1} ref={el => { tabRefs.current[item.id] = el; }} className="fam-tab" data-on={on}
            onClick={() => setSelected(item.id)} onKeyDown={e => onTabKey(e, index)}>
            <ChildAvatar child={item} size={phone ? 32 : 40} />
            <span className="fam-tab-text"><span className="fam-tab-name">{item.displayName}</span><span className="fam-tab-year">{item.gradeLevel || 'Year not set'}</span></span>
          </button>; })}
          <Button className="fam-addchild" onClick={addChild} startIcon={<AddRounded />} aria-label="Add a child">{phone ? 'Child' : 'Add child'}</Button>
        </div>}
        <span className="fam-grow" />
        <Button variant="outlined" className="fam-edit" onClick={editChild} disabled={!child} startIcon={phone ? null : <EditRounded />} aria-label={`Edit ${child?.displayName || 'child'}`}>Edit</Button>
        {phone && account}
      </nav>
      {child ? <FamilyLearning key={`${user.id}:${child.id}`} child={child} /> :
        <main className="fam-centre-page"><Alert severity="warning">That child isn’t available. Choose one of your children above.</Alert></main>}
    </>}
    {error && !form && !firstRun && <Alert severity="error" className="fam-float-error" onClose={() => setError('')}>{error}</Alert>}
    <Dialog open={!!form} onClose={() => { if (!busy) setForm(null); }} fullWidth maxWidth="xs" fullScreen={phone}
      TransitionProps={{ onEntered: () => nameRef.current?.focus() }} className="fam-dialog">
      <DialogTitle>{form?.edit ? `Edit ${child?.displayName || 'child'}` : 'Add a child'}</DialogTitle>
      <DialogContent>{form && <ChildForm form={form} setForm={setForm} busy={busy} compact={phone} nameRef={nameRef} />}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}{form?.saved && ' Your child is saved. Try the upload again, or close and add worksheets from their notebook.'}</Alert>}
        {form?.edit && !form?.saved && <div className="fam-remove-row"><Button className="fam-danger" disabled={busy} onClick={() => setRemoveAsk(true)}>Remove {child?.displayName || 'this child'}…</Button></div>}
      </DialogContent>
      <DialogActions>{!ready && !form?.saved && <Typography className="fam-small fam-hint fam-grow">Add a first name and a school year.</Typography>}
        <Button disabled={busy} onClick={() => setForm(null)}>Cancel</Button>
        <Button variant="contained" disabled={busy || !ready} onClick={() => save(form, setForm, () => setForm(null))}>{busy ? 'Saving…' : form?.saved ? 'Try the upload again' : form?.edit ? 'Save changes' : 'Add child'}</Button>
      </DialogActions>
    </Dialog>
    <Dialog open={removeAsk} onClose={() => { if (!busy) setRemoveAsk(false); }} maxWidth="xs" fullWidth className="fam-dialog">
      <DialogTitle>Remove {child?.displayName || 'this child'}?</DialogTitle>
      <DialogContent><Typography>{child?.displayName || 'They'} will no longer show in Parent mode. Anything already saved is kept safely on our side.</Typography></DialogContent>
      <DialogActions><Button disabled={busy} onClick={() => setRemoveAsk(false)}>Keep</Button><Button variant="contained" className="fam-danger-fill" disabled={busy} onClick={removeChild}>{busy ? 'Removing…' : 'Remove'}</Button></DialogActions>
    </Dialog>
  </div>;
}
