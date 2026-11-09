// The reader for a family material (Phase 1.38 design §10.4), in the frame every opened item shares: Close, the
// material's name and size, "Page 1 of 2", the page on a glass card, and Previous and Next page. ?dialog=read-… opens it.
// Area: family

import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, CircularProgress, Dialog, Typography } from '@mui/material';
import CloseRounded from '@mui/icons-material/CloseRounded';
import MathText from './MathText';
import { familyApi } from './familyApi';
import useDialogParam from './useDialogParam';
import './results/results.css';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * "View": the original notes or pages. File previews use the authenticated API, never a public storage URL. `dialog`
 * names the reader in the address; each reader on a page needs its own. A Refresh reopens it at its first page.
 * `onQuiz(options)` keeps today's quiz shortcut as a text button; `page` is the PDF page to start at.
 */
export default function FamilySource({
  childId,
  source,
  onQuiz,
  label = 'View',
  page = 1,
  dialog = `read-${source.id}`,
}) {
  const [open, showReader, hideReader] = useDialogParam(dialog);
  const files = source.files || [];
  // The pages: the notes text, when a material has it, then each file.
  const pages = [...(source.body ? [{ notes: source.body }] : []), ...files.map((file, index) => ({ file, index }))];
  const [at, setAt] = useState(0);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  const url = useRef(null);
  const requestSequence = useRef(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (url.current) URL.revokeObjectURL(url.current);
    };
  }, []);
  function clear() {
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
    setPreview(null);
  }
  // Cancels a download and forgets the preview, so the reader always opens fresh, even after Back closed it.
  function reset() {
    requestSequence.current += 1;
    clear();
    setBusy(false);
    setError('');
  }
  async function show(index) {
    const request = ++requestSequence.current;
    const file = files[index];
    setBusy(true);
    setError('');
    try {
      const data = await familyApi.materialFile(childId, source.id, file.index ?? index);
      if (!alive.current || request !== requestSequence.current) return;
      clear();
      url.current = URL.createObjectURL(data);
      setPreview({ url: url.current, name: file.name, mime: file.mime });
    } catch {
      if (alive.current && request === requestSequence.current) setError('Could not open this page. Please try again.');
    } finally {
      if (alive.current && request === requestSequence.current) setBusy(false);
    }
  }
  function go(next) {
    setAt(next);
    reset();
    if (pages[next]?.file) void show(pages[next].index);
  }
  function openReader() {
    go(0);
    showReader();
  }
  function close() {
    reset();
    hideReader();
  }
  const current = pages[at];
  const pageCount = files.reduce((sum, file) => sum + (file.pages || 1), 0);
  const line =
    source.provenance?.kind === 'topic' || (!files.length && source.body)
      ? 'MySmartTeach notes'
      : `${source.purpose === 'work' ? 'Homework' : 'Worksheet'} · ${plural(pageCount, 'page')}`;
  return (
    <>
      {/* The hidden name starts with the visible words, so voice control finds it (C-19). */}
      <Button
        size="small"
        onClick={openReader}
        aria-label={label === source.title ? undefined : `${label}: ${source.title}`}
      >
        {label}
      </Button>
      <Dialog
        open={open}
        onClose={close}
        fullScreen
        className="fam-viewer"
        transitionDuration={{ enter: 240, exit: 0 }}
      >
        <div className="mst-ground" aria-hidden />
        <header className="fam-viewer-head">
          <Button
            className="fam-viewer-close"
            startIcon={<CloseRounded />}
            onClick={close}
            data-mst="family-reader-close"
          >
            Close
          </Button>
          <div className="fam-viewer-title">
            <Typography component="h1" className="fam-viewer-name">
              {source.title}
            </Typography>
            <span className="fam-viewer-line">{line}</span>
          </div>
          {pages.length > 1 && (
            <span className="fam-viewer-progress" aria-live="polite">
              Page {at + 1} of {pages.length}
            </span>
          )}
        </header>
        <div className="fam-viewer-main">
          <div className="fam-viewer-scroll">
            <div className="fam-col-760">
              <article className="mst-g1 mst-rim fam-reader-card">
                {current?.notes && (
                  <div className="fam-prose fam-notes">
                    <MathText text={current.notes} />
                  </div>
                )}
                {current?.file &&
                  preview &&
                  (preview.mime === 'application/pdf' ? (
                    <iframe title={preview.name} src={`${preview.url}#page=${page}`} />
                  ) : (
                    <img src={preview.url} alt={`Page ${at + 1}: ${preview.name}`} />
                  ))}
                {current?.file && busy && !preview && (
                  <div className="fam-reader-wait">
                    <CircularProgress aria-label="Opening the page" />
                  </div>
                )}
                {error && (
                  <Alert severity="error" action={<Button onClick={() => go(at)}>Try again</Button>}>
                    {error}
                  </Alert>
                )}
              </article>
            </div>
          </div>
          <footer className="fam-viewer-foot" data-col="680">
            {onQuiz && source.purpose !== 'work' && (
              <Button
                onClick={() => {
                  // The make dialog opens in the reader's place, so its Cancel and Back return to the page.
                  reset();
                  onQuiz({ replace: true });
                }}
              >
                Make a quiz on this
              </Button>
            )}
            <span className="fam-grow" />
            {pages.length > 1 && (
              <>
                <Button variant="outlined" disabled={at === 0} onClick={() => go(at - 1)}>
                  Previous page
                </Button>
                <Button variant="outlined" disabled={at >= pages.length - 1} onClick={() => go(at + 1)}>
                  Next page
                </Button>
              </>
            )}
          </footer>
        </div>
      </Dialog>
    </>
  );
}
