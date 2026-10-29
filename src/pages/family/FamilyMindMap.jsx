import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button, IconButton, Typography, useMediaQuery } from '@mui/material';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import AddRounded from '@mui/icons-material/AddRounded';
import RemoveRounded from '@mui/icons-material/RemoveRounded';
import FitScreenRounded from '@mui/icons-material/FitScreenRounded';
import UnfoldMoreRounded from '@mui/icons-material/UnfoldMoreRounded';
import UnfoldLessRounded from '@mui/icons-material/UnfoldLessRounded';
import ChatBubbleOutlineRounded from '@mui/icons-material/ChatBubbleOutlineRounded';
import LightbulbOutlined from '@mui/icons-material/LightbulbOutlined';
import MathText from '../../components/common/MathTextDisplay';

/* Today the AI sends branches with short child labels; deeper nodes ({ label, explanation, children }) are drawn the same way. */
function toNode(raw, id, depth) {
  if (typeof raw === 'string') return { id, label: plainLabel(raw), explanation: '', depth, children: [] };
  const kids = Array.isArray(raw?.children) ? raw.children : [];
  return { id: String(raw?.id || id), label: plainLabel(raw?.label || raw?.title || ''), explanation: raw?.explanation || '', depth,
    children: kids.map((child, i) => toNode(child, `${raw?.id || id}.${i}`, depth + 1)) };
}
const GAP_X = 72, GAP_Y = 14, PAD = 32;
/** "Ones digit ($2$)" reads as "Ones digit (2)": simple numbers need no maths typesetting (and then never break inside brackets). */
export const plainLabel = text => String(text || '').replace(/\$([^$]+)\$/g, (whole, inner) => /^[\d\s.,+\-=×÷%/()]+$/.test(inner) ? inner.trim() : whole);
const guessW = n => Math.min(n.depth === 0 ? 240 : 260, Math.max(120, 24 + plainLabel(n.label).length * 8));
const levelName = (node, parent) => node.depth === 0 ? 'Main topic' : node.children.length ? 'Topic' : parent?.depth === 0 ? 'Topic' : 'Detail';

/** A mind map in the NotebookLM manner: the main topic on the left, branches open to smaller topics, details explain themselves. */
export default function FamilyMindMap({ title, overview, branches, nextStep, onAsk }) {
  const phone = useMediaQuery('(max-width:899px)');
  const root = useMemo(() => ({ id: 'root', label: plainLabel(title) || 'Mind map', explanation: overview || '', depth: 0,
    children: (branches || []).map((b, i) => toNode(b, b?.id || `b${i}`, 1)) }), [title, overview, branches]);
  const index = useMemo(() => { const byId = new Map(), parent = new Map();
    const walk = (n, p) => { byId.set(n.id, n); if (p) parent.set(n.id, p); n.children.forEach(c => walk(c, n)); }; walk(root, null);
    return { byId, parent }; }, [root]);
  const [open, setOpen] = useState(() => new Set(['root']));
  const [selected, setSelected] = useState('root');
  const toggle = id => setOpen(prev => {
    const next = new Set(prev);
    if (next.has(id)) { const close = n => { next.delete(n.id); n.children.forEach(close); }; close(index.byId.get(id)); } else next.add(id);
    return next;
  });
  const [fitAsk, setFitAsk] = useState(0);
  const expandAll = () => { setOpen(new Set([...index.byId.values()].filter(n => n.children.length).map(n => n.id))); setFitAsk(n => n + 1); };
  const collapseAll = () => { setOpen(new Set(['root'])); setSelected('root'); setFitAsk(n => -(Math.abs(n) + 1)); };
  function choose(node) { setSelected(node.id); if (node.children.length && !open.has(node.id)) setOpen(prev => new Set(prev).add(node.id)); }
  const node = index.byId.get(selected) || root;
  const parent = index.parent.get(node.id);
  const panel = <Detail node={node} parent={parent} root={root} nextStep={nextStep} onAsk={onAsk} onChoose={choose} />;
  if (phone) return <div className="fam-mm fam-mm-phone">
    <div className="fam-mm-tools"><Button size="small" startIcon={<UnfoldMoreRounded />} onClick={expandAll}>Open all</Button><Button size="small" startIcon={<UnfoldLessRounded />} onClick={collapseAll}>Close all</Button></div>
    <Outline node={root} open={open} selected={selected} onSelect={setSelected} onToggle={toggle} onAsk={onAsk} parentOf={index.parent} />
    {nextStep && <section className="fam-tip fam-mm-tip"><LightbulbOutlined className="fam-tip-icon" aria-hidden /><div className="fam-tip-body"><Typography className="fam-tip-title">What to do next</Typography><div className="fam-prose"><MathText text={nextStep} /></div></div></section>}
  </div>;
  return <div className="fam-mm">
    <Canvas root={root} open={open} selected={selected} onChoose={choose} onToggle={toggle} onExpandAll={expandAll} onCollapseAll={collapseAll} fitAsk={fitAsk} />
    <aside className="fam-mm-panel" aria-live="polite">{panel}</aside>
  </div>;
}

function Detail({ node, parent, root, nextStep, onAsk, onChoose }) {
  const leaf = !node.children.length && node.depth > 0;
  return <div className="fam-mm-detail">
    <span className="fam-mm-level" data-depth={Math.min(node.depth, 3)}>{levelName(node, parent)}</span>
    <Typography component="h2" className="fam-mm-detail-title"><MathText text={node.label} /></Typography>
    {node.explanation ? <div className="fam-prose fam-mm-explain"><MathText text={node.explanation} /></div>
      : leaf && parent ? <div className="fam-mm-context"><Typography className="fam-small">Part of <b><MathText text={parent.label} /></b></Typography>
        {parent.explanation && <div className="fam-prose"><MathText text={parent.explanation} /></div>}</div> : null}
    {node.children.length > 0 && <div className="fam-mm-kids"><Typography className="fam-small">Inside this {node.depth === 0 ? 'map' : 'topic'}</Typography>
      <div className="fam-mm-kid-list">{node.children.map(child => <button key={child.id} type="button" className="fam-mm-kid" data-depth={Math.min(child.depth, 3)} onClick={() => onChoose(child)}>
        <span><MathText text={child.label} /></span><ChevronRightRounded aria-hidden /></button>)}</div></div>}
    {onAsk && node.depth > 0 && <Button variant={leaf && !node.explanation ? 'contained' : 'outlined'} startIcon={<ChatBubbleOutlineRounded />} onClick={() => onAsk(parent && parent.depth > 0 ? `${node.label} (${parent.label})` : node.label)} className="fam-mm-ask">
      {leaf && !node.explanation ? 'Explain this simply' : 'Ask about this in the chat'}</Button>}
    {node.depth === 0 && <Typography className="fam-small fam-mm-hint">Tap a topic on the map to open its smaller topics.</Typography>}
    {nextStep && node.depth === 0 && <section className="fam-tip"><LightbulbOutlined className="fam-tip-icon" aria-hidden /><div className="fam-tip-body"><Typography className="fam-tip-title">What to do next</Typography><div className="fam-prose"><MathText text={nextStep} /></div></div></section>}
  </div>;
}

function Canvas({ root, open, selected, onChoose, onToggle, onExpandAll, onCollapseAll, fitAsk }) {
  const nodeRefs = useRef(new Map());
  const box = useRef(null);
  const [sizes, setSizes] = useState({});
  const [zoom, setZoom] = useState(1);
  const visible = [];
  const collect = n => { visible.push(n); if (open.has(n.id)) n.children.forEach(collect); };
  collect(root);
  // Measure each box (it sizes to its words, up to 260 px), then lay out in columns; one extra render settles it.
  useLayoutEffect(() => {
    const next = {}; let changed = false;
    nodeRefs.current.forEach((el, id) => { if (!el) return; const v = [el.offsetWidth, el.offsetHeight]; next[id] = v; const old = sizes[id]; if (!old || old[0] !== v[0] || old[1] !== v[1]) changed = true; });
    if (changed) setSizes(prev => ({ ...prev, ...next }));
  });
  const w = n => sizes[n.id]?.[0] || guessW(n);
  const h = n => sizes[n.id]?.[1] || (n.depth === 0 ? 64 : 44);
  const colW = []; visible.forEach(n => { colW[n.depth] = Math.max(colW[n.depth] || 0, w(n)); });
  const colX = d => { let x = PAD; for (let i = 0; i < d; i += 1) x += (colW[i] || 200) + GAP_X; return x; };
  const pos = new Map(), edges = [];
  const sub = n => { const kids = open.has(n.id) ? n.children : []; const own = h(n);
    if (!kids.length) return own; const total = kids.reduce((s2, k) => s2 + sub(k), 0) + GAP_Y * (kids.length - 1); return Math.max(own, total); };
  const place = (n, top) => {
    const band = sub(n), own = h(n); pos.set(n.id, { x: colX(n.depth), y: top + (band - own) / 2, w: w(n), h: own });
    const kids = open.has(n.id) ? n.children : []; if (!kids.length) return;
    const kidsH = kids.reduce((s2, k) => s2 + sub(k), 0) + GAP_Y * (kids.length - 1);
    let y = top + (band - kidsH) / 2;
    kids.forEach(k => { place(k, y); edges.push([n, k]); y += sub(k) + GAP_Y; });
  };
  place(root, PAD);
  let maxX = 0, maxY = 0; pos.forEach(p => { maxX = Math.max(maxX, p.x + p.w); maxY = Math.max(maxY, p.y + p.h); });
  const stageW = maxX + PAD + 40, stageH = maxY + PAD;
  const fitZoom = () => { const el = box.current; if (!el) return 1; return Math.max(0.6, Math.min(1, (el.clientWidth - 16) / stageW, (el.clientHeight - 16) / stageH)); };
  function fit() { setZoom(fitZoom()); }
  const step = d => setZoom(z => Math.round(Math.max(0.6, Math.min(1.4, z + d)) * 10) / 10);
  // After every open or close the whole visible tree is fitted (never above 100 %), so nothing runs off the screen.
  const fitPending = useRef(0);
  const openKey = [...open].sort().join('|');
  useEffect(() => { fitPending.current = 3; }, [openKey, fitAsk]);
  useEffect(() => { if (fitPending.current > 0) { fitPending.current -= 1; const z = fitZoom(); if (Math.abs(z - zoom) > 0.02) setZoom(z); } });
  // Keep the topic just opened (and its smaller topics) in view when the tree is too big to fit.
  useEffect(() => {
    const el = box.current?.querySelector(`[data-node="${CSS.escape(selected)}"]`); if (!el) return undefined;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' }), reduce ? 0 : 300);
    return () => clearTimeout(t);
  }, [selected, openKey]);
  return <div className="fam-mm-board">
    <div className="fam-mm-tools" role="toolbar" aria-label="Mind map tools">
      <Button size="small" startIcon={<UnfoldMoreRounded />} onClick={onExpandAll}>Open all</Button>
      <Button size="small" startIcon={<UnfoldLessRounded />} onClick={onCollapseAll}>Close all</Button>
      <span className="fam-grow" />
      <IconButton className="fam-icon-btn" aria-label="Zoom out" onClick={() => step(-0.1)} disabled={zoom <= 0.6}><RemoveRounded /></IconButton>
      <span className="fam-small fam-mm-zoom">{Math.round(zoom * 100)}%</span>
      <IconButton className="fam-icon-btn" aria-label="Zoom in" onClick={() => step(0.1)} disabled={zoom >= 1.4}><AddRounded /></IconButton>
      <IconButton className="fam-icon-btn" aria-label="Fit the map to the screen" onClick={fit}><FitScreenRounded /></IconButton>
    </div>
    <div className="fam-mm-canvas" ref={box}>
      <div className="fam-mm-sizer" style={{ width: stageW * zoom, height: stageH * zoom }}>
        <div className="fam-mm-stage" style={{ width: stageW, height: stageH, transform: `scale(${zoom})` }}>
          <svg className="fam-mm-lines" width={stageW} height={stageH} aria-hidden>
            {edges.map(([a, b]) => { const p = pos.get(a.id), q = pos.get(b.id); const x1 = p.x + p.w, y1 = p.y + p.h / 2, x2 = q.x, y2 = q.y + q.h / 2, mx = (x1 + x2) / 2;
              return <path key={`${a.id}>${b.id}`} data-depth={Math.min(b.depth, 3)} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} />; })}
          </svg>
          {visible.map(n => { const p = pos.get(n.id); const isOpen = open.has(n.id); const kids = n.children.length;
            return <div key={n.id} className="fam-mm-node" data-node={n.id} data-depth={Math.min(n.depth, 3)} data-selected={selected === n.id} data-open={isOpen}
              ref={el => { if (el) nodeRefs.current.set(n.id, el); else nodeRefs.current.delete(n.id); }}
              style={{ maxWidth: n.depth === 0 ? 240 : 260, transform: `translate(${p.x}px, ${p.y}px)` }}>
              <button type="button" className="fam-mm-label" onClick={() => onChoose(n)} aria-pressed={selected === n.id}><MathText text={n.label} /></button>
              {kids > 0 && <button type="button" className="fam-mm-toggle" aria-expanded={isOpen} aria-label={`${isOpen ? 'Close' : 'Open'} ${n.label} (${kids} inside)`}
                onClick={() => onToggle(n.id)}>{isOpen ? <ChevronLeftRounded /> : <><span>{kids}</span><ChevronRightRounded /></>}</button>}
            </div>; })}
        </div>
      </div>
    </div>
  </div>;
}

function Outline({ node, open, selected, onSelect, onToggle, onAsk, parentOf }) {
  const explainRef = useRef(null); const [more, setMore] = useState(false);
  const isOpen = open.has(node.id); const kids = node.children; const parent = parentOf.get(node.id); const on = selected === node.id;
  const leaf = !kids.length && node.depth > 0;
  useEffect(() => { if (on && explainRef.current) { const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => explainRef.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }), 60); return () => clearTimeout(t); } return undefined; }, [on, isOpen]);
  return <div className="fam-mm-o" data-depth={Math.min(node.depth, 3)}>
    <button type="button" className="fam-mm-o-row" data-selected={on} aria-expanded={kids.length ? isOpen : undefined}
      onClick={() => { onSelect(node.id); if (kids.length) onToggle(node.id); }}>
      <span className="fam-mm-o-label"><MathText text={node.label} /></span>
      {kids.length > 0 && <span className="fam-mm-o-count">{kids.length}<ExpandMoreRounded className="fam-chev" data-open={isOpen} aria-hidden /></span>}
    </button>
    {(isOpen || (on && leaf)) && (node.explanation || (leaf && parent)) && <div className="fam-mm-o-explain" ref={explainRef}>
      {node.explanation ? <div className="fam-prose fam-mm-o-text" data-clamp={node.depth === 0 && !more}><MathText text={node.explanation} /></div>
        : <Typography className="fam-small">Part of <b><MathText text={parent.label} /></b>{parent.explanation ? '. ' : ''}{parent.explanation && <MathText text={parent.explanation} />}</Typography>}
      {node.depth === 0 && node.explanation && <Button size="small" onClick={() => setMore(!more)}>{more ? 'Show less' : 'More'}</Button>}
      {onAsk && node.depth > 0 && <Button size="small" startIcon={<ChatBubbleOutlineRounded />} onClick={() => onAsk(parent && parent.depth > 0 ? `${node.label} (${parent.label})` : node.label)}>{leaf && !node.explanation ? 'Explain this simply' : 'Ask about this'}</Button>}
    </div>}
    {isOpen && kids.length > 0 && <div className="fam-mm-o-kids">{kids.map(k => <Outline key={k.id} node={k} open={open} selected={selected} onSelect={onSelect} onToggle={onToggle} onAsk={onAsk} parentOf={parentOf} />)}</div>}
  </div>;
}
