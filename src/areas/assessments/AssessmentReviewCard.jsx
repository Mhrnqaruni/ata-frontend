// One assessment question's card on the review page (Phase 1.47 S4.3; SOT-6, design.md §3.9): today's status chip,
// the question, the AI's reading with the submitted script and any held reason before the mark, then mark and feedback.
// Area: assessments

import { Box, Button } from '@mui/material';
import MathInputWithPreview from '../../components/common/MathInputWithPreview';
import MathTextDisplay from '../../components/common/MathTextDisplay';
import StatusChip from '../../components/assessments/StatusChip';
import CardStatus from '../../components/review/CardStatus';
import MarkField from '../../components/review/MarkField';
import ReviewCard from '../../components/review/ReviewCard';
import AgreementHint from './AgreementHint';
import HeldReason from './HeldReason';
import { isHeld, titleOf } from './reviewRules';

// The line above the AI's reading, by how the reading went.
const UNREAD = 'Some evidence could not be read. Compare the submitted script.';
const READING = {
  blank: 'The AI readings report a blank response.',
  described_work: 'Check the submitted script.', // the reason line says why
  unclear: UNREAD,
  missing_source: UNREAD,
};
const CHECK = 'Compare with the script when checking accuracy. Saving a mark does not verify this transcription.';

// question: the freshest record; number: its place; card: useReviewSaves' card(); onScript(question) opens the script;
// onReload reads the question again after it changed somewhere else.
export default function AssessmentReviewCard({ question, number, card, onScript, onReload }) {
  const reason = isHeld(question) && (question.reviewReason || question.oldReason); // results before 1.33 lack reviewReason
  // The 2-of-3 note, only while the mark shown is still the AI's.
  const agreement = question.status === 'AI_GRADED' && !card.unsaved && question.agreement;
  const max = question.maxScore ?? 100;
  return (
    <ReviewCard
      chip={<StatusChip status={question.status} />}
      id={String(question.questionId)}
      marking={
        <>
          <MarkField max={max} onBlur={card.leave} onChange={(mark) => card.edit({ mark })} value={card.values.mark} />
          <MathInputWithPreview
            fullWidth
            label="Feedback for the student"
            minRows={2}
            multiline
            onBlur={card.leave}
            onChange={(event) => card.edit({ comment: event.target.value })}
            value={card.values.comment}
          />
          {agreement ? (
            <div className="mst-rv-wide">
              <AgreementHint agreement={agreement} grade={card.values.mark} />
            </div>
          ) : null}
        </>
      }
      question={<MathTextDisplay text={question.questionText} />}
      status={<CardStatus card={card} max={max} onReload={onReload} />}
      title={titleOf(question, number)}
    >
      <div className="mst-review-answer">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
          <span className="mst-review-answer-label">AI reading of the answer</span>
          <Button onClick={() => onScript(question)} size="small" sx={{ minHeight: 44 }}>
            View submitted script
          </Button>
        </Box>
        <p className="mst-hint">{READING[question.readingState] ?? CHECK}</p>
        <span className="mst-review-answer-text">
          <MathTextDisplay text={question.studentAnswer || 'No answer was read from the sheet.'} />
        </span>
      </div>
      {reason ? <HeldReason reason={reason} /> : null}
    </ReviewCard>
  );
}
