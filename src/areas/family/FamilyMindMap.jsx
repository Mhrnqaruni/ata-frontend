// The mind map viewer (Phase 1.38 design §6.7): a zoomable tree on computers, with a how-to card, zoom in words and a
// Summary panel, and a tap-to-open outline on phones.
// Area: family

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button, Typography, useMediaQuery } from '@mui/material';
import ExpandLessRounded from '@mui/icons-material/ExpandLessRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import ChatBubbleOutlineRounded from '@mui/icons-material/ChatBubbleOutlineRounded';
import LightbulbOutlined from '@mui/icons-material/LightbulbOutlined';
import MathText from './MathText';
import Outline from './MindMapOutline';
import './mindMap.css';

/* Today the AI sends branches with short child labels; deeper nodes ({ label, explanation, children }) are drawn the same way. */
function toNode(raw, id, depth) {
  if (typeof raw === 'string') return { id, label: plainLabel(raw), explanation: '', depth, children: [] };
  const kids = Array.isArray(raw?.children) ? raw.children : [];
  return {
    id: String(raw?.id || id),
    label: plainLabel(raw?.label || raw?.title || ''),
    explanation: raw?.explanation || '',
    depth,
    children: kids.map((child, i) => toNode(child, `${raw?.id || id}.${i}`, depth + 1)),
  };
}
const GAP_X = 72,
  GAP_Y = 14,
  PAD = 32;
/** "Ones digit ($2$)" reads as "Ones digit (2)": simple numbers need no maths typesetting (and then never break inside brackets). */
export const plainLabel = (text) =>
  String(text || '').replace(/\$([^$]+)\$/g, (whole, inner) =>
    /^[\d\s.,+\-=×÷%/()]+$/.test(inner) ? inner.trim() : whole
  );
const guessW = (n) => Math.min(n.depth === 0 ? 240 : 260, Math.max(120, 24 + plainLabel(n.label).length * 8));
const levelName = (node, parent) =>
  node.depth === 0 ? 'Main topic' : node.children.length ? 'Topic' : parent?.depth === 0 ? 'Topic' : 'Detail';

/** A mind map in the NotebookLM manner: the main topic on the left, branches open to smaller topics, details explain themselves. */
export default function FamilyMindMap({ title, overview, branches, nextStep, onAsk, childName }) {
  const phone = useMediaQuery('(max-width:899px)');
  // What a map is and how to use it (design §6.7), in words that match the layout: the big idea is on the left of
  // the drawn map, and at the top of the phone's outline.
  const how = (
    <aside className="fam-mm-how" aria-label="How to use the map">
      <p className="fam-mm-how-what">A mind map shows one big idea, and the smaller ideas linked to it.</p>
      <ol className="fam-mm-how-steps">
        <li>Start with the big idea {phone ? 'at the top' : 'on the left'}.</li>
        <li>Open each part to see its ideas.</li>
        <li>Ask {childName || 'your child'} to explain each one back to you.</li>
      </ol>
    </aside>
  );
  const root = useMemo(
    () => ({
      id: 'root',
      label: plainLabel(title) || 'Mind map',
      explanation: overview || '',
      depth: 0,
      children: (branches || []).map((b, i) => toNode(b, b?.id || `b${i}`, 1)),
    }),
    [title, overview, branches]
  );
  const index = useMemo(() => {
    const byId = new Map(),
      parent = new Map();
    const walk = (n, p) => {
      byId.set(n.id, n);
      if (p) parent.set(n.id, p);
      n.children.forEach((c) => walk(c, n));
    };
    walk(root, null);
    return { byId, parent };
  }, [root]);
  const [open, setOpen] = useState(() => new Set(['root']));
  const [selected, setSelected] = useState('root');
  const toggle = (id) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        const close = (n) => {
          next.delete(n.id);
          n.children.forEach(close);
        };
        close(index.byId.get(id));
      } else next.add(id);
      return next;
    });
  function choose(node) {
    setSelected(node.id);
    if (node.children.length && !open.has(node.id)) setOpen((prev) => new Set(prev).add(node.id));
  }
  const node = index.byId.get(selected) || root;
  const parent = index.parent.get(node.id);
  const panel = <Detail node={node} parent={parent} root={root} nextStep={nextStep} onAsk={onAsk} onChoose={choose} />;
  if (phone)
    return (
      <div className="fam-mm fam-mm-phone">
        {how}
        <Outline
          node={root}
          open={open}
          selected={selected}
          onSelect={setSelected}
          onToggle={toggle}
          onAsk={onAsk}
          parentOf={index.parent}
        />
        {nextStep && (
          <section className="fam-tip fam-mm-tip">
            <LightbulbOutlined className="fam-tip-icon" aria-hidden />
            <div className="fam-tip-body">
              <Typography className="fam-tip-title">Next step</Typography>
              <div className="fam-prose">
                <MathText text={nextStep} />
              </div>
            </div>
          </section>
        )}
      </div>
    );
  return (
    <div className="fam-mm">
      <Canvas how={how} root={root} open={open} selected={selected} onChoose={choose} onToggle={toggle} />
      <aside className="fam-mm-panel" aria-live="polite">
        {panel}
      </aside>
    </div>
  );
}

// The panel (design §6.7): the open part's notes, when the map has some; the Summary, never the title again (a tester
// saw it three times); and Next step. The summary opens clamped, with "Read the full summary".
function Detail({ node, parent, root, nextStep, onAsk }) {
  const [full, setFull] = useState(false);
  const leaf = !node.children.length && node.depth > 0;
  const part = node.depth > 0 && (node.explanation || (leaf && parent));
  return (
    <div className="fam-mm-detail">
      {part && (
        <section className="fam-mm-section">
          <Typography component="h2" className="fam-mm-detail-title">
            <MathText text={node.label} />
          </Typography>
          {node.explanation ? (
            <div className="fam-prose fam-mm-explain">
              <MathText text={node.explanation} />
            </div>
          ) : (
            <div className="fam-mm-context">
              <Typography className="fam-small">
                Part of{' '}
                <b>
                  <MathText text={parent.label} />
                </b>
              </Typography>
              {parent.explanation && (
                <div className="fam-prose">
                  <MathText text={parent.explanation} />
                </div>
              )}
            </div>
          )}
          {onAsk && (
            <Button
              variant={node.explanation ? 'outlined' : 'contained'}
              startIcon={<ChatBubbleOutlineRounded />}
              onClick={() => onAsk(parent && parent.depth > 0 ? `${node.label} (${parent.label})` : node.label)}
              className="fam-mm-ask"
            >
              {node.explanation ? 'Ask about this' : 'Explain this simply'}
            </Button>
          )}
        </section>
      )}
      {root.explanation && (
        <section className="fam-mm-section">
          <Typography component="h2" className="fam-mm-detail-title">
            Summary
          </Typography>
          <div className="fam-prose fam-mm-explain" data-clamp={!full}>
            <MathText text={root.explanation} />
          </div>
          {!full && (
            <Button className="fam-mm-read" onClick={() => setFull(true)}>
              Read the full summary
            </Button>
          )}
        </section>
      )}
      {nextStep && (
        <section className="fam-tip">
          <LightbulbOutlined className="fam-tip-icon" aria-hidden />
          <div className="fam-tip-body">
            <Typography className="fam-tip-title">Next step</Typography>
            <div className="fam-prose">
              <MathText text={nextStep} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

// Desktop version: the tree drawn left to right, with zoom, fit and expand or collapse all.
function Canvas({ how, root, open, selected, onChoose, onToggle }) {
  const nodeRefs = useRef(new Map());
  const box = useRef(null);
  const [sizes, setSizes] = useState({});
  const [zoom, setZoom] = useState(1);
  const visible = [];
  const collect = (n) => {
    visible.push(n);
    if (open.has(n.id)) n.children.forEach(collect);
  };
  collect(root);
  // Measure each box (it sizes to its words, up to 260 px), then lay out in columns; one extra render settles it.
  useLayoutEffect(() => {
    const next = {};
    let changed = false;
    nodeRefs.current.forEach((el, id) => {
      if (!el) return;
      const v = [el.offsetWidth, el.offsetHeight];
      next[id] = v;
      const old = sizes[id];
      if (!old || old[0] !== v[0] || old[1] !== v[1]) changed = true;
    });
    if (changed) setSizes((prev) => ({ ...prev, ...next }));
  });
  const w = (n) => sizes[n.id]?.[0] || guessW(n);
  const h = (n) => sizes[n.id]?.[1] || (n.depth === 0 ? 64 : 44);
  const colW = [];
  visible.forEach((n) => {
    colW[n.depth] = Math.max(colW[n.depth] || 0, w(n));
  });
  const colX = (d) => {
    let x = PAD;
    for (let i = 0; i < d; i += 1) x += (colW[i] || 200) + GAP_X;
    return x;
  };
  const pos = new Map(),
    edges = [];
  const sub = (n) => {
    const kids = open.has(n.id) ? n.children : [];
    const own = h(n);
    if (!kids.length) return own;
    const total = kids.reduce((s2, k) => s2 + sub(k), 0) + GAP_Y * (kids.length - 1);
    return Math.max(own, total);
  };
  const place = (n, top) => {
    const band = sub(n),
      own = h(n);
    pos.set(n.id, { x: colX(n.depth), y: top + (band - own) / 2, w: w(n), h: own });
    const kids = open.has(n.id) ? n.children : [];
    if (!kids.length) return;
    const kidsH = kids.reduce((s2, k) => s2 + sub(k), 0) + GAP_Y * (kids.length - 1);
    let y = top + (band - kidsH) / 2;
    kids.forEach((k) => {
      place(k, y);
      edges.push([n, k]);
      y += sub(k) + GAP_Y;
    });
  };
  place(root, PAD);
  let maxX = 0,
    maxY = 0;
  pos.forEach((p) => {
    maxX = Math.max(maxX, p.x + p.w);
    maxY = Math.max(maxY, p.y + p.h);
  });
  const stageW = maxX + PAD + 40,
    stageH = maxY + PAD;
  const fitZoom = () => {
    const el = box.current;
    if (!el) return 1;
    // Fitted to its box (design §6.7), up to 160 %, so a small map never sits in a big empty box.
    return Math.max(0.6, Math.min(1.6, (el.clientWidth * 0.8) / stageW, (el.clientHeight - 24) / stageH));
  };
  function fit() {
    setZoom(fitZoom());
  }
  const step = (d) => setZoom((z) => Math.round(Math.max(0.6, Math.min(1.6, z + d)) * 10) / 10);
  // After every open or close the whole visible tree is fitted (never above 100 %), so nothing runs off the screen.
  const fitPending = useRef(0);
  const openKey = [...open].sort().join('|');
  useEffect(() => {
    fitPending.current = 3;
  }, [openKey]);
  useEffect(() => {
    if (fitPending.current > 0) {
      fitPending.current -= 1;
      const z = fitZoom();
      if (Math.abs(z - zoom) > 0.02) setZoom(z);
    }
  });
  // Keep the topic just opened (and its smaller topics) in view when the tree is too big to fit.
  useEffect(() => {
    const el = box.current?.querySelector(`[data-node="${CSS.escape(selected)}"]`);
    if (!el) return undefined;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(
      () => el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' }),
      reduce ? 0 : 300
    );
    return () => clearTimeout(t);
  }, [selected, openKey]);
  return (
    <div className="fam-mm-board">
      {how}
      <div className="fam-mm-canvas" ref={box}>
        <div className="fam-mm-sizer" style={{ width: stageW * zoom, height: stageH * zoom }}>
          <div className="fam-mm-stage" style={{ width: stageW, height: stageH, transform: `scale(${zoom})` }}>
            <svg className="fam-mm-lines" width={stageW} height={stageH} aria-hidden>
              {edges.map(([a, b]) => {
                const p = pos.get(a.id),
                  q = pos.get(b.id);
                const x1 = p.x + p.w,
                  y1 = p.y + p.h / 2,
                  x2 = q.x,
                  y2 = q.y + q.h / 2,
                  mx = (x1 + x2) / 2;
                return (
                  <path
                    key={`${a.id}>${b.id}`}
                    data-depth={Math.min(b.depth, 3)}
                    d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                  />
                );
              })}
            </svg>
            {visible.map((n) => {
              const p = pos.get(n.id);
              const isOpen = open.has(n.id);
              const kids = n.children.length;
              return (
                <div
                  key={n.id}
                  className="fam-mm-node"
                  data-node={n.id}
                  data-depth={Math.min(n.depth, 3)}
                  data-selected={selected === n.id}
                  data-open={isOpen}
                  ref={(el) => {
                    if (el) nodeRefs.current.set(n.id, el);
                    else nodeRefs.current.delete(n.id);
                  }}
                  style={{ maxWidth: n.depth === 0 ? 240 : 260, transform: `translate(${p.x}px, ${p.y}px)` }}
                >
                  <button
                    type="button"
                    className="fam-mm-label"
                    onClick={() => onChoose(n)}
                    aria-pressed={selected === n.id}
                  >
                    <MathText text={n.label} />
                  </button>
                  {kids > 0 && (
                    <button
                      type="button"
                      className="fam-mm-toggle"
                      aria-expanded={isOpen}
                      aria-label={`${isOpen ? 'Hide' : 'Show'} the ideas in ${n.label}`}
                      onClick={() => onToggle(n.id)}
                    >
                      {/* A button with words (design §6.7): "3 ›" looked like an unread count, and "Hide" alone asked
                          "hide what?" (the Designer, row 8). */}
                      {`${isOpen ? 'Hide' : 'Show'} ${kids} idea${kids === 1 ? '' : 's'}`}
                      {isOpen ? <ExpandLessRounded /> : <ExpandMoreRounded />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* Zoom in words (design §6.7): a tester read − and + as "add or remove ideas", and asked "drag what?". */}
      <div className="fam-mm-float">
        <div role="toolbar" aria-label="Zoom" className="fam-mm-float-row">
          <Button onClick={() => step(-0.1)} disabled={zoom <= 0.6}>
            Zoom out
          </Button>
          <Button onClick={() => step(0.1)} disabled={zoom >= 1.6}>
            Zoom in
          </Button>
          <Button onClick={fit}>Show the whole map</Button>
        </div>
        <p className="fam-mm-drag">Drag the map to move around.</p>
      </div>
    </div>
  );
}

// Phone version: the same map as an outline that opens on tap, with no sideways scrolling.
