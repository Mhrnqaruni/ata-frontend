// A result at its own address (design §3.10–3.11; C-2, C-18), full screen in the frame every opened item shares
// (Phase 1.38 design §6.4): glass bars, the item's line, progress, and Advanced at the end. Close goes back.
// Area: family

import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import { Navigate, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../hooks/useAuth';
import { queryClient, sessionGeneration } from '../../../services/queryCache';
import FamilyEvidence from '../FamilyEvidence';
import FamilyResult from '../FamilyResult';
import { familyApi, familyKeys } from '../familyApi';
import { familyError } from '../familyErrors';
import { isRunning, kindWords } from '../familyWords';
import { rememberOpened } from '../newMarks';
import { SECTIONS, resultPath } from '../sections';
import { usePageTitle } from '../shell/FamilyPage';
import { useLiveLocation, useOpenDialog } from '../useDialogParam';
import ExplanationView from './ExplanationView';
import { askAbout, explainInChat, practise } from './resultActions';
import { backLink, itemLine, newVersionRequest, newVersionWords, resultState } from './resultRules';
import './results.css';

const SAFE = 'This could not finish. Your saved work is safe.';

/** `segment` is the route's: quizzes, flashcards, mind-maps, stories, homework or notebook/explanations. */
export default function ResultPage({ segment }) {
  // A new version replaces the address, so each item starts with fresh state.
  const { activity_id: id } = useParams();
  return <Result key={id} id={id} segment={segment} />;
}

function Result({ id, segment }) {
  const { child } = useOutletContext();
  const userId = useAuth().user?.id;
  const location = useLocation();
  const live = useLiveLocation();
  const navigate = useNavigate();
  const generation = sessionGeneration();
  const detail = useQuery({
    queryKey: familyKeys.activity(generation, userId, child.id, id),
    queryFn: ({ signal }) => familyApi.activity(child.id, id, { signal }),
    // As today, it polls while it's being made, so a Refresh shows "Getting it ready" until it's done.
    refetchInterval: (query) => (isRunning(query.state.data) ? 2500 : false),
    retry: (count, error) => ![403, 404].includes(error?.response?.status) && count < 2,
  });
  const activity = detail.data;
  const quiz = activity?.kind === 'quiz';
  // A quiz's result shows its attempts, which the notebook home holds, under the Notebook's own key.
  const home = useQuery({
    queryKey: familyKeys.home(generation, userId, child.id),
    queryFn: ({ signal }) => familyApi.home(child.id, { signal }),
    enabled: quiz,
  });
  const [progress, setProgress] = useState('');
  const [action, setAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [recordError, setRecordError] = useState('');
  const [stopAsk, setStopAsk] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const pending = useRef(null);
  const askChat = useRef(null); // The new chat Ask about this makes, which a retry reuses.
  const openDialog = useOpenDialog();
  const state = resultState({ activity, error: detail.error, segment, childId: child.id });
  const back = backLink({ from: location.state?.from, segment, childId: child.id, childName: child.displayName });
  const kind = kindWords[activity?.kind];
  usePageTitle(kind?.label || 'Result');
  const draftKey = [...familyKeys.child(generation, userId, child.id), 'quizDraft', id];
  // A finished item shown here is opened, which clears its "new" mark (S4.1; design §3.12). One still being made
  // isn't: if the parent leaves before it's done, it's new when it finishes.
  const opened = state === 'show' && activity.status === 'completed' ? activity.id : '';
  useEffect(() => {
    if (opened) rememberOpened(userId, child.id, opened);
  }, [opened, userId, child.id]);
  if (typeof state === 'object') return <Navigate to={state.redirect} replace state={location.state} />;

  // The child's lists, scores and notebook home change with an attempt or a new version.
  const refreshLists = () =>
    queryClient.invalidateQueries({
      queryKey: familyKeys.child(generation, userId, child.id),
      predicate: ({ queryKey }) => ['home', 'activities'].includes(queryKey[4]),
    });
  // Close and the back link: during a quiz with answers, "Stop for now?" first; the answers are kept (C-18).
  function close(force = false) {
    const draft = queryClient.getQueryData(draftKey);
    if (!force && quiz && draft?.practising && Object.keys(draft.answers || {}).length > 0) {
      setStopAsk(true);
      return;
    }
    setStopAsk(false);
    // Came from a page: step back to it. Opened directly: go to the item's section in this entry's place.
    if (location.state?.from) navigate(-1);
    else navigate(back.to, { replace: true });
  }
  async function record(attemptId, answers) {
    if (busy) return false;
    setBusy(true);
    setRecordError('');
    try {
      await familyApi.saveAttempt(child.id, id, attemptId, answers);
      await refreshLists();
      return true;
    } catch (e) {
      setRecordError(familyError(e, SAFE));
      return false;
    } finally {
      setBusy(false);
    }
  }
  // A new item from this one's settings, which replaces the address; Back then returns to the list (design §3.10).
  async function makeNew() {
    setConfirmNew(false);
    if (busy) return;
    setBusy(true);
    setError('');
    // A retry after an error sends the same request again, so it never makes two.
    pending.current ??= { id: crypto.randomUUID(), body: newVersionRequest(activity, crypto.randomUUID()) };
    const here = location.pathname;
    try {
      const made = await familyApi.startActivity(child.id, pending.current.id, pending.current.body);
      void refreshLists();
      // If Back left meanwhile, the new item waits in its list instead.
      if (live.current?.pathname !== here) return;
      navigate(resultPath(child.id, { kind: activity.kind, id: made.id }), { replace: true, state: location.state });
    } catch (e) {
      setError(familyError(e, SAFE));
      setBusy(false);
    }
  }

  // The result's actions (C-14, C-24): Ask about this and Explain in chat open the Notebook at the right chat, and
  // Practise with a quiz the Quizzes page's dialog with the item's materials. None changes a chat's materials.
  const go = (to, options) => navigate(to, options);
  async function act(work) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (e) {
      setError(familyError(e, SAFE));
      setBusy(false);
    }
  }
  const onAsk = (label) =>
    act(() =>
      askAbout({ api: familyApi, activity, child, label, go, newId: (askChat.current ??= crypto.randomUUID()) })
    );
  const onExplain = (text) => act(() => explainInChat({ api: familyApi, child, from: location.state?.from, text, go }));
  const onMakeQuiz = () => practise({ activity, child, go });

  // Advanced (design §6.4): today's "Sources & coverage", one closed disclosure at the end of the content. Homework
  // keeps it above its result until its row places it at the end (design §5.5).
  const evidence = state === 'show' ? <FamilyEvidence childId={child.id} activity={activity} scope="result" /> : null;
  const confirm = newVersionWords(activity);
  const title =
    state === 'unavailable'
      ? 'That isn’t available.'
      : activity?.kind === 'check' && /^homework( check)?$/i.test(activity?.title || '')
        ? `${child.displayName}’s homework`
        : activity?.title || '';
  // The section an item lands in, named in the waiting words (design §10.5).
  const place = SECTIONS.find((section) => section.kind === activity?.kind)?.label || 'its section';
  let body;
  if (state === 'unavailable' || state === 'error')
    body = (
      <div className="fam-viewer-scroll fam-centre">
        <section className="fam-making">
          {/* "That isn't available." is the page's h1, the same for an unknown id and another child's item. */}
          {state === 'error' && (
            <Alert severity="error" action={<Button onClick={() => detail.refetch()}>Try again</Button>}>
              Could not open this.
            </Alert>
          )}
        </section>
      </div>
    );
  else if (state === 'wait')
    body = (
      <div className="fam-viewer-scroll fam-centre">
        <CircularProgress aria-label="Opening" />
      </div>
    );
  else if (isRunning(activity))
    body = (
      <>
        <div className="fam-viewer-scroll fam-centre">
          {/* Getting it ready (design §10.5): what's happening, that the parent may leave, and what if it fails. */}
          <section className="fam-making" role="status">
            <CircularProgress size={44} aria-hidden />
            <Typography component="h2" className="fam-h">
              {activity.kind === 'check'
                ? `Marking ${child.displayName}’s homework…`
                : `Making ${child.displayName}’s ${(kind?.label || 'activity').toLowerCase()}…`}
            </Typography>
            <Typography className="fam-making-sub">
              It takes about a minute. You can close this page:{' '}
              {activity.kind === 'check' ? 'the result' : `the ${(kind?.label || 'activity').toLowerCase()}`} will be in{' '}
              {place}
              {activity.kind === 'quiz' ? ', marked ‘Not tried yet’' : ''}.
            </Typography>
            <Typography className="fam-making-sub">
              If it doesn’t finish, {place} will say so, and you can try again.
            </Typography>
          </section>
        </div>
      </>
    );
  else if (activity.kind === 'learn')
    body = <ExplanationView activity={activity} busy={busy} onAsk={() => onAsk(activity.title)} advanced={evidence} />;
  else if (activity.result)
    body = (
      <FamilyResult
        key={activity.id}
        activity={activity}
        childName={child.displayName}
        childId={child.id}
        onProgress={setProgress}
        onHeaderAction={setAction}
        onRecord={record}
        busy={busy}
        attempts={home.data?.attempts || []}
        draftKey={draftKey}
        saveError={recordError}
        sourceFiles={activity.sourceFiles || []}
        onNewVersion={() => setConfirmNew(true)}
        onAsk={onAsk}
        onExplain={onExplain}
        onMakeQuiz={onMakeQuiz}
        advanced={activity.kind === 'check' ? null : evidence}
      />
    );
  else
    body = (
      <>
        <div className="fam-viewer-scroll fam-centre">
          <section className="fam-making">
            <Typography component="h2" className="fam-h">
              {activity.status === 'needs_input'
                ? 'Some pages are missing'
                : `This ${(kind?.label || 'activity').toLowerCase()} couldn’t be made`}
            </Typography>
            <Typography className="fam-done-sub">
              {activity.status === 'needs_input'
                ? activity.error || 'Add them, and MySmartTeach tries again.'
                : 'Your other work is safe.'}
            </Typography>
          </section>
        </div>
        <footer className="fam-viewer-foot">
          <span className="fam-grow" />
          {activity.status === 'needs_input' ? (
            <Button
              variant="contained"
              disabled={busy}
              onClick={() =>
                // In this result's place: Cancel stays here, and the new check takes its place, with its back link.
                openDialog(
                  'add-pages',
                  { addPages: { activityId: activity.id, from: location.state?.from ?? null } },
                  { replace: true }
                )
              }
              data-mst="family-result-add-pages"
            >
              Add the missing pages
            </Button>
          ) : (
            <Button variant="contained" disabled={busy} onClick={() => setConfirmNew(true)}>
              Try again
            </Button>
          )}
        </footer>
      </>
    );

  // A tried quiz says when (design §6.4): its latest attempt, from the notebook home's list.
  const tried = quiz
    ? (home.data?.attempts || [])
        .filter((row) => row.activityId === activity?.id)
        .map((row) => row.createdAt)
        .sort()
        .at(-1) || null
    : null;
  const line = state === 'show' ? itemLine(activity, child.displayName, new Date(), tried) : '';
  return (
    <Dialog open fullScreen className="fam-viewer" onClose={() => close()} transitionDuration={{ enter: 240, exit: 0 }}>
      {/* Teacher's ground behind the glass bars, as on every other page. */}
      <div className="mst-ground" aria-hidden />
      <header className="fam-viewer-head">
        {/* One labelled exit (design §6.4): Close, back to where the parent came from. */}
        <Button
          className="fam-viewer-close"
          startIcon={<CloseRounded />}
          onClick={() => close()}
          data-mst="family-result-close"
        >
          Close
        </Button>
        <div className="fam-viewer-title">
          <Typography component="h1" className="fam-viewer-name">
            {title}
          </Typography>
          {line && <span className="fam-viewer-line">{line}</span>}
        </div>
        {progress && (
          <span className="fam-viewer-progress" aria-live="polite">
            {progress}
          </span>
        )}
        {action && <span className="fam-viewer-action">{action}</span>}
      </header>
      {error && (
        <Alert severity="error" className="fam-viewer-alert" onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {activity?.kind === 'check' && evidence}
      <div className="fam-viewer-main">{body}</div>
      {/* The confirmations (design §10.6): the question, what's kept, and the verb on the button. */}
      <Dialog open={stopAsk} onClose={() => setStopAsk(false)} maxWidth="xs" fullWidth className="fam-dialog">
        <DialogTitle>Stop the quiz for now?</DialogTitle>
        <DialogContent>
          <Typography>{child.displayName}’s answers so far are saved, so you can carry on later.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStopAsk(false)}>Keep going</Button>
          <Button variant="contained" onClick={() => close(true)}>
            Stop for now
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={confirmNew} onClose={() => setConfirmNew(false)} fullWidth maxWidth="xs" className="fam-dialog">
        <DialogTitle>{confirm.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirm.sentence}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmNew(false)}>Cancel</Button>
          <Button
            variant="contained"
            className="mst-ai"
            startIcon={<AutoAwesomeRounded />}
            onClick={makeNew}
            data-mst="family-result-new"
          >
            {confirm.verb}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
