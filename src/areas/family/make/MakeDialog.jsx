// The make window (Phase 1.38 design §6.3; C-14, C-24), from ?dialog=make-<kind>: what it's about, one or two choices,
// then More options. A section page's starts ticked like the latest chat; the Notebook's also offers "This chat".
// Area: family

import { useRef, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../hooks/useAuth';
import { queryClient, sessionGeneration } from '../../../services/queryCache';
import { familyApi, familyKeys } from '../familyApi';
import { familyError } from '../familyErrors';
import { activityBasis, materialName } from '../familyPresentation';
import { kindWords } from '../familyWords';
import { resultPath } from '../sections';
import useDialogParam from '../useDialogParam';
import { whenLabel } from '../whenLabel';
import KindFields from './KindFields';
import { Segmented } from './MakeFields';
import { makeRequest, missingMaterialIds } from './makeRequest';
import { aboutOptions, makeButton, makeSentence, makeTitle, materialsNote } from './makeWords';
import './makeDialog.css';

const KINDS = ['quiz', 'flashcards', 'mindmap', 'story'];
// The kinds' own choices stay as the parent left them while the page is open, as they did in the Notebook.
const SETTINGS = {
  quizType: 'mcq',
  cardStyle: 'question_answer',
  mapDepth: 3,
  mapBreadth: 4,
  storyLength: 'short',
  storyTheme: '',
  storyTone: 'calm',
};
// What each opening starts afresh, as the Notebook's did. Null means "as it starts": basis, ticks and topic.
const fresh = () => ({
  basis: null,
  ticks: null,
  topic: null,
  count: '5',
  countOther: false,
  difficulty: 'Standard',
  focus: '',
  title: '',
  tag: '',
  moreOptions: false,
});

/** The kind whose make dialog a ?dialog= value opens (make-quiz…), or ''. */
export const makeKindOf = (dialog) => KINDS.find((kind) => dialog === `make-${kind}`) || '';

/**
 * `mode` is 'section' or 'notebook'. In the Notebook, `chat` is the open chat: { id, revision, materialIds, canChat }.
 * An opener may tick for the parent through the history's state: { make: { materialIds, basis, topic } }.
 * `onMade(activity)` runs once the item has started; the dialog then closes.
 */
export default function MakeDialog({ child, mode, chat, onMade }) {
  const userId = useAuth().user?.id;
  const location = useLocation();
  const navigate = useNavigate();
  const kind = makeKindOf(new URLSearchParams(location.search).get('dialog'));
  const [, , hide] = useDialogParam(`make-${kind || 'none'}`);
  const phone = useMediaQuery('(max-width:599px)');
  const generation = sessionGeneration();
  const section = mode === 'section';
  const [fields, setFields] = useState(fresh);
  const [settings, setSettings] = useState(SETTINGS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(null);
  // An item the server already had with these settings, and the request that found it (see make()).
  const [reused, setReused] = useState(null);
  const [shown, setShown] = useState('');
  if (shown !== kind) {
    setShown(kind);
    setFields(fresh());
    setError('');
  }
  const set = (change) => setFields((value) => ({ ...value, ...change }));
  const choose = (change) => setSettings((value) => ({ ...value, ...change }));
  const home = useQuery({
    queryKey: familyKeys.home(generation, userId, child.id),
    queryFn: ({ signal }) => familyApi.home(child.id, { signal }),
    enabled: !!kind,
  });
  // On a section page the ticks start as in the latest chat (C-24): read through the chat list, then that chat.
  const chatList = useQuery({
    queryKey: familyKeys.chats(generation, userId, child.id),
    queryFn: ({ signal }) => familyApi.chats(child.id, { signal }),
    enabled: !!kind && section,
  });
  const latestId = chatList.data?.items?.[0]?.id;
  const latest = useQuery({
    queryKey: familyKeys.conversation(generation, userId, child.id, latestId),
    queryFn: ({ signal }) => familyApi.chat(child.id, latestId, { signal }),
    enabled: !!kind && section && !!latestId,
  });
  const preset = location.state?.make;
  const startTicks = (section ? latest.data?.materialIds : chat?.materialIds) || [];
  const ticks = fields.ticks ?? preset?.materialIds ?? startTicks;
  // The notebook home's materials, homework uploads included, plus any ticked one it doesn't hold, read by id.
  const homeMaterials = home.data?.materials || [];
  const linked = useQueries({
    queries: missingMaterialIds(homeMaterials, ticks).map((id) => ({
      queryKey: familyKeys.material(generation, userId, child.id, id),
      queryFn: ({ signal }) => familyApi.material(child.id, id, { signal }),
      enabled: !!kind,
    })),
  });
  const materials = [...homeMaterials, ...linked.map((query) => query.data).filter(Boolean)].map((item) => ({
    ...item,
    title: materialName(item),
  }));
  // From a result (S3.3b): its materials ticked, but its topic to describe when none of them can be read (C-24).
  const lost =
    !!preset?.materialIds?.length &&
    linked.length === preset.materialIds.length &&
    linked.every((query) => query.isError) &&
    fields.ticks === null;
  const canChat = !section && !!chat?.canChat;
  const startBasis = section
    ? materials.length
      ? 'materials'
      : 'topic'
    : activityBasis(chat?.materialIds || [], canChat);
  const basis = fields.basis ?? (lost ? 'topic' : preset?.basis) ?? startBasis;
  const topic = fields.topic ?? (lost ? preset.fallbackTopic : preset?.topic) ?? '';
  const name = child.displayName;
  const about = aboutOptions({ name, hasMaterials: materials.length > 0, canChat });
  // A section page says where the ticks came from (design §6.3), under them; a parent's own ticks, or an opener's,
  // need no word. With no materials at all, it says to describe a topic instead.
  const noMaterials = section && !home.isPending && !materials.length;
  const note =
    section &&
    basis === 'materials' &&
    !preset &&
    fields.ticks === null &&
    !chatList.isPending &&
    !(latestId && latest.isPending)
      ? materialsNote(startTicks.length > 0)
      : '';
  const longBook =
    basis === 'materials' &&
    materials
      .filter((item) => ticks.includes(item.id))
      .reduce((sum, item) => sum + item.files.reduce((pages, file) => pages + file.pages, 0), 0) > 20;
  const count = Number(fields.count);
  const ready =
    Number.isInteger(count) &&
    count >= 1 &&
    count <= 10 &&
    !(basis === 'materials' && !ticks.length) &&
    !(basis === 'topic' && !topic.trim()) &&
    !(longBook && !fields.focus.trim());

  /**
   * `extra` adds to the request: "Make a new one" sends a new attempt key, so the server makes rather than reuses.
   * Only a plain object counts, never a click event (the Make button calls `make()` with nothing).
   */
  async function make(extra = null) {
    const plain = extra && typeof extra === 'object' && !('nativeEvent' in extra) ? extra : null;
    const body = {
      ...makeRequest({
        kind,
        mode,
        basis,
        ticks,
        topic,
        count: count || 5,
        focus: fields.focus,
        title: fields.title,
        tag: fields.tag,
        difficulty: fields.difficulty,
        settings,
        chat,
      }),
      ...(plain || {}),
    };
    // A retry of the same request after an error reuses its id, so it never makes two.
    const signature = JSON.stringify(body);
    if (pending.current?.signature !== signature) pending.current = { signature, id: crypto.randomUUID() };
    setBusy(true);
    setError('');
    try {
      const made = await familyApi.startActivity(child.id, pending.current.id, body);
      if (made.id !== pending.current.id) {
        // The server already had an item with these settings and gave that back (Phase 1.37's rule), so nothing was
        // made: ask, as a result's "Make a new one?" does, instead of closing in silence (the Manager, 14:10).
        setReused({ made, body });
        return;
      }
      pending.current = null;
      // The new row shows at the top of its list as "Making…", and the notebook home has it too.
      await queryClient.invalidateQueries({
        queryKey: familyKeys.child(generation, userId, child.id),
        predicate: ({ queryKey }) => ['home', 'activities'].includes(queryKey[4]),
      });
      onMade?.(made);
      hide();
    } catch (e) {
      setError(familyError(e, 'This could not finish. Your saved work is safe.'));
    } finally {
      setBusy(false);
    }
  }
  // "Open it": the existing item opens in the dialog's place, so its Close returns to this page (as the upload does).
  function openReused() {
    const { made } = reused;
    const page = new URLSearchParams(location.search);
    page.delete('dialog');
    const query = page.toString();
    setReused(null);
    navigate(resultPath(child.id, { kind: made.kind, id: made.id }), {
      replace: true,
      state: { from: location.pathname + (query ? `?${query}` : '') },
    });
  }
  // "Make a new one": the same request with a new attempt key, as a result's new version sends.
  function makeAnyway() {
    const { body, made } = reused;
    setReused(null);
    void make({ ...body, sourceActivityId: made.id, newAttemptKey: crypto.randomUUID() });
  }
  const reusedWords = reused && {
    title: `You already have this ${
      reused.made.kind === 'flashcards' ? 'set of cards' : (kindWords[reused.made.kind]?.label || 'item').toLowerCase()
    }`,
    sentence: `MySmartTeach made one with these settings ${(() => {
      const when = whenLabel(reused.made.finishedAt || reused.made.createdAt);
      return when ? when[0].toLowerCase() + when.slice(1) : 'before';
    })()}. Open it, or make a new one? The one you have is kept.`,
  };

  return (
    <Dialog
      open={!!kind}
      onClose={() => !busy && hide()}
      fullWidth
      maxWidth="sm"
      fullScreen={phone}
      className="fam-dialog fam-make"
      aria-describedby="fam-mk-sub"
    >
      <DialogTitle>{makeTitle(kind, name)}</DialogTitle>
      <DialogContent>
        <p className="fam-mk-sub" id="fam-mk-sub">
          {makeSentence(kind)}
        </p>
        <div className="fam-form">
          <Segmented
            id="fam-about"
            label="What’s it about?"
            value={basis}
            options={about}
            onChange={(v) =>
              set({ basis: v, ...(v === 'materials' && !ticks.length ? { ticks: [...startTicks] } : {}) })
            }
          />
          {noMaterials && <p className="fam-mk-note">{name} has no materials yet. Describe what it should be about.</p>}
          {basis === 'materials' && materials.length > 0 && (
            <div className="fam-mk-chips" role="group" aria-label="Which materials">
              {materials.map((item) => {
                const on = ticks.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="fam-mk-chip"
                    data-on={on}
                    aria-pressed={on}
                    onClick={() => set({ ticks: on ? ticks.filter((id) => id !== item.id) : [...ticks, item.id] })}
                  >
                    {on && <CheckRounded aria-hidden />}
                    {item.title}
                  </button>
                );
              })}
            </div>
          )}
          {note && <p className="fam-mk-note">{note}</p>}
          {basis === 'topic' && (
            <TextField
              multiline
              minRows={1}
              maxRows={3}
              label="What should it be about?"
              placeholder="For example: times tables to 12"
              value={topic}
              onChange={(e) => set({ topic: e.target.value })}
              inputProps={{ maxLength: 1500 }}
              fullWidth
            />
          )}
          <KindFields
            kind={kind}
            fields={fields}
            set={set}
            settings={settings}
            choose={choose}
            count={count}
            longBook={longBook}
          />
          {error && <Alert severity="error">{error}</Alert>}
        </div>
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={hide}>
          Cancel
        </Button>
        <Button
          variant="contained"
          className="mst-ai"
          disabled={busy || !ready}
          onClick={() => make()}
          startIcon={<AutoAwesomeRounded />}
          data-mst={`family-make-${kind}`}
        >
          {busy ? 'Starting…' : makeButton(kind)}
        </Button>
      </DialogActions>
      {/* The server already has an item with these settings (design §10.6's pattern): open it, or make a new one. */}
      <Dialog
        open={!!reused}
        onClose={() => setReused(null)}
        fullWidth
        maxWidth="xs"
        className="fam-dialog"
        aria-labelledby="fam-mk-reused"
      >
        <DialogTitle id="fam-mk-reused">{reusedWords?.title}</DialogTitle>
        <DialogContent>
          <Typography>{reusedWords?.sentence}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={openReused} data-mst="family-make-open-existing">
            Open it
          </Button>
          <Button
            variant="contained"
            className="mst-ai"
            startIcon={<AutoAwesomeRounded />}
            onClick={makeAnyway}
            data-mst="family-make-new-anyway"
          >
            Make a new one
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
