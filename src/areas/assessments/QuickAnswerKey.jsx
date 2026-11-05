// The results page's AI-written answer key (design §3.4): a note under the title, and a read-only dialog with
// each question's answer and criteria and who wrote them. Editing and re-marking wait (TODO #125).
// Area: assessments

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  useMediaQuery,
} from '@mui/material';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import ErrorAlert from '../../components/common/ErrorAlert';
import { QuickSchemeReview } from '../../components/assessments/QuickAssessmentParts';
import reviewService from '../../services/reviewService';
import '../../components/assessments/quick-assessment.css';

const touch = { '@media (pointer: coarse)': { minHeight: 44 } };
const hint = { fontSize: 12, lineHeight: '16px', fontWeight: 500, color: 'var(--mst-ink-3)' };

// The note in the page's subtitle, for a Quick assessment whose key the AI wrote, all or in part.
export function AnswerKeyNote({ answerKey: { writtenByAI, total }, onView }) {
  return (
    <>
      <AutoAwesomeRounded
        aria-hidden="true"
        sx={{ fontSize: 16, mr: '6px', verticalAlign: '-3px', color: 'var(--mst-accent)' }}
      />
      {writtenByAI === total
        ? 'Answer key written by the AI'
        : `Answer key for ${writtenByAI} of ${total} questions written by the AI`}
      <Button size="small" onClick={onView} sx={{ ml: 1, ...touch }}>
        View answer key
      </Button>
    </>
  );
}

export default function AnswerKeyDialog({ open, onClose, jobId, entityId, answerKey, heldQuestions }) {
  const phone = useMediaQuery('(max-width: 599px)');
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!open || config || !entityId) return;
    setError(null);
    // A student's review carries the job's config, with each question's marking basis (SOT-15).
    reviewService.getStudentReview(jobId, entityId).then((review) => setConfig(review.config), setError);
  }, [open, config, jobId, entityId]);
  const held = Object.fromEntries(heldQuestions.map((question) => [question.questionId, question.reason]));
  const marks = config?.sections
    .flatMap((section) => section.questions)
    .reduce((sum, question) => sum + (Number(question.maxScore) || 0), 0);
  return (
    <Dialog open={open} onClose={onClose} fullScreen={phone} fullWidth maxWidth="lg">
      <DialogTitle>
        Answer key
        <Box component="span" sx={{ display: 'block', fontSize: 14, lineHeight: '20px', color: 'var(--mst-ink-2)' }}>
          {answerKey.writtenByAI === answerKey.total
            ? `Written by the AI${marks ? ` · ${marks} marks` : ''}`
            : `Written by the AI for ${answerKey.writtenByAI} of ${answerKey.total} questions`}
        </Box>
      </DialogTitle>
      <DialogContent>
        {error && <ErrorAlert error={error} />}
        {config ? (
          // The Quick page's own styles, so the key reads as it did there, without that page's width.
          <Box
            className="qa-page"
            sx={{ '&.qa-page': { maxWidth: 'none', p: 0 }, '& .qa-scheme': { m: 0, p: 0, border: 0 } }}
          >
            <QuickSchemeReview config={config} held={held} />
          </Box>
        ) : (
          !error && <CircularProgress size={24} aria-label="Loading the answer key" />
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', gap: 2, px: 3, pb: 2 }}>
        <Box component="span" sx={hint}>
          To change a mark, open the student’s review.
        </Box>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
