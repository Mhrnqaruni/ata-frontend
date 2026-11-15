// Questions, step 2 (design.md §3.4; Phase 1.47 §3.11): every question on one page as a 72 px card that opens in place,
// the outline from 10 questions (beside the cards from 1100 px, else Go to), or an empty quiz's two starts, once.
// Area: quizzes

import { useCallback, useEffect, useState } from 'react';
import { Button, Drawer, useMediaQuery } from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import EditNoteOutlined from '@mui/icons-material/EditNoteOutlined';
import { downloadCsv } from './csv';
import EditorFrame from './EditorFrame';
import { modeOf } from './editorState';
import EveryDialog from './EveryDialog';
import GoToField from './GoToField';
import ImportWithAI from './ImportWithAI';
import PictureWindow from './PictureWindow';
import PreviewWindow from './PreviewWindow';
import QuestionActions from './QuestionActions';
import QuestionCard from './QuestionCard';
import QuestionEditor from './QuestionEditor';
import { blankQuestion, changeType, copyOf, MAX_QUESTIONS } from './questionModel';
import QuestionOutline from './QuestionOutline';
import UndoToast from './UndoToast';
import { EDITOR, EVERY, IMPORT, QUESTIONS } from './words';
import './questions.css';

export const OUTLINE_FROM = 10; // a shorter quiz's outline would only repeat its cards (§10, C1-15)
const OUTLINE_KEY = 'mst.quizEditor.outline';

// Whether the teacher hid the outline, remembered on this device.
function useOutlineHidden() {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(OUTLINE_KEY) === 'hidden';
    } catch {
      return false;
    }
  });
  const remember = useCallback((value) => {
    setHidden(value);
    try {
      localStorage.setItem(OUTLINE_KEY, value ? 'hidden' : 'shown');
    } catch {
      /* the choice just isn't remembered */
    }
  }, []);
  return [hidden, remember];
}

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// open: the keys of the open cards; focus: { key, scroll } of the question to bring into view and type in.
export default function QuestionsPage({ editor, open, setOpen, focus, setFocus, frame, onBack, onNext, onFinish }) {
  const { quiz, dispatch, addPicture } = editor;
  const { questions } = quiz;
  const live = modeOf(quiz.settings) === 'live';
  const wide = useMediaQuery('(min-width:1100px)', { noSsr: true }); // known on the first render: no flash of Go to
  const [outlineHidden, setOutlineHidden] = useOutlineHidden();
  const many = questions.length >= OUTLINE_FROM;
  const side = wide && many && !outlineHidden;
  const [drawer, setDrawer] = useState(false);
  const [dialog, setDialog] = useState(null); // 'preview', 'import', 'time_limit_seconds', 'points', or { picture }
  const [toast, setToast] = useState(null);
  const full = questions.length >= MAX_QUESTIONS;
  const current = open.size === 1 ? [...open][0] : (focus?.key ?? null);

  useEffect(() => {
    if (!focus) return;
    document
      .querySelector(`[data-key="${focus.key}"]`)
      ?.scrollIntoView({ block: focus.scroll ?? 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
  }, [focus]);

  const goTo = useCallback(
    (key, scroll = 'center') => {
      setOpen(new Set([key]));
      setFocus({ key, scroll, at: Date.now() });
    },
    [setOpen, setFocus]
  );
  const openCard = useCallback((key) => goTo(key, 'nearest'), [goTo]);
  const say = (message, undo) => setToast({ id: Date.now(), message, undo });

  const addQuestion = () => {
    if (full) return;
    const question = blankQuestion();
    dispatch({ type: 'add', question });
    goTo(question.key);
  };
  const switchType = (question, type) => {
    const { removed } = changeType(question, type);
    dispatch({ type: 'question', key: question.key, patch: (now) => changeType(now, type).question });
    if (removed) say(removed, () => dispatch({ type: 'question', key: question.key, patch: () => question }));
  };
  const remove = (question, index) => {
    dispatch({ type: 'remove', key: question.key });
    say(QUESTIONS.deleted, () => dispatch({ type: 'add', question, at: index }));
  };
  const copy = (question, index) => {
    const twin = copyOf(question);
    dispatch({ type: 'add', question: twin, at: index + 1 });
    goTo(twin.key, 'nearest');
  };
  const close = (key) => setOpen(new Set([...open].filter((each) => each !== key)));
  const move = (from, to) => dispatch({ type: 'move', from, to });

  const more = {
    exportCsv: () => downloadCsv(questions, quiz.title),
    everyTime: () => setDialog('time_limit_seconds'),
    everyScore: () => setDialog('points'),
    openAll: () => setOpen(new Set(questions.map((question) => question.key))),
    closeAll: () => setOpen(new Set()),
  };

  const body = questions.length ? (
    <>
      {many && !side ? (
        <GoToField
          questions={questions}
          onGo={goTo}
          wide={wide}
          onOutline={() => (wide ? setOutlineHidden(false) : setDrawer(true))}
        />
      ) : null}
      <div className="mst-qe-questions" data-outline={side ? 'side' : undefined}>
        {side ? (
          <QuestionOutline
            questions={questions}
            current={current}
            onGo={goTo}
            onMove={move}
            onHide={() => setOutlineHidden(true)}
          />
        ) : null}
        <div className="mst-qe-cards">
          {questions.map((question, index) =>
            open.has(question.key) ? (
              <QuestionEditor
                key={question.key}
                question={question}
                number={index + 1}
                live={live}
                focus={focus?.key === question.key ? focus.at : null}
                canCopy={!full}
                change={(patch) => dispatch({ type: 'question', key: question.key, patch })}
                onType={(type) => switchType(question, type)}
                onCopy={() => copy(question, index)}
                onDelete={() => remove(question, index)}
                onClose={() => close(question.key)}
                onPicture={() => setDialog({ picture: question.key })}
              />
            ) : (
              <QuestionCard key={question.key} question={question} number={index + 1} live={live} onOpen={openCard} />
            )
          )}
          {full ? null : (
            <button type="button" className="mst-qe-add-card" onClick={addQuestion}>
              <AddRounded aria-hidden="true" />
              {QUESTIONS.addQuestionCard}
            </button>
          )}
        </div>
      </div>
    </>
  ) : (
    // An empty quiz: its two ways to start, once, centred; the header's actions come back with the first question.
    <section className="mst-qe-empty" aria-labelledby="mst-qe-empty-title">
      <h2 className="mst-qe-empty-title" id="mst-qe-empty-title">
        {QUESTIONS.addFirst}
      </h2>
      <div className="mst-qe-empty-tiles">
        <button type="button" className="mst-qe-tile" onClick={addQuestion}>
          <span className="mst-tile" aria-hidden="true">
            <EditNoteOutlined />
          </span>
          <span className="mst-qe-tile-title">{QUESTIONS.firstQuestion}</span>
          <span className="mst-qe-tile-hint">{QUESTIONS.firstQuestionHint}</span>
        </button>
        <button type="button" className="mst-qe-tile" onClick={() => setDialog('import')}>
          <span className="mst-tile" data-ai="true" aria-hidden="true">
            <AutoAwesomeRounded />
          </span>
          <span className="mst-qe-tile-title">{QUESTIONS.fromWorksheet}</span>
          <span className="mst-qe-tile-hint">{QUESTIONS.fromWorksheetHint}</span>
        </button>
      </div>
    </section>
  );

  return (
    <EditorFrame
      editor={editor}
      {...frame}
      actions={
        questions.length ? (
          <QuestionActions
            wide={wide}
            live={live}
            full={full}
            onPreview={() => setDialog('preview')}
            onImport={() => setDialog('import')}
            onAdd={addQuestion}
            more={more}
          />
        ) : null
      }
      barStart={
        <Button startIcon={<ArrowBackRounded />} onClick={onBack}>
          {EDITOR.back}
        </Button>
      }
      barEnd={
        // On an empty quiz the two cards hold the main action, so Next is quiet and Finish editing waits.
        <>
          {questions.length ? <Button onClick={onFinish}>{EDITOR.finishEditing}</Button> : null}
          <Button
            variant={questions.length ? 'contained' : 'outlined'}
            size="large"
            endIcon={<ArrowForwardRounded />}
            onClick={onNext}
          >
            {EDITOR.nextSettings}
          </Button>
        </>
      }
    >
      {body}
      <Drawer anchor="left" open={drawer} onClose={() => setDrawer(false)} PaperProps={{ className: 'mst-qe-drawer' }}>
        <QuestionOutline
          questions={questions}
          current={current}
          autoFocus
          onMove={move}
          onGo={(key) => {
            setDrawer(false);
            goTo(key);
          }}
        />
      </Drawer>
      <PreviewWindow
        open={dialog === 'preview'}
        questions={questions}
        start={questions.findIndex((question) => question.key === current)}
        live={live}
        onClose={() => setDialog(null)}
      />
      <ImportWithAI
        open={dialog === 'import'}
        onClose={() => setDialog(null)}
        onAdd={(added) => {
          dispatch({ type: 'append', questions: added });
          setDialog(null);
          say(IMPORT.added(added.length));
        }}
      />
      <EveryDialog
        field={dialog === 'time_limit_seconds' || dialog === 'points' ? dialog : null}
        start={
          dialog === 'points'
            ? questions.find((q) => q.question_type !== 'poll')?.points
            : questions[0]?.time_limit_seconds
        }
        onClose={() => setDialog(null)}
        onApply={(field, value) => {
          dispatch({ type: 'every', field, value });
          setDialog(null);
          say(field === 'points' ? EVERY.scoreDone(value) : EVERY.timeDone(value));
        }}
      />
      <PictureWindow
        open={Boolean(dialog?.picture)}
        onClose={() => setDialog(null)}
        onAdd={(file) => addPicture(dialog.picture, file)}
      />
      <UndoToast toast={toast} onClose={() => setToast(null)} />
    </EditorFrame>
  );
}
