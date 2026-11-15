// The answers part of an open question card (design.md §3.4): choice answers in 2 columns, each with its letter and a
// round right-answer button; true or false as two large buttons; a short answer's accepted answers as chips.
// Area: quizzes

import { useState } from 'react';
import { Chip, IconButton, Tooltip } from '@mui/material';
import CheckRounded from '@mui/icons-material/CheckRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import MathTextDisplay from '../../../components/common/MathTextDisplay';
import { letter, markRight, removeOption, setOption } from './questionModel';
import { CARD } from './words';

const hasMaths = (text) => /\$|\\\(|\\\[/.test(text || '');

// Multiple choice and poll answers. change(update) applies update to the question as it is when the change lands.
export function ChoiceAnswers({ question, number, change }) {
  const poll = question.question_type === 'poll';
  const right = question.correct_answer?.[0];
  const options = question.options || [];
  return (
    <div className="mst-qe-answers">
      {options.map((text, position) => {
        const isRight = !poll && right === position;
        const name = CARD.answer(letter(position));
        return (
          <div className="mst-qe-answer" data-right={isRight ? 'true' : undefined} key={position}>
            <span className="mst-qe-letter" aria-hidden="true">
              {letter(position)}
            </span>
            <span className="mst-qe-answer-text">
              <input
                value={text}
                placeholder={name}
                aria-label={`Question ${number}, ${name}`}
                onChange={(event) => {
                  const value = event.target.value;
                  change((current) => setOption(current, position, value));
                }}
              />
              {hasMaths(text) ? <MathTextDisplay className="mst-qe-answer-maths" text={text} /> : null}
            </span>
            {options.length > 2 ? (
              <Tooltip title={CARD.removeAnswer}>
                <IconButton
                  className="mst-qe-remove"
                  size="small"
                  aria-label={`${CARD.removeAnswer} ${letter(position)}`}
                  onClick={() => change((current) => removeOption(current, position))}
                >
                  <CloseRounded fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : null}
            {poll ? null : (
              <Tooltip title={isRight ? CARD.isRight : CARD.markRight}>
                <button
                  type="button"
                  className="mst-qe-mark"
                  aria-pressed={isRight}
                  aria-label={`${CARD.markRight}: ${letter(position)}`}
                  onClick={() => change((current) => markRight(current, position))}
                >
                  <CheckRounded aria-hidden="true" />
                </button>
              </Tooltip>
            )}
          </div>
        );
      })}
    </div>
  );
}

// True or false: two large choice buttons, with ✓ on the right one. Neither is right until the teacher picks, and
// until then a red dot says to tap one (Phase 1.47 design.md §3.11), as multiple choice has its round buttons.
export function TrueFalseAnswer({ question, change }) {
  const right = question.correct_answer?.[0];
  const picked = typeof right === 'boolean';
  return (
    <div className="mst-qe-truth-part">
      <div className="mst-qe-truth" role="group" aria-label={CARD.markRight}>
        {[true, false].map((value) => (
          <button
            type="button"
            key={String(value)}
            aria-pressed={right === value}
            onClick={() => change((current) => markRight(current, value))}
          >
            {right === value ? <CheckRounded aria-hidden="true" /> : null}
            {value ? CARD.trueWord : CARD.falseWord}
          </button>
        ))}
      </div>
      {picked ? null : (
        <p className="mst-qe-note mst-qe-truth-hint">
          <span className="mst-qe-dot" aria-hidden="true" />
          {CARD.tapRight}
        </p>
      )}
    </div>
  );
}

// A short answer's accepted answers, as chips to add to: Enter or a comma adds what's typed; leaving the box keeps it.
export function AcceptedAnswers({ question, number, change }) {
  const [typed, setTyped] = useState('');
  const accepted = (question.correct_answer || []).filter((each) => typeof each === 'string');
  const add = () => {
    const words = typed
      .split(',')
      .map((each) => each.trim())
      .filter(Boolean);
    setTyped('');
    if (!words.length) return;
    change((current) => {
      const now = (current.correct_answer || []).filter((each) => typeof each === 'string');
      const fresh = words.filter((word) => !now.some((each) => each.toLowerCase() === word.toLowerCase()));
      return { ...current, correct_answer: [...now, ...fresh] };
    });
  };
  return (
    <div className="mst-qe-accepted-part">
      <div className="mst-qe-field-label" aria-hidden="true">
        {CARD.accepted}
      </div>
      <div className="mst-qe-accepted">
        {accepted.map((answer) => (
          <Chip
            key={answer}
            label={answer}
            size="small"
            onDelete={() =>
              change((current) => ({
                ...current,
                correct_answer: (current.correct_answer || []).filter((each) => each !== answer),
              }))
            }
          />
        ))}
        <input
          value={typed}
          placeholder={accepted.length ? CARD.acceptedAdd : CARD.acceptedPlaceholder}
          aria-label={`Question ${number}, ${CARD.accepted}`}
          onChange={(event) => setTyped(event.target.value)}
          onBlur={add}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault();
              add();
            }
          }}
        />
      </div>
    </div>
  );
}
