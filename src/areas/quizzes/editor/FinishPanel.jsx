// Finish editing's outcome (Phase 1.46 S5.3; SOT-13; design.md §3.5): the checklist of what to finish first, each line
// with Go to; or the Ready panel, with Start now or Send for the quiz's classes, Change classes and Back to quizzes.
// Area: quizzes

import { Button, Link } from '@mui/material';
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded';
import SendRounded from '@mui/icons-material/SendRounded';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import { EDITOR, FINISH } from './words';

const SHOWN = 8; // lines before "and 12 more"

// problems: [{ text, index?, field? }]: index is a question's place; field 'title' or 'questions' a step to go to.
export function Checklist({ problems, onGo }) {
  const shown = problems.slice(0, SHOWN);
  return (
    <section className="mst-qe-checklist" aria-labelledby="mst-qe-checklist-title" role="alert">
      <h2 className="mst-qe-checklist-title" id="mst-qe-checklist-title">
        <WarningAmberRounded aria-hidden="true" />
        {FINISH.toFinish(problems.length)}
      </h2>
      <ul>
        {shown.map((problem) => (
          <li key={problem.text}>
            <span>{problem.text}</span>
            {problem.index != null || problem.field ? (
              <Button size="small" onClick={() => onGo(problem)}>
                {FINISH.goTo}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {problems.length > SHOWN ? <p className="mst-qe-help">{FINISH.more(problems.length - SHOWN)}</p> : null}
    </section>
  );
}

// The Ready panel: a check that draws once, "Ready", and the one next step for the quiz's mode.
export function ReadyPanel({ live, names, hasRun, onStart, onChangeClasses, onBack, onEditQuestions }) {
  return (
    <section className="mst-qe-ready" aria-labelledby="mst-qe-ready-title">
      <svg className="mst-qe-ready-check" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="24" />
        <path d="M15 24.5l6 6 12-13" />
      </svg>
      <h2 className="mst-qe-ready-title" id="mst-qe-ready-title">
        {FINISH.ready}
      </h2>
      <p className="mst-qe-ready-sub">{hasRun ? FINISH.runAgain : FINISH.nobodyYet}</p>
      <Button
        variant="contained"
        size="large"
        startIcon={live ? <PlayArrowRounded /> : <SendRounded />}
        onClick={onStart}
        data-mst="ready-start"
      >
        {live ? FINISH.startWith(names) : FINISH.sendTo(names)}
      </Button>
      <div className="mst-qe-ready-links">
        <Button onClick={onChangeClasses}>{FINISH.changeClasses}</Button>
        <Button onClick={onBack}>{EDITOR.backToQuizzes}</Button>
      </div>
      <p className="mst-qe-help">
        {live ? FINISH.liveLine : FINISH.homeworkLine}{' '}
        <Link component="button" type="button" onClick={onEditQuestions} className="mst-qe-ready-edit">
          {FINISH.editQuestions}
        </Link>
      </p>
    </section>
  );
}
