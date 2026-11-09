// The marked homework as a PDF (Download PDF, design §5.5): the report rendered off screen on A4 pages, measured and
// paginated, then saved. Its look stays in family.css's hwpdf rules, in fixed print colours for white paper.
// Area: family

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { forChild, ukDate } from '../familyWords';
import { savePagesAsPdf } from '../pdfPages';
import { Answer, TidyText } from './HomeworkText';
import { MARK, WORD, legend } from './resultWords';

const PAGE_SPACE = 1123 - 2 * 57 - 28; // an A4 page's height in CSS px, less its margins and its foot

/** Renders the report off screen and saves it as "<Name>-homework-<day>.pdf". Rejects when it can't. */
export async function saveHomeworkPdf({ name, activity, items, result, counts }) {
  const host = document.createElement('div');
  host.className = 'hwpdf-host';
  document.body.appendChild(host);
  const root = createRoot(host);
  const date = activity.finishedAt || activity.createdAt;
  try {
    const pages = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), 20000);
      const ready = (elements) => {
        clearTimeout(timer);
        resolve(elements);
      };
      root.render(
        <HomeworkPdf name={name} date={date} items={items} result={result} counts={counts} onReady={ready} />
      );
    });
    const day = new Date(date || Date.now()).toISOString().slice(0, 10);
    await savePagesAsPdf(pages, `${name.replace(/[^A-Za-z0-9]+/g, '-')}-homework-${day}.pdf`);
  } finally {
    setTimeout(() => {
      root.unmount();
      host.remove();
    }, 0);
  }
}

// The report's blocks, in order; `keep` holds a heading on the same page as the block after it.
function reportBlocks({ name, date, items, result, counts }) {
  const blocks = [
    <div className="hwpdf-head">
      <div className="hwpdf-title">{name}’s homework</div>
      <div className="hwpdf-sub">{ukDate(date)} · Marked by AI, with MySmartTeach</div>
    </div>,
    <div className="hwpdf-box">
      <b>
        {counts.right} of {items.length} right
      </b>
      {counts.warm ? ` · ${counts.warm} not quite` : ''}
      {counts.unsure ? ` · ${counts.unsure} the AI isn’t sure about` : ''}
      {result.message && (
        <div className="hwpdf-line">
          <TidyText text={forChild(result.message, name)} />
        </div>
      )}
      <div className="hwpdf-fine">Marked by AI. It’s a guide, not a teacher’s mark.</div>
    </div>,
    <div className="hwpdf-map">
      <div className="hwpdf-grow">
        {items.map((it) => (
          <span key={it.id} className="hwpdf-chip" data-state={it.state}>
            Q{it.chip} {MARK[it.state]}
          </span>
        ))}
      </div>
      <div className="hwpdf-legend">
        {legend(name)
          .map(([, text]) => text)
          .join(' · ')}
      </div>
    </div>,
  ].map((el) => ({ el }));
  const look = items.filter((it) => it.state !== 'ok');
  if (look.length) blocks.push({ keep: true, el: <div className="hwpdf-h2">To look at</div> });
  for (const it of look) {
    const warm = it.state === 'warm';
    blocks.push({
      el: (
        <div className="hwpdf-card" data-state={it.state}>
          <div className="hwpdf-card-head">
            <b>Question {it.chip}</b>
            <span className="hwpdf-badge" data-state={it.state}>
              {WORD[it.state]}
            </span>
          </div>
          <div className="hwpdf-q">
            <TidyText text={it.c.question} />
          </div>
          <div className="hwpdf-pair">
            <div className="hwpdf-ans" data-kind={warm ? 'mine' : 'neutral'}>
              <div className="hwpdf-ans-label">
                {warm ? '✗ ' : ''}
                {name}’s answer
              </div>
              <Answer text={it.c.studentAnswer} />
            </div>
            <div className="hwpdf-ans" data-kind={warm ? 'right' : 'neutral'}>
              <div className="hwpdf-ans-label">{warm ? '✓ The right answer' : 'The right answer'}</div>
              <Answer text={it.c.expectedAnswer} plain />
            </div>
          </div>
          {it.c.feedback && (
            <div className="hwpdf-add">
              <b>{warm ? 'What to add: ' : 'Please look yourself: '}</b>
              <TidyText text={forChild(it.c.feedback, name)} />
            </div>
          )}
        </div>
      ),
    });
  }
  blocks.push({ keep: true, el: <div className="hwpdf-h2">All questions</div> });
  blocks.push({
    keep: true,
    el: (
      <div className="hwpdf-tr hwpdf-th">
        <span>Question</span>
        <span>{name}’s answer</span>
        <span>Result</span>
      </div>
    ),
  });
  for (const it of items) {
    blocks.push({
      el: (
        <div className="hwpdf-tr">
          <span>
            <b>{it.chip}</b> <TidyText text={it.c.question} />
          </span>
          <span>
            <TidyText text={it.c.studentAnswer} />
          </span>
          <span>
            <span className="hwpdf-badge" data-state={it.state}>
              {MARK[it.state]} {WORD[it.state]}
            </span>
          </span>
        </div>
      ),
    });
  }
  if (result.nextStep)
    blocks.push({
      el: (
        <div className="hwpdf-box hwpdf-next">
          <b>Next step</b>
          <div className="hwpdf-line">
            <TidyText text={forChild(result.nextStep, name)} />
          </div>
        </div>
      ),
    });
  return blocks;
}

// The printable report: measured once in one column, then laid out page by page; `onReady(pages)` gets the pages.
// It renders once, off screen, so its blocks are made once.
function HomeworkPdf({ onReady, ...report }) {
  const [blocks] = useState(() => reportBlocks(report));
  const [pages, setPages] = useState(null);
  const measure = useRef(null);
  const host = useRef(null);
  useLayoutEffect(() => {
    if (pages || !measure.current) return;
    const heights = [...measure.current.children].map((el) => {
      const style = getComputedStyle(el);
      return el.getBoundingClientRect().height + parseFloat(style.marginTop) + parseFloat(style.marginBottom);
    });
    const out = [];
    let page = [];
    let used = 0;
    blocks.forEach((block, i) => {
      const need = heights[i] + (block.keep && heights[i + 1] ? heights[i + 1] : 0);
      if (page.length && used + need > PAGE_SPACE) {
        out.push(page);
        page = [];
        used = 0;
      }
      page.push(i);
      used += heights[i];
    });
    if (page.length) out.push(page);
    setPages(out);
  }, [pages, blocks]);
  useEffect(() => {
    if (!pages) return;
    (document.fonts?.ready || Promise.resolve()).then(() =>
      requestAnimationFrame(() => onReady([...host.current.querySelectorAll('.hwpdf-page')]))
    );
  }, [pages, onReady]);
  return (
    <div ref={host} className="hwpdf">
      {pages ? (
        pages.map((indexes, p) => (
          <div key={p} className="hwpdf-page">
            <div className="hwpdf-body">
              {indexes.map((i) => (
                <Fragment key={i}>{blocks[i].el}</Fragment>
              ))}
            </div>
            <div className="hwpdf-foot">
              MySmartTeach · Page {p + 1} of {pages.length}
            </div>
          </div>
        ))
      ) : (
        <div ref={measure} className="hwpdf-measure">
          {blocks.map((block, i) => (
            <Fragment key={i}>{block.el}</Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
