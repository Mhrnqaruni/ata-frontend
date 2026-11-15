// A quiz question's card on the review page (design.md §3.9): its chip, the question and its picture, the evidence
// before any mark (the pupil's choice and the right one, or their words and what's accepted), then mark and comment.
// Area: quizzes

import { Chip } from '@mui/material';
import CheckRounded from '@mui/icons-material/CheckRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import HourglassEmptyRounded from '@mui/icons-material/HourglassEmptyRounded';
import HowToRegOutlined from '@mui/icons-material/HowToRegOutlined';
import RemoveRounded from '@mui/icons-material/RemoveRounded';
import MathTextDisplay from '../../../components/common/MathTextDisplay';
import CardStatus from '../../../components/review/CardStatus';
import MarkField from '../../../components/review/MarkField';
import ReviewCard from '../../../components/review/ReviewCard';
import { REVIEW } from '../../../components/review/words';
import { config } from '../../../config';
import { acceptedLine, chipOf, chosen, markable, optionRows, stateOf, typedAnswer } from './answers';
import CommentField from './CommentField';
import { PUPIL_REVIEW } from './words';

// Each chip's tone and icon, so a state is never colour alone.
const CHIPS = {
  right: { color: 'success', icon: <CheckRounded /> },
  wrong: { color: 'error', icon: <CloseRounded /> },
  part: { color: 'warning', icon: <RemoveRounded /> },
  none: { color: 'default' },
  waiting: { variant: 'outlined', icon: <HourglassEmptyRounded /> },
  teacher: { variant: 'outlined', icon: <HowToRegOutlined /> },
};

function AnswerChip({ question }) {
  const key = chipOf(question);
  if (!key) return null;
  const look = CHIPS[key];
  return (
    <Chip
      className="mst-status mst-qr-chip"
      color={look.color ?? 'default'}
      data-key={key}
      icon={look.icon}
      label={PUPIL_REVIEW.chips[key]}
      size="small"
      variant={look.variant ?? 'filled'}
    />
  );
}

// The choices: "Their answer" on the pupil's, a tick on the right one.
function Options({ question }) {
  return (
    <ul className="mst-qr-options">
      {optionRows(question).map((row) => (
        <li
          className="mst-qr-option"
          data-chosen={row.chosen ? 'true' : undefined}
          data-right={row.right ? 'true' : undefined}
          key={row.key}
        >
          {row.letter ? (
            <span aria-hidden="true" className="mst-qr-letter">
              {row.letter}
            </span>
          ) : null}
          <span className="mst-qr-option-text">
            <MathTextDisplay text={row.text} />
          </span>
          {row.chosen ? <span className="mst-qr-tag">{PUPIL_REVIEW.theirAnswer}</span> : null}
          {row.right ? <CheckRounded className="mst-qr-tick" titleAccess={PUPIL_REVIEW.rightAnswer} /> : null}
        </li>
      ))}
    </ul>
  );
}

// A typed answer: the pupil's words in a quote box, then what's accepted and at which level.
function Typed({ question }) {
  const words = typedAnswer(question);
  return (
    <div className="mst-qr-typed">
      {words ? (
        <>
          <span className="mst-qr-label">{PUPIL_REVIEW.theirAnswer}</span>
          <blockquote className="mst-qr-quote">
            <MathTextDisplay text={words} />
          </blockquote>
        </>
      ) : (
        <p className="mst-qr-none">{PUPIL_REVIEW.noAnswer}</p>
      )}
      <p className="mst-qr-accepted">{acceptedLine(question)}</p>
    </div>
  );
}

const pictureOf = (url) => (/^https?:/i.test(url) ? url : `${config.apiBaseUrl}${url}`);

// question: the freshest record; card: useReviewSaves' card() for it (null for a poll); locked: marks can't change.
export default function QuizCard({ question, card, locked, onReload }) {
  const typed = question.type === 'short_answer';
  const blank = !typed && question.type !== 'poll' && !chosen(question.answer?.value).length;
  return (
    <ReviewCard
      chip={<AnswerChip question={question} />}
      id={String(question.question_id)}
      kind={PUPIL_REVIEW.types[question.type] ?? null}
      marking={
        card ? (
          <>
            <MarkField
              disabled={locked}
              max={question.points}
              onBlur={card.leave}
              onChange={(mark) => card.edit({ mark })}
              value={card.values.mark}
              whole
            />
            <CommentField
              answer={question.answer}
              disabled={locked}
              onBlur={card.leave}
              onChange={(comment) => card.edit({ comment })}
              right={stateOf(question) === 'right'}
              value={card.values.comment}
            />
          </>
        ) : null
      }
      question={<MathTextDisplay text={question.text} />}
      status={card ? <CardStatus card={card} max={question.points} onReload={onReload} /> : null}
      title={REVIEW.question(question.number)}
    >
      {question.media_url ? (
        <img
          alt={PUPIL_REVIEW.picture(question.number)}
          className="mst-qr-picture"
          loading="lazy"
          src={pictureOf(question.media_url)}
        />
      ) : null}
      {blank ? <p className="mst-qr-none">{PUPIL_REVIEW.noAnswer}</p> : null}
      {typed ? <Typed question={question} /> : <Options question={question} />}
      {markable(question) ? null : <p className="mst-qr-poll">{PUPIL_REVIEW.pollNoMark}</p>}
    </ReviewCard>
  );
}
