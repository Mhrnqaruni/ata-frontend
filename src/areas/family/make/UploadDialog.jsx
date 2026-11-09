// The upload dialog, opened from the address so Back closes it (C-18): Check homework (?dialog=check, design §5.4),
// the Notebook's materials upload (?dialog=upload) and Add the missing pages (?dialog=add-pages).
// Area: family

import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  useMediaQuery,
} from '@mui/material';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { queryClient, sessionGeneration } from '../../../services/queryCache';
import { familyApi, familyKeys } from '../familyApi';
import { familyError } from '../familyErrors';
import { familyPath } from '../familyPaths';
import PageDrop from '../homework/PageDrop';
import { UPLOAD_WORDS, accepted, busyWords, saveWords } from '../homework/uploadWords';
import { resultPath } from '../sections';
import useDialogParam, { openAt, useLiveLocation } from '../useDialogParam';

const SAFE = 'This could not finish. Your saved work is safe.';

/** Today's check call's body: one explicit tap marks a homework upload, with one AI check. */
export const checkRequest = (materialId, title) => ({
  materialId,
  materialIds: [materialId],
  kind: 'check',
  count: 5,
  focus: '',
  title: title || 'Homework check',
  tag: '',
  difficulty: 'Standard',
  quizType: 'mcq',
});

// Files a page hands over as it opens ?dialog=upload, such as those the chat's attach button picked. Files can't
// travel in a history entry, so they wait here, and a reload loses them: the dialog then reopens empty.
let staged = null;
/** Keeps `files` for the next upload dialog, and returns the token its history entry carries. */
export function stageFiles(files) {
  staged = { token: crypto.randomUUID(), files };
  return staged.token;
}

// A fresh dialog for the address, as today's newUpload made: client-made ids, so a retry saves and marks once.
function freshUpload(mode, state, params) {
  const ids = { id: crypto.randomUUID(), checkId: crypto.randomUUID(), title: '' };
  if (mode === 'check') return { ...ids, purpose: 'work', files: [] };
  if (mode === 'add-pages') return { ...ids, purpose: 'work', files: [], reason: 'missing', loading: true };
  const token = state?.upload?.files;
  return {
    ...ids,
    purpose: 'learning',
    files: token && staged?.token === token ? staged.files : [],
    // The chat the new material joins: the one the Notebook had open, else the one in its address.
    conversationId: state?.upload?.chatId || params.get('chat'),
  };
}

// The same file picked twice is kept once.
const same = (a, b) => a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

/** The shell draws it for the address's child (never null), so it opens on every page. */
export default function UploadDialog({ child }) {
  const { user } = useAuth();
  const generation = sessionGeneration();
  const navigate = useNavigate();
  const location = useLocation();
  const live = useLiveLocation();
  const [params] = useSearchParams();
  const phone = useMediaQuery('(max-width:599px)');
  const [checking, , hideCheck] = useDialogParam('check');
  const [uploading, , hideUpload] = useDialogParam('upload');
  const [adding, , hideAdd] = useDialogParam('add-pages');
  // Add the missing pages needs the check whose pages it adds to (`{ addPages: { activityId } }` in its entry).
  const activityId = adding ? location.state?.addPages?.activityId : undefined;
  const mode = checking ? 'check' : uploading ? 'upload' : activityId ? 'add-pages' : '';
  const [upload, setUpload] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Each opening starts afresh, as the address asks. Closing keeps the last one, so it doesn't change as it fades.
  const [shown, setShown] = useState('');
  if (shown !== mode) {
    setShown(mode);
    setError('');
    if (mode) setUpload(freshUpload(mode, location.state, params));
  }
  const close = () => (mode === 'check' ? hideCheck() : mode === 'upload' ? hideUpload() : hideAdd());
  // Today's "Add the missing pages": the first pages come back into a new upload, beside room for the missing ones.
  useEffect(() => {
    if (!activityId) return undefined;
    let alive = true;
    (async () => {
      const activity = await familyApi.activity(child.id, activityId);
      const original = await familyApi.material(child.id, activity.materialId);
      const files = await Promise.all(
        original.files.map(async (file, index) => {
          const data = await familyApi.materialFile(child.id, original.id, index);
          return new File([data], file.name, { type: file.mime });
        })
      );
      if (alive)
        setUpload((current) =>
          current?.reason
            ? { ...current, purpose: original.purpose, title: original.title, files, loading: false }
            : current
        );
    })().catch((e) => alive && setError(familyError(e, SAFE)));
    return () => {
      alive = false;
    };
  }, [activityId, child.id]);
  // The notebook home, and with a check also the child's lists, show what was saved (B10).
  const refresh = (lists) =>
    queryClient.invalidateQueries({
      queryKey: familyKeys.child(generation, user?.id, child.id),
      predicate: ({ queryKey }) => queryKey[4] === 'home' || (lists && queryKey[4] === 'activities'),
    });
  // Any change after a try may leave earlier files saved, which the alert below explains.
  const change = (next) => setUpload({ ...upload, ...next, changed: upload.submitted || upload.changed });
  function add(picked) {
    const fits = picked.filter(accepted);
    if (fits.length < picked.length) setError('That file type isn’t accepted.');
    if (!fits.length) return;
    change({
      files: [...upload.files, ...fits].filter((file, index, all) => all.findIndex((o) => same(o, file)) === index),
    });
  }

  async function saveUpload() {
    const captured = upload;
    if (busy) return;
    setUpload({ ...upload, submitted: true });
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('title', captured.title || '');
      form.append('purpose', captured.purpose);
      captured.files.forEach((file) => form.append('files', file));
      const data = await familyApi.uploadMaterial(child.id, captured.id, form, (e) =>
        setUpload((u) => (u ? { ...u, sent: e.total ? e.loaded / e.total : null } : u))
      );
      await refresh(false);
      if (captured.purpose === 'work') {
        // Marking is the reason a parent uploads homework, so it starts here (one explicit tap, one AI check).
        const job = await familyApi.startActivity(child.id, captured.checkId, checkRequest(data.id, captured.title));
        await refresh(true);
        if (!openAt(live.current, mode)) return; // Back closed it meanwhile: the check waits in Homework.
        if (mode === 'check') {
          // The window closes, and the check is at the top of Past checks as "Marking… about a minute" (design
          // §5.4): over Homework it steps back to it, and over any other page Homework takes the dialog's place.
          const homework = familyPath(child.id, 'homework');
          if (location.pathname === homework) close();
          else navigate(homework, { replace: true });
          return;
        }
        // Added pages: the new check opens in the dialog's place. Its back link returns to the page underneath, or,
        // for pages added from a result, to where that result's went.
        const page = new URLSearchParams(params);
        page.delete('dialog');
        const query = page.toString();
        const addPages = location.state?.addPages;
        const from = addPages && 'from' in addPages ? addPages.from : location.pathname + (query ? `?${query}` : '');
        navigate(resultPath(child.id, { kind: 'check', id: job.id }), { replace: true, state: { from } });
        return;
      }
      if (captured.conversationId) await familyApi.attachMaterial(child.id, captured.conversationId, data.id);
      await queryClient.invalidateQueries({
        queryKey: familyKeys.conversation(generation, user?.id, child.id, captured.conversationId),
      });
      close();
    } catch (e) {
      setError(familyError(e, SAFE));
    } finally {
      setBusy(false);
    }
  }

  const work = upload?.purpose === 'work';
  const use = upload?.reason ? 'add-pages' : work ? 'check' : 'upload';
  const words = UPLOAD_WORDS[use];
  return (
    <Dialog
      open={Boolean(mode && upload)}
      onClose={() => {
        if (!busy) close();
      }}
      fullWidth
      maxWidth="sm"
      fullScreen={phone}
      className="fam-dialog fam-upload-dialog"
    >
      <DialogTitle>{words.title}</DialogTitle>
      {upload && (
        <DialogContent>
          <div className="fam-form">
            <p className="fam-upload-lead">
              {typeof words.lead === 'function' ? words.lead(child.displayName) : words.lead}
            </p>
            <PageDrop
              words={words}
              files={upload.files}
              thumbs={work}
              disabled={busy}
              onAdd={add}
              onRemove={(index) => change({ files: upload.files.filter((_, i) => i !== index) })}
            />
            {upload.loading && !error && (
              <p className="fam-upload-note" role="status">
                Getting the first pages…
              </p>
            )}
            {/* No name for a check: the server keeps none (design §5.4). */}
            {!work && (
              <TextField
                label="Name (optional)"
                placeholder="For example: Times tables sheet"
                value={upload.title || ''}
                disabled={busy}
                onChange={(e) => change({ title: e.target.value })}
                fullWidth
              />
            )}
            {error && <Alert severity="error">{error}</Alert>}
            {upload.changed && (
              <Alert severity="info">
                The earlier files may already be saved.
                <Button
                  onClick={() => {
                    close();
                    void refresh(false);
                  }}
                >
                  See what’s saved
                </Button>
                <Button
                  onClick={() =>
                    setUpload({
                      ...upload,
                      id: crypto.randomUUID(),
                      checkId: crypto.randomUUID(),
                      submitted: false,
                      changed: false,
                    })
                  }
                >
                  Save these as new
                </Button>
              </Alert>
            )}
          </div>
        </DialogContent>
      )}
      <DialogActions>
        {/* Why the button is off (design §10.2): a tester took the pale button for broken. */}
        {words.first && upload && !upload.files.length && <p className="fam-small fam-grow">{words.first}</p>}
        <Button disabled={busy} onClick={close}>
          Cancel
        </Button>
        {/* Checking homework is an AI action, in teacher's gradient; it shows its progress itself ([HIG: Buttons]). */}
        <Button
          variant="contained"
          className={work ? 'mst-ai' : undefined}
          disabled={busy || !upload || upload.loading || upload.changed || !upload.files.length}
          startIcon={
            busy ? (
              <CircularProgress size={16} color="inherit" aria-hidden />
            ) : work ? (
              <AutoAwesomeRounded />
            ) : undefined
          }
          onClick={saveUpload}
          data-mst="family-upload-save"
        >
          {busy
            ? busyWords(
                use,
                upload.files.map((file) => file.size),
                upload.sent
              )
            : saveWords(use, upload?.files.length)}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
