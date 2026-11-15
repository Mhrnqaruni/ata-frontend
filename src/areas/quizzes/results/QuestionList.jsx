// The results' right half (design.md §3.8): the questions hardest first, "14 of 28 right" with its bar and what
// tripped pupils up, blanks counted; a click filters the pupils to those who got it wrong or left it blank.
// Area: quizzes

import { useState } from 'react';
import { Button, ButtonBase } from '@mui/material';
import { attemptsAt } from './figures';
import QuestionPicture from './QuestionPicture';
import { RESULTS, questionLine, rightWords } from './words';

const PAGE = 20;

const isPoll = (question) => question.correct === null || question.correct === undefined;

// A question filters the pupils only when the summary names who missed it (C8's missed_by), never a poll: without the
// names, a filter would wrongly say everyone got it right.
const filters = (question) => !isPoll(question) && Array.isArray(question.missed_by);

// The figure on the right: "14 of 28 right" over its bar; nothing for a poll, whose line says so.
function Figure({ question }) {
  if (isPoll(question)) return <span className="quiz-results-qfigure" />;
  if (!attemptsAt(question)) {
    return (
      <span className="quiz-results-qfigure">
        <span className="quiz-results-quiet">{RESULTS.noAnswers}</span>
      </span>
    );
  }
  return (
    <span className="quiz-results-qfigure">
      <span>{rightWords(question)}</span>
      <span aria-hidden="true" className="quiz-results-bar">
        <span style={{ transform: `scaleX(${question.correct / attemptsAt(question)})` }} />
      </span>
    </span>
  );
}

function Body({ question, markedByAi }) {
  const line = isPoll(question)
    ? [RESULTS.poll, questionLine(question)].filter(Boolean).join(' · ')
    : questionLine(question, { markedByAi });
  return (
    <>
      <span className="quiz-results-qnum">Q{question.number}</span>
      <span className="quiz-results-qtext quiz-results-clamp" title={question.text}>
        {question.text}
      </span>
      <Figure question={question} />
      {line ? <span className="quiz-results-qline">{line}</span> : null}
    </>
  );
}

// Under the question filtering the pupils: "Showing who missed it · Clear" (design check C6, P2 R1).
function Showing({ onClear }) {
  return (
    <p className="quiz-results-qshowing">
      {RESULTS.showingMissed}
      <span aria-hidden="true">·</span>
      <ButtonBase aria-label={RESULTS.showEveryone} className="quiz-results-qclear" onClick={onClear}>
        {RESULTS.clear}
      </ButtonBase>
    </p>
  );
}

// questions: the summary's, hardest first; pictures: each question's picture address, by question id; aiMarked: the
// ids of typed answers the AI marks; picked: the question filtering the pupils, if any; onPick toggles it; onClear.
export default function QuestionList({ questions, pictures, aiMarked, picked, onPick, onClear }) {
  const [limit, setLimit] = useState(PAGE);
  const rows = questions.slice(0, limit);
  return (
    <section aria-labelledby="quiz-results-questions" className="quiz-results-card" data-mst="results-questions">
      <header className="quiz-results-card-head">
        <h2 id="quiz-results-questions">{RESULTS.questions}</h2>
        <span className="quiz-results-count">{questions.length}</span>
        <span className="quiz-results-caption">{RESULTS.hardestFirst}</span>
      </header>
      <ol className="quiz-results-qlist">
        {rows.map((question) => {
          const active = picked === question.id;
          const body = <Body markedByAi={aiMarked.has(String(question.id))} question={question} />;
          return (
            <li
              className="quiz-results-qrow"
              data-active={active ? 'true' : undefined}
              id={`quiz-results-q${question.number}`}
              key={question.id}
            >
              {filters(question) ? (
                <ButtonBase aria-pressed={active} className="quiz-results-qmain" onClick={() => onPick(question)}>
                  {body}
                  <span className="mst-visually-hidden">{RESULTS.showWrongOrBlank(question.number)}</span>
                </ButtonBase>
              ) : (
                <div className="quiz-results-qmain">{body}</div>
              )}
              {pictures[question.id] ? (
                <span className="quiz-results-qpicture">
                  <QuestionPicture number={question.number} src={pictures[question.id]} text={question.text} />
                </span>
              ) : null}
              {active ? <Showing onClear={onClear} /> : null}
            </li>
          );
        })}
      </ol>
      {questions.length > rows.length ? (
        <footer className="quiz-results-more">
          <Button onClick={() => setLimit((now) => now + PAGE)} size="small">
            Show {Math.min(PAGE, questions.length - rows.length)} more
          </Button>
        </footer>
      ) : null}
    </section>
  );
}
