// One marked question (design §5.5): a glass card for an answer to look at, with the child's answer and the right
// answer side by side, then what to add; and a right answer's short row, which opens into its card.
// Area: family

import { Button } from '@mui/material';
import ChatBubbleOutlineRounded from '@mui/icons-material/ChatBubbleOutlineRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import LightbulbOutlined from '@mui/icons-material/LightbulbOutlined';
import PriorityHighRounded from '@mui/icons-material/PriorityHighRounded';
import QuestionMarkRounded from '@mui/icons-material/QuestionMarkRounded';
import { forChild } from '../familyWords';
import { Answer, TidyText } from './HomeworkText';
import { WORD, explainText, stateOf } from './resultWords';

const GLYPH = { ok: CheckRounded, warm: PriorityHighRounded, check: QuestionMarkRounded };

// The label over an answer, with a dot for a right or a not-quite one.
function AnswerLabel({ dot: Dot, children }) {
  return (
    <div className="fam-hw-ans-label">
      {Dot && (
        <span className="fam-hw-dot">
          <Dot />
        </span>
      )}
      {children}
    </div>
  );
}

/**
 * A question's card, with `id` for jumps to it and `flash` while it's the one jumped to. `short` is its number, and
 * `onExplain(text)` asks the AI assistant about it in the Notebook. `nested`, inside a right answer's row, drops the glass,
 * so it's never a card inside a card.
 */
export function QuestionCard({ check, name, id, flash, onExplain, short, nested = false }) {
  const state = stateOf(check);
  const Glyph = GLYPH[state];
  const warm = state === 'warm';
  return (
    <article
      id={id}
      tabIndex={id ? -1 : undefined}
      className={`${nested ? '' : 'mst-g1 mst-rim '}fam-hw-card`}
      data-state={state}
      data-flash={flash || undefined}
    >
      <header className="fam-hw-card-head">
        <span className="fam-hw-label">Question {short}</span>
        <span className="fam-hw-badge" data-state={state}>
          <Glyph aria-hidden />
          {WORD[state]}
        </span>
      </header>
      <div className="fam-hw-q">
        <TidyText text={check.question} />
      </div>
      {state === 'ok' ? (
        <div className="fam-hw-answers fam-hw-one">
          <section className="fam-hw-ans" data-kind="ok">
            <AnswerLabel dot={CheckRounded}>{name}’s answer</AnswerLabel>
            <Answer text={check.studentAnswer} />
          </section>
        </div>
      ) : (
        <div className="fam-hw-answers">
          <section className="fam-hw-ans" data-kind={warm ? 'mine' : 'neutral'}>
            <AnswerLabel dot={warm ? CloseRounded : null}>{name}’s answer</AnswerLabel>
            <Answer text={check.studentAnswer} />
          </section>
          <section className="fam-hw-ans" data-kind={warm ? 'right' : 'neutral'}>
            <AnswerLabel dot={warm ? CheckRounded : null}>The right answer</AnswerLabel>
            <Answer text={check.expectedAnswer} plain />
          </section>
        </div>
      )}
      {state === 'check' && <p className="fam-hw-note">AI isn’t sure about this answer. Please look yourself.</p>}
      {check.feedback && (
        <div className="fam-hw-add">
          <LightbulbOutlined aria-hidden />
          <div>
            {warm && <b>What to add · </b>}
            <TidyText text={forChild(check.feedback, name)} />
          </div>
        </div>
      )}
      <div className="fam-hw-actions">
        <Button
          size="small"
          variant="outlined"
          startIcon={<ChatBubbleOutlineRounded />}
          title="Opens the chat and asks the helper to explain this question"
          onClick={() => onExplain(explainText(check, name))}
        >
          Explain in chat
        </Button>
      </div>
    </article>
  );
}

/** A right answer's row: its number, the question and the child's answer, opening into its card when `open`. */
export function RightRow({ check, name, id, open, flash, onToggle, onExplain, short }) {
  return (
    <div id={id} tabIndex={-1} className="fam-hw-row" data-open={open || undefined} data-flash={flash || undefined}>
      <button type="button" className="fam-hw-row-btn" aria-expanded={Boolean(open)} onClick={onToggle}>
        <span className="fam-hw-dot">
          <CheckRounded />
        </span>
        <span className="fam-hw-label">{short}</span>
        <span className="fam-hw-row-text">
          <span className="fam-hw-row-q">
            <TidyText text={check.question} />
          </span>
          <span className="fam-hw-row-a">
            {name}: <TidyText text={check.studentAnswer} />
          </span>
        </span>
        <ChevronRightRounded className="fam-hw-row-chev" aria-hidden />
      </button>
      {open && (
        <div className="fam-hw-row-body">
          <QuestionCard check={check} name={name} short={short} onExplain={onExplain} nested />
        </div>
      )}
    </div>
  );
}
