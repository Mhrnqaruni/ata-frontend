// The quiz editor page (Phase 1.46, SOT-11 to SOT-13; design.md §3.2–§3.6): one quiz, its three steps (Details,
// Questions, Settings), Finish editing with its checklist or Ready panel, and the Start window.
// Area: quizzes

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Button, Skeleton } from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import PageHeader from '../../../components/common/PageHeader';
import DetailsCard from './DetailsCard';
import { issueOf } from './draft';
import EditorFrame from './EditorFrame';
import { modeOf } from './editorState';
import { Checklist, ReadyPanel } from './FinishPanel';
import { useAudienceNames } from './queries';
import QuestionsPage from './QuestionsPage';
import SettingsTiles from './SettingsTiles';
import StartImport from './StartImport';
import StartWindow from './StartWindow';
import useEditor from './useEditor';
import useFinish from './useFinish';
import useLeave from './useLeave';
import useTags from './useTags';
import { EDITOR, FINISH, joinNames } from './words';
import './editor.css';
import './details.css';
import './settings.css';

const STEP_NAMES = ['details', 'questions', 'settings'];
export const ALL_CLOSED_FROM = 20; // from 20 questions every card starts closed (design.md §3.4)

// The cards open when a quiz opens: the first unfinished question of a short quiz, so the work is where it starts.
export function firstOpen(questions) {
  if (questions.length >= ALL_CLOSED_FROM) return new Set();
  const first = questions.find((question) => issueOf(question));
  return new Set(first ? [first.key] : []);
}

// The address without its ?step= request, keeping anything else in it, without telling the router (StartImport's way).
function dropStep() {
  const address = new URL(window.location.href);
  address.searchParams.delete('step');
  window.history.replaceState(window.history.state, '', `${address.pathname}${address.search}${address.hash}`);
}

function Loading() {
  return (
    <div className="mst-qe" aria-busy="true">
      <Skeleton variant="text" width={360} height={44} />
      <Skeleton variant="text" width={280} height={24} sx={{ mb: 2 }} />
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} variant="rounded" height={72} sx={{ mb: 1, maxWidth: 960 }} />
      ))}
    </div>
  );
}

export default function QuizEditor({ quizId }) {
  const editor = useEditor(quizId);
  const { quiz } = editor;
  const tags = useTags(quizId, quiz);
  const { leave, dialog: leaving } = useLeave(editor);
  const { finish, finishing } = useFinish(editor);
  const names = useAudienceNames(quiz?.audience);
  const [params] = useSearchParams();
  // ?step= asks for a step, or for the Ready panel: the quiz list's Ready rows open ?step=ready (Phase 1.47).
  const [asked] = useState(() => params.get('step'));
  const [step, setStep] = useState(() => {
    const index = STEP_NAMES.indexOf(asked);
    return index >= 0 ? index : quizId ? 1 : 0;
  });
  const [reached, setReached] = useState(quizId ? 2 : 0);
  const [open, setOpen] = useState(() => new Set());
  const [focus, setFocus] = useState(null);
  const [titleMissing, setTitleMissing] = useState(false);
  const [problems, setProblems] = useState(null); // Finish editing's checklist, in place of the tiles
  const [ready, setReady] = useState(false); // the Ready panel after Finish editing
  const [starting, setStarting] = useState(null); // the Start window: { chooseFirst }
  const opened = useRef(false);

  // The first look at a loaded quiz opens its first unfinished question, or a ready quiz's Ready panel when the address
  // asks for it (a draft opens as usual). The address then drops ?step=, so a reload opens the editor as usual. Before
  // the first paint, so neither flashes.
  useLayoutEffect(() => {
    if (!quiz || opened.current) return;
    opened.current = true;
    setOpen(firstOpen(quiz.questions));
    if (asked === 'ready' && quiz.status !== 'draft') setReady(true);
    if (asked) dropStep();
  }, [quiz, asked]);

  const goStep = useCallback((next) => {
    setStep(next);
    setReached((now) => Math.max(now, next));
    setProblems(null);
    setReady(false);
    window.scrollTo({ top: 0 });
  }, []);
  // The header's "2 need a right answer", and the checklist's Go to: that question, open, on the questions step.
  const goToQuestion = useCallback(
    (index) => {
      const key = quiz?.questions[index]?.key;
      goStep(1);
      if (key) {
        setOpen(new Set([key]));
        setFocus({ key, scroll: 'center', at: Date.now() });
      }
    },
    [quiz, goStep]
  );

  if (editor.loadError)
    return (
      <div className="mst-qe">
        <PageHeader title={EDITOR.loadFailed} backTo="/quizzes" backLabel={EDITOR.backToQuizzes} />
        <Alert
          severity="error"
          action={
            <Button color="inherit" onClick={editor.reload}>
              {EDITOR.tryAgain}
            </Button>
          }
          sx={{ maxWidth: 720 }}
        >
          {editor.loadError.message}
        </Alert>
      </div>
    );
  if (!quiz) return <Loading />;

  const live = modeOf(quiz.settings) === 'live';
  // Next from Details needs a title; a draft then saves at once rather than after 2 s.
  const toQuestions = () => {
    if (!quiz.title.trim()) return setTitleMissing(true);
    goStep(1);
    if (quiz.status === 'draft') void editor.saveNow();
    return undefined;
  };
  // Finish editing, from step 2 or 3: the checklist on the settings step, or the Ready panel.
  const finishEditing = async () => {
    if (step !== 2) goStep(2);
    const result = await finish();
    if (result.ok) {
      setProblems(null);
      setReady(true);
      window.scrollTo({ top: 0 });
    } else setProblems(result.problems);
  };
  const goToProblem = (problem) => {
    if (problem.index != null) return goToQuestion(problem.index);
    if (problem.field === 'title') setTitleMissing(true);
    return goStep(problem.field === 'title' ? 0 : 1);
  };
  const frame = {
    step: ready ? null : step,
    reached: quiz.title.trim() ? reached : 0,
    onStep: goStep,
    onWarning: goToQuestion,
  };

  return (
    <div className="mst-qe" data-step={ready ? 'ready' : STEP_NAMES[step]}>
      {ready ? (
        <EditorFrame editor={editor} {...frame}>
          <ReadyPanel
            live={live}
            names={joinNames([...names.classes, ...names.groups])}
            hasRun={quiz.status === 'completed'}
            onStart={() => setStarting({ chooseFirst: false })}
            onChangeClasses={() => setStarting({ chooseFirst: true })}
            onBack={leave}
            onEditQuestions={() => goStep(1)}
          />
        </EditorFrame>
      ) : null}
      {!ready && step === 0 ? (
        <EditorFrame
          editor={editor}
          {...frame}
          barStart={
            <Button startIcon={<ArrowBackRounded />} onClick={leave}>
              {EDITOR.backToQuizzes}
            </Button>
          }
          barEnd={
            <Button variant="contained" size="large" endIcon={<ArrowForwardRounded />} onClick={toQuestions}>
              {EDITOR.nextQuestions}
            </Button>
          }
        >
          <DetailsCard quiz={quiz} dispatch={editor.dispatch} tags={tags} titleMissing={titleMissing} />
        </EditorFrame>
      ) : null}
      {!ready && step === 1 ? (
        <QuestionsPage
          editor={editor}
          open={open}
          setOpen={setOpen}
          focus={focus}
          setFocus={setFocus}
          frame={frame}
          onBack={() => goStep(0)}
          onNext={() => goStep(2)}
          onFinish={finishEditing}
        />
      ) : null}
      {!ready && step === 2 ? (
        <EditorFrame
          editor={editor}
          {...frame}
          barStart={
            <Button startIcon={<ArrowBackRounded />} onClick={() => goStep(1)}>
              {EDITOR.back}
            </Button>
          }
          barEnd={
            <Button variant="contained" size="large" disabled={finishing} onClick={finishEditing}>
              {finishing ? FINISH.finishing : EDITOR.finishEditing}
            </Button>
          }
        >
          {problems ? (
            <Checklist problems={problems} onGo={goToProblem} />
          ) : (
            <SettingsTiles
              quiz={quiz}
              onSettings={(patch) => editor.dispatch({ type: 'settings', patch })}
              onPair={(fields, mode) => {
                editor.dispatch({ type: 'set', fields });
                if (mode) editor.dispatch({ type: 'settings', patch: { mode } });
              }}
            />
          )}
        </EditorFrame>
      ) : null}
      <StartWindow
        open={Boolean(starting)}
        quiz={quiz}
        chooseFirst={starting?.chooseFirst}
        onClose={() => setStarting(null)}
      />
      <StartImport dispatch={editor.dispatch} />
      {leaving}
    </div>
  );
}
