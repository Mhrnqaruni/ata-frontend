// A closed question card (design.md §3.4): 72 px, with its number, the question on one line, its answers on one line
// with ✓ before the right one, "10 pts · 30 s", or a red dot and what's missing. A click opens it in place.
// Area: quizzes

import { Fragment, memo } from 'react';
import { Tooltip } from '@mui/material';
import MathTextDisplay from '../../../components/common/MathTextDisplay';
import { ISSUES, issueOf } from './draft';
import { answerParts, factsOf } from './questionModel';
import { QUESTIONS } from './words';

function QuestionCard({ question, number, live, onOpen }) {
  const issue = issueOf(question);
  const parts = answerParts(question);
  const text = question.question_text?.trim();
  const facts = issue ? ISSUES[issue].card : factsOf(question, live);
  return (
    <button
      type="button"
      className="mst-qe-card"
      data-key={question.key}
      aria-label={`Question ${number}: ${text || QUESTIONS.untitled}. ${facts}`}
      onClick={() => onOpen(question.key)}
    >
      <span className="mst-qe-badge" aria-hidden="true">
        {number}
      </span>
      <span className="mst-qe-card-text" aria-hidden="true">
        <span className="mst-qe-card-title" data-empty={text ? undefined : 'true'}>
          {text ? <MathTextDisplay text={text} /> : QUESTIONS.untitled}
        </span>
        {parts.length ? (
          <span className="mst-qe-card-answers">
            {parts.map((part, index) => (
              <Fragment key={index}>
                {index ? ' · ' : ''}
                {part.right ? (
                  <span className="mst-qe-right">
                    ✓ <MathTextDisplay text={part.text} />
                  </span>
                ) : (
                  <MathTextDisplay text={part.text} />
                )}
              </Fragment>
            ))}
          </span>
        ) : null}
      </span>
      {issue ? (
        <Tooltip title={ISSUES[issue].tip}>
          <span className="mst-qe-card-facts" aria-hidden="true">
            <span className="mst-qe-dot" />
            {facts}
          </span>
        </Tooltip>
      ) : (
        <span className="mst-qe-card-facts" aria-hidden="true">
          {facts}
        </span>
      )}
    </button>
  );
}

export default memo(QuestionCard);
