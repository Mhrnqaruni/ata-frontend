// Preview (design.md §3.4; SOT-12 Q6): a phone-shaped window with the pupil's question screen (§3.12) for this draft,
// question by question, with the pupils' points words (Phase 1.47 §3.7). Nothing is sent and no API is called.
// Area: quizzes

import { useState } from 'react';
import { Dialog, IconButton, Tooltip } from '@mui/material';
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import MathTextDisplay from '../../../components/common/MathTextDisplay';
import { config } from '../../../config';
import { draftQuestion } from './draft';
import { levelOf, pointsWords } from './matchLevels';
import { letter, POINTS, SECONDS } from './questionModel';
import { CARD, PREVIEW, QUESTIONS } from './words';
import './preview.css';

// The answers a pupil sees: the boxes with words, or True and False; a short answer is typed.
function pupilAnswers(question) {
  if (question.question_type === 'true_false') return [CARD.trueWord, CARD.falseWord];
  if (question.question_type === 'short_answer') return null;
  return draftQuestion(question).options;
}

function PhoneScreen({ questions, start, live }) {
  const [index, setIndex] = useState(start);
  const [chosen, setChosen] = useState(null);
  const question = questions[index];
  if (!question) return <p className="mst-qe-phone-empty">{PREVIEW.empty}</p>;
  const answers = pupilAnswers(question);
  const go = (to) => {
    setIndex(to);
    setChosen(null);
  };
  return (
    <>
      <div className="mst-qe-phone-top">
        <span>{PREVIEW.of(index + 1, questions.length)}</span>
        {live ? <span className="mst-qe-phone-clock">{question.time_limit_seconds ?? SECONDS.start}</span> : null}
      </div>
      <p className="mst-qe-phone-points">
        {pointsWords({
          type: question.question_type,
          points: question.points ?? POINTS.start,
          level: levelOf(question),
        })}
      </p>
      <div className="mst-qe-phone-body">
        {question.media_url ? <img alt="" src={`${config.apiBaseUrl}${question.media_url}`} /> : null}
        <h3 className="mst-qe-phone-question">
          <MathTextDisplay text={question.question_text?.trim() || QUESTIONS.untitled} />
        </h3>
        {answers ? (
          <div className="mst-qe-phone-answers">
            {answers.map((text, position) => (
              <button
                type="button"
                key={position}
                aria-pressed={chosen === position}
                onClick={() => setChosen(position)}
              >
                <span className="mst-qe-letter" aria-hidden="true">
                  {letter(position)}
                </span>
                <MathTextDisplay text={text} />
              </button>
            ))}
          </div>
        ) : (
          <input className="mst-qe-phone-type" placeholder={PREVIEW.typeAnswer} aria-label={PREVIEW.typeAnswer} />
        )}
      </div>
      <div className="mst-qe-phone-bar">
        <Tooltip title={PREVIEW.previous}>
          <span>
            <IconButton aria-label={PREVIEW.previous} disabled={index === 0} onClick={() => go(index - 1)}>
              <ChevronLeftRounded />
            </IconButton>
          </span>
        </Tooltip>
        <span className="mst-qe-phone-send" aria-disabled="true">
          {PREVIEW.send}
        </span>
        <Tooltip title={PREVIEW.next}>
          <span>
            <IconButton
              aria-label={PREVIEW.next}
              disabled={index >= questions.length - 1}
              onClick={() => go(index + 1)}
            >
              <ChevronRightRounded />
            </IconButton>
          </span>
        </Tooltip>
      </div>
    </>
  );
}

// start: the question to show first; the window starts afresh each time it opens.
export default function PreviewWindow({ open, questions, start = 0, live, onClose }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      aria-label={PREVIEW.title}
      PaperProps={{ className: 'mst-qe-phone-window', 'data-mst': 'quiz-preview' }}
    >
      <div className="mst-qe-phone-head">
        <span>{PREVIEW.note}</span>
        <IconButton aria-label={PREVIEW.close} onClick={onClose} size="small">
          <CloseRounded fontSize="small" />
        </IconButton>
      </div>
      <div className="mst-qe-phone">
        {open ? <PhoneScreen questions={questions} start={Math.max(0, start)} live={live} /> : null}
      </div>
    </Dialog>
  );
}
