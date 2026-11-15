// The editor's frame (design.md §3.0): the header (title with the saving words, context line, unfinished link,
// actions), the step line, the step itself and its bottom bar.
// Area: quizzes

import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import PageHeader from '../../../components/common/PageHeader';
import { classList } from '../words';
import BottomBar from './BottomBar';
import { minutesOf, unfinished } from './draft';
import { modeOf } from './editorState';
import { useAudienceNames } from './queries';
import SaveStatus from './SaveStatus';
import StepLine from './StepLine';
import { EDITOR } from './words';

// The stored status in the quiz area's words (../words.js STATES).
const STATE_WORDS = { draft: 'Draft', published: 'Ready', completed: 'Finished' };

export default function EditorFrame({ editor, step, reached, onStep, onWarning, actions, barStart, barEnd, children }) {
  const { quiz, save, changed, saveNow } = editor;
  const names = useAudienceNames(quiz.audience);
  const count = quiz.questions.length;
  const facts = [
    names.loading ? null : classList([...names.classes, ...names.groups].map((name) => ({ name }))),
    EDITOR.questions(count),
    modeOf(quiz.settings) === 'live' && count ? EDITOR.aboutMinutes(minutesOf(quiz.questions)) : null,
    STATE_WORDS[quiz.status],
  ].filter(Boolean);
  const warning = unfinished(quiz.questions);
  const context = (
    <span className="mst-qe-context">
      <span className="mst-qe-context-text">{facts.join(' · ')}</span>
      {warning ? (
        <button type="button" className="mst-qe-warning" onClick={() => onWarning(warning.first)}>
          <WarningAmberRounded aria-hidden="true" />
          {warning.text}
        </button>
      ) : null}
    </span>
  );
  return (
    <>
      <PageHeader
        title={quiz.title.trim() || EDITOR.newQuiz}
        titleAdornment={
          <SaveStatus save={save} isDraft={quiz.status === 'draft'} changed={changed} onSave={() => void saveNow()} />
        }
        subtitle={context}
        actions={actions}
      />
      {step === null ? null : <StepLine step={step} reached={reached} onStep={onStep} />}
      <div className="mst-qe-body">{children}</div>
      {barStart || barEnd ? <BottomBar start={barStart} end={barEnd} /> : null}
    </>
  );
}
