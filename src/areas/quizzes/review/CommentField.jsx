// A quiz card's comment for the pupil (design.md §3.9; SOT-5): the AI's comment to edit or keep, a skeleton while the
// AI is still writing it, a note when it couldn't, and an empty box for a right answer.
// Area: quizzes

import { Skeleton, TextField } from '@mui/material';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import { PUPIL_REVIEW } from './words';

// The AI's words with its sparkle, for the label and the writing line.
const fromAi = (words) => (
  <span className="mst-qr-ai">
    <AutoAwesomeRounded aria-hidden="true" />
    {words}
  </span>
);

// answer: the saved answer (C3); value: the box's text; right: the answer is right, so a comment is optional.
export default function CommentField({ answer, value, right, disabled, onChange, onBlur }) {
  if (answer?.comment_state === 'writing' && !value) {
    return (
      <div className="mst-qr-writing" role="status">
        <Skeleton height={20} variant="text" width="80%" />
        {fromAi(PUPIL_REVIEW.aiWriting)}
      </div>
    );
  }
  const theAis = answer?.comment_by === 'ai' && Boolean(value) && value === (answer.comment ?? '');
  const failed = answer?.comment_state === 'failed' && !value;
  return (
    <TextField
      disabled={disabled}
      fullWidth
      helperText={failed ? PUPIL_REVIEW.aiFailed : undefined}
      inputProps={{ maxLength: 4000 }}
      label={theAis ? fromAi(PUPIL_REVIEW.fromAi) : PUPIL_REVIEW.comment}
      minRows={2}
      multiline
      onBlur={onBlur}
      onChange={(event) => onChange(event.target.value)}
      placeholder={right ? PUPIL_REVIEW.addComment : undefined}
      value={value ?? ''}
    />
  );
}
