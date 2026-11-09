// The marked homework (design §5.5): the summary, the Questions card, the answers to look at first, the next step and
// Advanced, with Download PDF in the frame's bar and Back and Practise with a quiz at the foot. ResultPage is the frame.
// Area: family

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, CircularProgress, Snackbar, Tab, Tabs, useMediaQuery } from '@mui/material';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import ChatBubbleOutlineRounded from '@mui/icons-material/ChatBubbleOutlineRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import DownloadRounded from '@mui/icons-material/DownloadRounded';
import LightbulbOutlined from '@mui/icons-material/LightbulbOutlined';
import { Advanced } from './FamilyEvidence';
import { familyApi } from './familyApi';
import { forChild } from './familyWords';
import { saveHomeworkPdf } from './homework/HomeworkPdf';
import HomeworkSummary from './homework/HomeworkSummary';
import { TidyText } from './homework/HomeworkText';
import QuestionMap from './homework/QuestionMap';
import { QuestionCard, RightRow } from './homework/QuestionCard';
import { countStates, pageRanges, parts, stateOf } from './homework/resultWords';
import './homework/homework.css';

const reduced = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

export default function FamilyHomework({
  activity,
  result,
  childName,
  childId,
  sourceFiles = [],
  onExplain,
  onMakeQuiz,
  busy,
  onHeaderAction,
}) {
  const name = childName || 'Your child';
  const items = useMemo(
    () =>
      (result.checks || []).map((c, i) => ({
        c,
        i,
        id: `hw-${activity.id}-${i}`,
        state: stateOf(c),
        ...parts(c.label, i),
      })),
    [result.checks, activity.id]
  );
  // Questions with parts (1.1, 1.2) share a heading, in their order.
  const groups = useMemo(() => {
    const out = [];
    for (const item of items) {
      if (out.at(-1)?.key !== item.group) out.push({ key: item.group, items: [] });
      out.at(-1).items.push(item);
    }
    return out;
  }, [items]);
  const counts = useMemo(() => countStates(items.map((item) => item.state)), [items]);
  // It opens on what to look at (design §5.5), unless every answer is right.
  const [filter, setFilter] = useState(counts.look ? 'look' : 'all');
  const [open, setOpen] = useState(() => new Set());
  const [target, setTarget] = useState(null);
  const [flash, setFlash] = useState(null);
  const [toast, setToast] = useState('');
  const [making, setMaking] = useState(false);
  const scrollRef = useRef(null);
  const phone = useMediaQuery('(max-width:599px)');

  // A box in the Questions card shows its question: a right answer opens (on All), then the list scrolls to it, it
  // flashes and takes focus. `target` is new on each jump, so the same question can be shown again.
  function jump(item) {
    if (item.state === 'ok') {
      setOpen((prev) => new Set(prev).add(item.id));
      setFilter('all');
    }
    setFlash(null);
    setTarget({ id: item.id });
  }
  useEffect(() => {
    if (!target) return undefined;
    const timer = setTimeout(() => {
      const el = document.getElementById(target.id);
      const root = scrollRef.current;
      if (!el || !root) return;
      // Only the list scrolls: scrollIntoView would also move the frame and hide its bar.
      const top = el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - 16;
      root.scrollTo({ top, behavior: reduced() ? 'auto' : 'smooth' });
      el.focus({ preventScroll: true });
      setFlash(target.id);
    }, 30);
    return () => clearTimeout(timer);
  }, [target]);
  useEffect(() => {
    if (!flash) return undefined;
    const timer = setTimeout(() => setFlash(null), 1300);
    return () => clearTimeout(timer);
  }, [flash]);

  // Download PDF, in the frame's bar as today ("PDF" on phones).
  const downloadPdf = useCallback(async () => {
    setMaking(true);
    try {
      await saveHomeworkPdf({ name, activity, items, result, counts });
    } catch {
      setToast('Couldn’t make the PDF. Try again.');
    } finally {
      setMaking(false);
    }
  }, [name, activity, items, result, counts]);
  useEffect(() => {
    onHeaderAction?.(
      <Button
        variant="outlined"
        aria-label={phone ? (making ? 'Making your PDF' : 'Download PDF') : undefined}
        startIcon={making ? <CircularProgress size={16} color="inherit" /> : <DownloadRounded />}
        onClick={downloadPdf}
        disabled={making}
        data-mst="family-homework-pdf"
      >
        {phone ? 'PDF' : making ? 'Making your PDF…' : 'Download PDF'}
      </Button>
    );
  }, [onHeaderAction, downloadPdf, phone, making]);
  useEffect(() => () => onHeaderAction?.(null), [onHeaderAction]);

  async function openFile(file) {
    try {
      const data = await familyApi.materialFile(childId, file.materialId, file.index);
      const url = URL.createObjectURL(data);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      setToast('Couldn’t open this file. Try again.');
    }
  }
  // Each page the AI marked, by file, for Advanced: "pages 1–2".
  const pagesByFile = useMemo(() => {
    const byFile = new Map();
    for (const ref of result.references || []) {
      byFile.set(ref.fileNumber - 1, [...(byFile.get(ref.fileNumber - 1) || []), ref.page]);
    }
    return sourceFiles.map((file, k) => ({ file, pages: pageRanges(byFile.get(k) || []) }));
  }, [result.references, sourceFiles]);

  const toggle = (id) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  // Each group's heading, then its answers to look at as cards, with its right answers as short rows between them.
  const shown = groups
    .map((group) => ({
      ...group,
      list: filter === 'look' ? group.items.filter((it) => it.state !== 'ok') : group.items,
    }))
    .filter((group) => group.list.length);
  const list = (
    <div className="fam-hw-list" key={filter}>
      {!shown.length && (
        <div className="fam-hw-empty">
          <CheckRounded aria-hidden />
          Nothing to look at. Every answer is right.
        </div>
      )}
      {shown.map((group) => {
        const right = group.items.filter((it) => it.state === 'ok').length;
        const blocks = [];
        let run = [];
        const flush = () => {
          if (!run.length) return;
          blocks.push(
            <div key={`r${run[0].id}`} className="mst-g1 mst-rim fam-hw-rows">
              {run.map((it) => (
                <RightRow
                  key={it.id}
                  id={it.id}
                  check={it.c}
                  name={name}
                  short={it.chip}
                  open={open.has(it.id)}
                  flash={flash === it.id}
                  onToggle={() => toggle(it.id)}
                  onExplain={onExplain}
                />
              ))}
            </div>
          );
          run = [];
        };
        for (const it of group.list) {
          if (it.state === 'ok') run.push(it);
          else {
            flush();
            blocks.push(
              <QuestionCard
                key={it.id}
                id={it.id}
                check={it.c}
                name={name}
                short={it.chip}
                flash={flash === it.id}
                onExplain={onExplain}
              />
            );
          }
        }
        flush();
        return (
          <section key={group.key} className="fam-hw-sect">
            <h3 className="fam-hw-ghead">
              {/^\d+$/.test(group.key) ? `Question ${group.key}` : 'Questions'} · {right} of {group.items.length} right
            </h3>
            {blocks}
          </section>
        );
      })}
    </div>
  );

  return (
    <>
      <div className="fam-viewer-scroll fam-hw-scroll" ref={scrollRef}>
        <div className="fam-hw">
          <HomeworkSummary items={items} counts={counts} result={result} name={name} />
          <QuestionMap items={items} name={name} onJump={jump} />
          {/* Teacher's segmented control: what to look at first, or every answer. */}
          <Tabs
            value={filter}
            onChange={(event, value) => setFilter(value)}
            aria-label="Show"
            className="fam-hw-filter"
          >
            <Tab value="look" label="To look at" />
            <Tab value="all" label="All" />
          </Tabs>
          {list}
          {result.nextStep && (
            <section className="mst-g1 mst-rim fam-hw-next">
              <LightbulbOutlined className="fam-hw-next-icon" aria-hidden />
              <div className="fam-hw-next-body">
                <h2 className="mst-card-title">Next step</h2>
                <p className="fam-hw-next-text">
                  <TidyText text={forChild(result.nextStep, name)} />
                </p>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ChatBubbleOutlineRounded />}
                  title="Opens the chat and asks the helper"
                  onClick={() => onExplain(`Please help me with this next step for ${name}: ${result.nextStep}`)}
                >
                  Explain in chat
                </Button>
              </div>
            </section>
          )}
          {/* Today's "Sources & coverage", in the one closed disclosure at the bottom (design §5.5). */}
          {pagesByFile.length > 0 && (
            <Advanced>
              <p className="fam-advanced-line">The pages the AI marked.</p>
              <ul className="fam-hw-files">
                {pagesByFile.map(({ file, pages }, k) => (
                  <li key={k} className="fam-hw-file">
                    <DescriptionOutlined aria-hidden />
                    <span className="fam-hw-file-text">
                      <span className="fam-hw-file-name">{file.name}</span>
                      {pages.length > 0 && (
                        <span>
                          {pages.length === 1 && !pages[0].includes('–') ? 'page' : 'pages'} {pages.join(', ')}
                        </span>
                      )}
                    </span>
                    <Button size="small" onClick={() => openFile(file)}>
                      Open
                    </Button>
                  </li>
                ))}
              </ul>
            </Advanced>
          )}
        </div>
      </div>
      <footer className="fam-viewer-foot fam-hw-foot">
        <span className="fam-grow" />
        <Button
          variant="contained"
          className="mst-ai"
          disabled={busy}
          onClick={onMakeQuiz}
          startIcon={phone ? null : <AutoAwesomeRounded />}
        >
          Practise with a quiz
        </Button>
      </footer>
      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast('')}
        message={toast}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      />
    </>
  );
}
