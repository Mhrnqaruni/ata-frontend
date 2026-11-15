// One pupil's answers (design.md §3.10: "A row opens that pupil's answers"): each question, what they answered in its
// words, and whether it was right, with its points. The teacher always sees everything.
// Area: quizzes

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Skeleton,
  Typography,
} from '@mui/material';
import CheckRounded from '@mui/icons-material/CheckRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import MathTextDisplay from '../../../components/common/MathTextDisplay';
import { answerWords } from './pupils';
import { usePupilAnswers, useQuizOptions } from './queries';
import { HOMEWORK } from './words';

// row: the list's row (name, studentId, and its answered line); open while it's set.
export default function PupilAnswers({ sessionId, quizId, row, onClose }) {
  const answers = usePupilAnswers(sessionId, row?.studentId);
  const options = useQuizOptions(quizId);
  const results = answers.data?.question_results || [];
  return (
    <Dialog open={Boolean(row)} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="pupil-answers-title">
      <DialogTitle id="pupil-answers-title">{row ? HOMEWORK.answersOf(row.name) : ''}</DialogTitle>
      <DialogContent>
        {answers.isError ? <Alert severity="error">{answers.error?.message || HOMEWORK.answersFailed}</Alert> : null}
        {answers.isPending ? <Skeleton variant="rounded" height={160} sx={{ borderRadius: '12px' }} /> : null}
        <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1.5 }}>
          {results.map((result, index) => (
            <Box
              component="li"
              key={result.question_id}
              sx={{ p: 2, borderRadius: '12px', border: '1px solid var(--mst-edge)', bgcolor: 'var(--mst-well)' }}
            >
              <Typography sx={{ fontSize: 12, lineHeight: '16px', fontWeight: 600, color: 'var(--mst-ink-2)' }}>
                {index + 1}
              </Typography>
              <Typography component="div" sx={{ fontSize: 14, lineHeight: '20px', fontWeight: 500, mb: 1 }}>
                <MathTextDisplay text={result.question_text} />
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 12px' }}>
                <Typography component="div" sx={{ fontSize: 14, lineHeight: '20px', color: 'var(--mst-ink)' }}>
                  <MathTextDisplay text={answerWords(result, options[String(result.question_id)])} />
                </Typography>
                <Mark result={result} />
              </Box>
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{HOMEWORK.done}</Button>
      </DialogActions>
    </Dialog>
  );
}

// Right or wrong, with its points; a poll has neither, and a short answer waiting for its mark says so.
function Mark({ result }) {
  if (result.question_type === 'poll' || result.student_answer === null || result.student_answer === undefined)
    return null;
  const points = HOMEWORK.pointsOf(result.points_earned ?? 0, result.points_possible ?? 0);
  if (result.is_correct === null || result.is_correct === undefined) {
    return (
      <Typography sx={{ fontSize: 12, lineHeight: '16px', color: 'var(--mst-ink-2)' }}>{HOMEWORK.notMarked}</Typography>
    );
  }
  const right = result.is_correct === true;
  return (
    <Box
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: 12, lineHeight: '16px', fontWeight: 600 }}
    >
      {right ? (
        <CheckRounded aria-hidden="true" sx={{ fontSize: 16, color: 'var(--mst-ok-ink)' }} />
      ) : (
        <CloseRounded aria-hidden="true" sx={{ fontSize: 16, color: 'var(--mst-bad-ink)' }} />
      )}
      <Box component="span" sx={{ color: right ? 'var(--mst-ok-ink)' : 'var(--mst-bad-ink)' }}>
        {right ? HOMEWORK.right : HOMEWORK.wrong}
      </Box>
      <Box component="span" sx={{ color: 'var(--mst-ink-2)', fontWeight: 500 }}>
        · {points}
      </Box>
    </Box>
  );
}
