// The cells the pupils and the walk-ins share: a finisher's score out of the maximum with a 64 px bar ("—" when
// there's none, never 0), the Result word for the exceptions, and Review › to the pupil's review page.
// Area: quizzes

import { Link as RouterLink } from 'react-router-dom';
import { Button } from '@mui/material';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import { isBelowHalf, points, resultScore } from './figures';
import { RESULTS, resultOf } from './words';

// summary: the run's, for its maximum points, kind and status.
export function ScoreCell({ pupil, summary }) {
  const shown = points(resultScore(pupil));
  if (shown === null) {
    return (
      <span className="quiz-results-none">
        <span aria-hidden="true">—</span>
        <span className="mst-visually-hidden">{RESULTS.noScore}</span>
      </span>
    );
  }
  const share = Math.min(1, Math.max(0, Number(pupil.score) / Number(summary.max_points) || 0));
  return (
    <span className="quiz-results-score">
      <span>
        <strong>{shown}</strong> / {points(summary.max_points)}
      </span>
      <span aria-hidden="true" className="quiz-results-bar" data-size="small">
        <span style={{ transform: `scaleX(${share})` }} />
      </span>
    </span>
  );
}

export function ResultWord({ pupil, summary }) {
  const result = resultOf(pupil, isBelowHalf(pupil, summary.max_points), summary);
  return result ? (
    <span className="quiz-results-result" data-tone={result.tone}>
      {result.word}
    </span>
  ) : null;
}

// to: the pupil's review page, or null when they never started (nothing to review). The row's own click goes there
// too, so this click stops at the link.
export function ReviewLink({ to, name }) {
  if (!to) return null;
  return (
    <Button
      aria-label={RESULTS.reviewOf(name)}
      className="quiz-results-review"
      component={RouterLink}
      endIcon={<ChevronRightRounded />}
      onClick={(event) => event.stopPropagation()}
      size="small"
      to={to}
    >
      {RESULTS.review}
    </Button>
  );
}
