import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, CircularProgress, Collapse, Drawer, IconButton, Snackbar, Typography, useMediaQuery } from '@mui/material';
import CheckRounded from '@mui/icons-material/CheckRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import PriorityHighRounded from '@mui/icons-material/PriorityHighRounded';
import QuestionMarkRounded from '@mui/icons-material/QuestionMarkRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import ChatBubbleOutlineRounded from '@mui/icons-material/ChatBubbleOutlineRounded';
import LightbulbOutlined from '@mui/icons-material/LightbulbOutlined';
import DownloadRounded from '@mui/icons-material/DownloadRounded';
import GridViewRounded from '@mui/icons-material/GridViewRounded';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import MathText from '../../components/common/MathTextDisplay';
import api from '../../services/api';
import { savePagesAsPdf } from './pdfPages';
import { forChild, ukDate } from './familyWords';

/* ── helpers ────────────────────────────────────────────────────────────────────────────────────── */
const STATE = { correct: 'ok', needs_work: 'warm', uncertain: 'check' };
const WORD = { ok: 'Right', warm: 'Not quite', check: 'Please check' };
const GLYPH = { ok: CheckRounded, warm: PriorityHighRounded, check: QuestionMarkRounded };
const stateOf = check => STATE[check.judgement] || 'check';
const reduced = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
const possessive = name => `${name}’s`;
/** "01.1" → group "1", chip "1.1"; labels without a number keep their order. */
function parts(label, index) {
  const m = String(label || '').match(/(\d+)(?:\.(\d+))?/);
  if (!m) return { group: 'Other', chip: String(index + 1) };
  const g = String(Number(m[1])); return { group: g, chip: m[2] !== undefined ? `${g}.${Number(m[2])}` : g };
}
/** Mark-scheme style text → sections with bullets: "Starch: a; b. Sugar: c; d" → [{head:'Starch', items:[a,b]}, …]. */
function structure(text) {
  const t = String(text || '').trim(); if (!t) return [];
  const heads = [...t.matchAll(/(^|[.;]\s+)([A-Z][A-Za-z' ]{1,24}):\s+/g)];
  const sections = [];
  if (heads.length) {
    const lead = t.slice(0, heads[0].index + heads[0][1].length).trim(); if (lead) sections.push({ head: '', body: lead });
    heads.forEach((h, k) => { const start = h.index + h[0].length; const end = k + 1 < heads.length ? heads[k + 1].index + heads[k + 1][1].length : t.length;
      sections.push({ head: h[2], body: t.slice(start, end).trim() }); });
  } else sections.push({ head: '', body: t });
  return sections.map(s => ({ head: s.head, items: s.body.split(/;\s*/).map(x => x.trim().replace(/[.;]$/, '')).filter(Boolean) }));
}
/** Simple maths reads as plain text ("$0.0625\\text{ mm}$" → "0.0625 mm", "$60\\,^{\\circ}\\text{C}$" → "60 °C"); real maths stays typeset. */
export function tidy(text) {
  let t = String(text || '').replace(/\$([^$]+)\$/g, (whole, m) => {
    const p = m.replace(/\\text\{([^}]*)\}/g, '$1').replace(/\\(,|;|:|!| )/g, ' ').replace(/\^\{?\\circ\}?/g, '°').replace(/\\mu\s?/g, 'µ')
      .replace(/\\times/g, '×').replace(/\\div/g, '÷').replace(/\\%/g, '%').replace(/\\cdot/g, '·').replace(/\s+/g, ' ').trim();
    return /[\\^_{}]/.test(p) ? whole : p;
  });
  t = t.replace(/(\d)\s*°\s*C\b/g, '$1 °C').replace(/˚/g, '°').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
  return t;
}
/** Mark-scheme slashes as words: "unchanged/orange/brown" → "unchanged, orange or brown". */
const words = text => tidy(text).replace(/\b[A-Za-z][A-Za-z-]*(?:\s?\/\s?[A-Za-z][A-Za-z-]*)+\b/g, m => {
  const p = m.split(/\s?\/\s?/); return p.length === 2 ? p.join(' or ') : `${p.slice(0, -1).join(', ')} or ${p.at(-1)}`; });

function Answer({ text, plain }) {
  text = plain ? words(text) : tidy(text);
  const secs = structure(text);
  const simple = secs.length === 1 && !secs[0].head && secs[0].items.length <= 1;
  if (simple) return <div className="fam-hw-text"><MathText text={text} /></div>;
  return <div className="fam-hw-text">{secs.map((s, i) => <div key={i} className="fam-hw-sec">
    {s.head && <div className="fam-hw-sec-head">{s.head}</div>}
    {s.items.length > 1 ? <ul>{s.items.map((x, j) => <li key={j}><MathText text={x} /></li>)}</ul> : <div><MathText text={s.items[0] || ''} /></div>}
  </div>)}</div>;
}
function Chip({ state, children, ...rest }) {
  const Glyph = GLYPH[state];
  return <button type="button" className="fam-hw-chip" data-state={state} {...rest}><span>{children}</span><Glyph aria-hidden /></button>;
}
const T = text => <MathText text={tidy(text)} />;
const explainText = (check, name) =>
  `Please explain question ${check.label} to ${name}.\nThe question: ${check.question}\n${name} wrote: ${check.studentAnswer || '(nothing)'}\nThe right answer is: ${check.expectedAnswer}`;

/* ── one question ───────────────────────────────────────────────────────────────────────────────── */
function QuestionCard({ check, name, id, flash, onExplain, short }) {
  const state = stateOf(check);
  return <article id={id} className="fam-hw-card" data-state={state} data-flash={flash || undefined}>
    <header className="fam-hw-card-head"><span className="fam-hw-label">Question {short}</span>
      <span className="fam-hw-badge" data-state={state}>{React.createElement(GLYPH[state], { 'aria-hidden': true })}{WORD[state]}</span></header>
    <div className="fam-hw-q">{T(check.question)}</div>
    {state === 'ok' ? <div className="fam-hw-answers fam-hw-one">
        <section className="fam-hw-ans" data-kind="ok"><div className="fam-hw-ans-label"><span className="fam-hw-dot"><CheckRounded /></span>{possessive(name)} answer</div><Answer text={check.studentAnswer} /></section></div>
      : <div className="fam-hw-answers">
        <section className="fam-hw-ans" data-kind={state === 'warm' ? 'mine' : 'neutral'}><div className="fam-hw-ans-label">{state === 'warm' && <span className="fam-hw-dot"><CloseRounded /></span>}{possessive(name)} answer</div><Answer text={check.studentAnswer} /></section>
        <section className="fam-hw-ans" data-kind={state === 'warm' ? 'right' : 'neutral'}><div className="fam-hw-ans-label">{state === 'warm' && <span className="fam-hw-dot"><CheckRounded /></span>}{state === 'warm' ? 'Right answer' : 'What the answer should have'}</div><Answer text={check.expectedAnswer} plain /></section>
      </div>}
    {check.feedback && <div className="fam-hw-add">
      {state === 'check' && <Typography className="fam-hw-note">We couldn’t mark this one. Please check it yourself.</Typography>}
      <div className="fam-hw-add-row"><LightbulbOutlined aria-hidden /><div>{state === 'warm' && <b>What to add · </b>}{T(forChild(check.feedback, name))}</div></div></div>}
    <div className="fam-hw-actions"><Button size="small" variant="outlined" className="fam-hw-explain" startIcon={<ChatBubbleOutlineRounded />} title="Opens the chat and asks the helper to explain this question" onClick={() => onExplain(explainText(check, name))}>Explain in chat</Button></div>
  </article>;
}
function RightRow({ check, name, id, open, flash, onToggle, onExplain, short }) {
  return <div id={id} className="fam-hw-row" data-open={open || undefined} data-flash={flash || undefined}>
    <button type="button" className="fam-hw-row-btn" aria-expanded={!!open} onClick={onToggle}>
      <span className="fam-hw-dot fam-hw-dot-ok"><CheckRounded /></span><span className="fam-hw-label">{short}</span>
      <span className="fam-hw-row-text"><span className="fam-hw-row-q">{T(check.question)}</span><span className="fam-hw-row-a">{name}: {T(check.studentAnswer)}</span></span>
      <ChevronRightRounded className="fam-hw-row-chev" aria-hidden /></button>
    {open && <div className="fam-hw-row-body"><QuestionCard check={check} name={name} id={undefined} short={short} onExplain={onExplain} /></div>}
  </div>;
}

/* ── the page ───────────────────────────────────────────────────────────────────────────────────── */
export default function FamilyHomework({ activity, result, childName, base, sourceFiles = [], onExplain, onMakeQuiz, onClose, busy, onHeaderAction }) {
  const name = childName || 'Your child';
  const checks = result.checks || [];
  const items = useMemo(() => checks.map((c, i) => ({ c, i, id: `hw-${activity.id}-${i}`, state: stateOf(c), ...parts(c.label, i) })), [checks, activity.id]);
  const groups = useMemo(() => { const out = []; items.forEach(it => { let g = out.at(-1); if (!g || g.key !== it.group) { g = { key: it.group, items: [] }; out.push(g); } g.items.push(it); }); return out; }, [items]);
  const right = items.filter(x => x.state === 'ok').length, warm = items.filter(x => x.state === 'warm').length, unsure = items.filter(x => x.state === 'check').length;
  const toLook = warm + unsure;
  const [filter, setFilter] = useState(toLook ? 'look' : 'all');
  const [open, setOpen] = useState(() => new Set());
  const [flash, setFlash] = useState(null);
  const [current, setCurrent] = useState(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [jumpTick, setJumpTick] = useState(0);
  const [more, setMore] = useState(false);
  const [toast, setToast] = useState('');
  const [making, setMaking] = useState(false);
  const pendingJump = useRef(null);
  const quietUntil = useRef(0);
  const scrollRef = useRef(null);
  const wide = useMediaQuery('(min-width:1000px)');
  const phone = useMediaQuery('(max-width:599px)');
  const ratio = items.length ? right / items.length : 0;
  const tone = ratio >= 0.9 ? 'ok' : ratio >= 0.5 ? 'brand' : 'warm';
  const C = 2 * Math.PI * 38;

  function jump(it) {
    setMapOpen(false);
    if (it.state === 'ok') setOpen(prev => new Set(prev).add(it.id));
    if (filter === 'look' && it.state === 'ok') setFilter('all');
    pendingJump.current = it.id;
    setFlash(null); setJumpTick(t => t + 1);
  }
  useEffect(() => {
    const id = pendingJump.current; if (!id) return undefined;
    const t = setTimeout(() => {
      const el = document.getElementById(id); const root = scrollRef.current; if (!el || !root) return;
      // Scroll only the list (scrollIntoView would also move the dialog and hide the header).
      const bar = root.querySelector('.fam-hw-bar'); const offset = (bar ? bar.offsetHeight : 0) + 16;
      const top = el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - offset;
      root.scrollTo({ top, behavior: reduced() ? 'auto' : 'smooth' });
      pendingJump.current = null; setFlash(id); setCurrent(id); quietUntil.current = Date.now() + 900;
      setTimeout(() => setFlash(f => (f === id ? null : f)), reduced() ? 1200 : 1300);
    }, 30);
    return () => clearTimeout(t);
  });
  // The chip of the question at the top of the list gets the "current" ring (worked out after each scroll).
  useEffect(() => {
    const root = scrollRef.current; if (!root) return undefined;
    let frame = 0;
    const pick = () => { frame = 0; if (Date.now() < quietUntil.current) return;
      const bar = root.querySelector('.fam-hw-bar'); const line = root.getBoundingClientRect().top + (bar ? bar.offsetHeight : 0) + 24;
      const els = root.querySelectorAll('.fam-hw-card[id], .fam-hw-row[id]');
      for (const el of els) { if (el.getBoundingClientRect().bottom > line) { setCurrent(el.id); break; } } };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(pick); };
    root.addEventListener('scroll', onScroll, { passive: true }); pick();
    return () => { root.removeEventListener('scroll', onScroll); if (frame) cancelAnimationFrame(frame); };
  }, [filter, open.size, wide]);

  async function downloadPdf() {
    if (making) return; setMaking(true);
    const host = document.createElement('div'); host.className = 'hwpdf-host'; document.body.appendChild(host);
    const root = createRoot(host);
    try {
      const pages = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('timeout')), 20000);
        root.render(<HomeworkPdf name={name} date={activity.finishedAt || activity.createdAt} items={items} groups={groups} result={result}
          counts={{ right, warm, unsure }} onReady={els => { clearTimeout(timer); resolve(els); }} />);
      });
      const day = new Date(activity.finishedAt || activity.createdAt || Date.now()).toISOString().slice(0, 10);
      await savePagesAsPdf(pages, `${name.replace(/[^A-Za-z0-9]+/g, '-')}-homework-${day}.pdf`);
    } catch { setToast('Couldn’t make the PDF. Try again.'); }
    finally { setTimeout(() => { root.unmount(); host.remove(); }, 0); setMaking(false); }
  }
  useEffect(() => {
    onHeaderAction?.(phone
      ? <Button variant="outlined" size="small" className="fam-head-btn" aria-label={making ? 'Making your PDF' : 'Download PDF'} onClick={downloadPdf} disabled={making} startIcon={making ? <CircularProgress size={16} /> : <DownloadRounded />}>PDF</Button>
      : <Button variant="outlined" size="small" className="fam-head-btn" startIcon={making ? <CircularProgress size={16} /> : <DownloadRounded />} onClick={downloadPdf} disabled={making}>{making ? 'Making your PDF…' : 'Download PDF'}</Button>);
  }, [phone, making]);
  useEffect(() => () => onHeaderAction?.(null), []);

  async function openFile(file) {
    try {
      const { data } = await api.get(`${base}/materials/${file.materialId}/files/${file.index}`, { responseType: 'blob' });
      const url = URL.createObjectURL(data); window.open(url, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { setToast('Couldn’t open this file. Try again.'); }
  }
  const pagesByFile = useMemo(() => {
    const m = new Map(); (result.references || []).forEach(r => { const k = r.fileNumber - 1; if (!m.has(k)) m.set(k, new Set()); m.get(k).add(r.page); });
    const ranges = set => { const p = [...set].sort((a, b) => a - b); const out = []; let s = p[0], e = p[0];
      for (const x of p.slice(1)) { if (x === e + 1) e = x; else { out.push(s === e ? `${s}` : `${s}–${e}`); s = e = x; } } if (p.length) out.push(s === e ? `${s}` : `${s}–${e}`); return out; };
    return sourceFiles.map((f, k) => ({ f, pages: m.has(k) ? ranges(m.get(k)) : [] }));
  }, [result.references, sourceFiles]);

  const map = <nav className="fam-hw-map" aria-label="Question map">
    {!phone && <Typography className="fam-hw-map-title">Questions</Typography>}
    <div className="fam-hw-legend" aria-hidden><span data-state="ok">✓ Right</span><span data-state="warm">! Not quite</span><span data-state="check">? Please check</span></div>
    <div className="fam-hw-groups">{groups.map(g => <div key={g.key} className="fam-hw-group"><span className="fam-hw-gname">{/^\d+$/.test(g.key) ? `Q${g.key}` : ''}</span>
      <div className="fam-hw-chips">{g.items.map(it => <Chip key={it.id} state={it.state} aria-label={`Question ${it.chip}, ${WORD[it.state].toLowerCase()}`} data-current={current === it.id || undefined} onClick={() => jump(it)}>{it.chip}</Chip>)}</div></div>)}</div>
  </nav>;
  const filterCtl = <div className="fam-seg fam-hw-filter" role="radiogroup" aria-label="Show" style={{ '--n': 2, '--i': filter === 'all' ? 0 : 1 }}>
    <span className="fam-seg-thumb" aria-hidden />
    <button type="button" role="radio" aria-checked={filter === 'all'} className="fam-seg-btn" data-on={filter === 'all'} onClick={() => setFilter('all')}>All {items.length}</button>
    <button type="button" role="radio" aria-checked={filter === 'look'} className="fam-seg-btn" data-on={filter === 'look'} onClick={() => setFilter('look')}>To look at {toLook}</button>
  </div>;

  const shown = groups.map(g => ({ ...g, list: filter === 'look' ? g.items.filter(it => it.state !== 'ok') : g.items })).filter(g => g.list.length);
  const list = <div className="fam-hw-list" key={filter}>
    {!shown.length && <div className="fam-hw-empty"><CheckRounded aria-hidden /><Typography>Nothing to look at. Every answer is right.</Typography></div>}
    {shown.map(g => { const r = g.items.filter(it => it.state === 'ok').length;
      const blocks = []; let run = [];
      const flush = () => { if (run.length) { blocks.push(<div key={`r${run[0].id}`} className="fam-hw-rows">{run.map(it => <RightRow key={it.id} id={it.id} check={it.c} name={name} short={it.chip} open={open.has(it.id)} flash={flash === it.id}
        onToggle={() => setOpen(prev => { const n = new Set(prev); if (n.has(it.id)) n.delete(it.id); else n.add(it.id); return n; })} onExplain={onExplain} />)}</div>); run = []; } };
      g.list.forEach(it => { if (it.state === 'ok') run.push(it); else { flush(); blocks.push(<QuestionCard key={it.id} id={it.id} check={it.c} name={name} short={it.chip} flash={flash === it.id} onExplain={onExplain} />); } });
      flush();
      return <section key={g.key} className="fam-hw-sect"><Typography component="h3" className="fam-hw-ghead">{/^\d+$/.test(g.key) ? `Question ${g.key}` : 'Questions'} · {r} of {g.items.length} right</Typography>{blocks}</section>; })}
  </div>;

  return <>
    <div className="fam-viewer-scroll fam-hw-scroll" ref={scrollRef}>
      {phone && <div className="fam-hw-bar">{filterCtl}<Button variant="outlined" size="small" className="fam-head-btn" startIcon={<GridViewRounded />} onClick={() => setMapOpen(true)}>Map</Button></div>}
      <div className="fam-hw" data-wide={wide || undefined}>
        {!phone && <aside className="fam-hw-side">{filterCtl}{map}</aside>}
        <div className="fam-hw-main">
          <section className="fam-hw-summary" data-tone={tone}>
            <div className="fam-hw-ring" role="img" aria-label={`${right} of ${items.length} right`}>
              <svg viewBox="0 0 88 88" aria-hidden><circle cx="44" cy="44" r="38" className="fam-ring-track" /><circle cx="44" cy="44" r="38" className="fam-ring-fill" strokeDasharray={C} strokeDashoffset={C * (1 - ratio)} /></svg>
              <span>{Math.round(ratio * 100)}%</span></div>
            <div className="fam-hw-sum-text">
              <Typography component="h2" className="fam-hw-sum-title">{right} of {items.length} right</Typography>
              {(warm > 0 || unsure > 0) && <div className="fam-hw-sum-chips">{warm > 0 && <span className="fam-status" data-tone="warm">{warm} not quite</span>}{unsure > 0 && <span className="fam-status">{unsure} for you to check</span>}</div>}
              <Typography className="fam-hw-sum-line">{!toLook ? 'Every answer is right. Brilliant!' : ratio >= 0.8 ? `Great work. ${toLook} to look at together.` : ratio >= 0.5 ? `Good effort. ${toLook} to look at together.` : `Let’s look at ${toLook} answers together.`}</Typography>
              <Typography className="fam-hw-fine">A guide from AI, not a final mark.</Typography>
              {(result.message || result.explanation) && <><Button size="small" className="fam-hw-more" onClick={() => setMore(!more)} aria-expanded={more} endIcon={<ExpandMoreRounded className="fam-chev" data-open={more} />}>Read the full comment</Button>
                <Collapse in={more}><div className="fam-prose fam-hw-more-text">{result.message && <p>{T(forChild(result.message, name))}</p>}{result.explanation && <p>{T(forChild(result.explanation, name))}</p>}</div></Collapse></>}
            </div>
          </section>
          {list}
          {result.nextStep && <section className="fam-tip fam-hw-next"><LightbulbOutlined className="fam-tip-icon" aria-hidden /><div className="fam-tip-body">
            <Typography className="fam-tip-title">Next step</Typography><div className="fam-prose">{T(forChild(result.nextStep, name))}</div>
            <Button size="small" variant="outlined" className="fam-hw-explain" startIcon={<ChatBubbleOutlineRounded />} title="Opens the chat and asks the helper" onClick={() => onExplain(`Please help me with this next step for ${name}: ${result.nextStep}`)}>Explain in chat</Button></div></section>}
          {pagesByFile.length > 0 && <details className="fam-src-group fam-hw-files"><summary>Pages we marked<ExpandMoreRounded className="fam-chev" aria-hidden /></summary>
            <ul className="fam-list">{pagesByFile.map(({ f, pages }, k) => <li key={k} className="fam-hw-file"><DescriptionOutlined aria-hidden />
              <span className="fam-src-text"><span className="fam-src-title">{f.name}</span>{pages.length > 0 && <span className="fam-small">{pages.length === 1 && !pages[0].includes('–') ? 'page' : 'pages'} {pages.join(', ')}</span>}</span>
              <Button size="small" onClick={() => openFile(f)}>Open</Button></li>)}</ul></details>}
        </div>
      </div>
    </div>
    <footer className="fam-viewer-foot fam-hw-foot" data-wide="true">
      <Button variant="outlined" size="large" onClick={onClose}>Back to notebook</Button>
      <span className="fam-grow" />
      <Button variant="contained" size="large" disabled={busy} onClick={onMakeQuiz} startIcon={phone ? null : <AutoAwesomeRounded />}>Practise with a quiz</Button>
    </footer>
    <Drawer anchor="bottom" open={mapOpen} onClose={() => setMapOpen(false)} className="fam-hw-sheet" sx={{ zIndex: 1400 }} PaperProps={{ className: 'fam-hw-sheet-paper' }}>
      <div className="fam-hw-sheet-head"><Typography component="h2" className="fam-sec-title">Questions</Typography>
        <IconButton className="fam-icon-btn" aria-label="Close the map" onClick={() => setMapOpen(false)}><CloseRounded /></IconButton></div>
      {map}
    </Drawer>
    <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast('')} message={toast} anchorOrigin={{ vertical: 'top', horizontal: 'center' }} />
  </>;
}

/* ── the printable report (rendered off screen, paginated, then saved as PDF pages) ───────────── */
function HomeworkPdf({ name, date, items, groups, result, counts, onReady }) {
  const [pages, setPages] = useState(null);
  const measure = useRef(null), host = useRef(null);
  const blocks = [];
  blocks.push({ keep: false, el: <div className="hwpdf-head"><div className="hwpdf-title">{possessive(name)} homework</div><div className="hwpdf-sub">{ukDate(date)} · Checked by MySmartTeach</div></div> });
  blocks.push({ keep: false, el: <div className="hwpdf-box"><b>{counts.right} of {items.length} right</b>{counts.warm ? ` · ${counts.warm} not quite` : ''}{counts.unsure ? ` · ${counts.unsure} for you to check` : ''}
    {result.message && <div className="hwpdf-line">{T(forChild(result.message, name))}</div>}<div className="hwpdf-fine">A guide from AI, not a final mark.</div></div> });
  blocks.push({ keep: false, el: <div className="hwpdf-map">{groups.map(g => <div key={g.key} className="hwpdf-grow"><span className="hwpdf-gname">{/^\d+$/.test(g.key) ? `Q${g.key}` : ''}</span>
    {g.items.map(it => <span key={it.id} className="hwpdf-chip" data-state={it.state}>{it.chip} {it.state === 'ok' ? '✓' : it.state === 'warm' ? '!' : '?'}</span>)}</div>)}
    <div className="hwpdf-legend">✓ Right · ! Not quite · ? Please check</div></div> });
  const look = items.filter(it => it.state !== 'ok');
  if (look.length) {
    blocks.push({ keep: true, el: <div className="hwpdf-h2">To look at</div> });
    look.forEach(it => blocks.push({ keep: false, el: <div className="hwpdf-card" data-state={it.state}>
      <div className="hwpdf-card-head"><b>Question {it.chip}</b><span className="hwpdf-badge" data-state={it.state}>{WORD[it.state]}</span></div>
      <div className="hwpdf-q">{T(it.c.question)}</div>
      <div className="hwpdf-pair"><div className="hwpdf-ans" data-kind={it.state === 'warm' ? 'mine' : 'neutral'}><div className="hwpdf-ans-label">{it.state === 'warm' ? '✗ ' : ''}{possessive(name)} answer</div><Answer text={it.c.studentAnswer} /></div>
        <div className="hwpdf-ans" data-kind={it.state === 'warm' ? 'right' : 'neutral'}><div className="hwpdf-ans-label">{it.state === 'warm' ? '✓ Right answer' : 'What the answer should have'}</div><Answer text={it.c.expectedAnswer} plain /></div></div>
      {it.c.feedback && <div className="hwpdf-add"><b>{it.state === 'warm' ? 'What to add: ' : 'Please check: '}</b>{T(forChild(it.c.feedback, name))}</div>}
    </div> }));
  }
  blocks.push({ keep: true, el: <div className="hwpdf-h2">All questions</div> });
  blocks.push({ keep: true, el: <div className="hwpdf-tr hwpdf-th"><span>Question</span><span>{possessive(name)} answer</span><span>Result</span></div> });
  items.forEach(it => blocks.push({ keep: false, el: <div className="hwpdf-tr"><span><b>{it.chip}</b> {T(it.c.question)}</span><span>{T(it.c.studentAnswer)}</span>
    <span><span className="hwpdf-badge" data-state={it.state}>{it.state === 'ok' ? '✓' : it.state === 'warm' ? '!' : '?'} {WORD[it.state]}</span></span></div> }));
  if (result.nextStep) blocks.push({ keep: false, el: <div className="hwpdf-box hwpdf-next"><b>Next step</b><div className="hwpdf-line">{T(forChild(result.nextStep, name))}</div></div> });

  useLayoutEffect(() => {
    if (pages || !measure.current) return;
    const AVAIL = 1123 - 2 * 57 - 28;
    const hs = [...measure.current.children].map(el => { const cs = getComputedStyle(el); return el.getBoundingClientRect().height + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom); });
    const out = []; let cur = [], used = 0;
    blocks.forEach((b, i) => {
      const need = hs[i] + (b.keep && hs[i + 1] ? hs[i + 1] : 0);
      if (cur.length && used + need > AVAIL) { out.push(cur); cur = []; used = 0; }
      cur.push(i); used += hs[i];
    });
    if (cur.length) out.push(cur);
    setPages(out);
  });
  useEffect(() => {
    if (!pages) return;
    (document.fonts?.ready || Promise.resolve()).then(() => requestAnimationFrame(() => onReady([...host.current.querySelectorAll('.hwpdf-page')])));
  }, [pages]);
  return <div ref={host} className="hwpdf">{pages
    ? pages.map((idx, p) => <div key={p} className="hwpdf-page"><div className="hwpdf-body">{idx.map(i => <React.Fragment key={i}>{blocks[i].el}</React.Fragment>)}</div>
        <div className="hwpdf-foot">MySmartTeach · Page {p + 1} of {pages.length}</div></div>)
    : <div ref={measure} className="hwpdf-measure">{blocks.map((b, i) => <React.Fragment key={i}>{b.el}</React.Fragment>)}</div>}</div>;
}
