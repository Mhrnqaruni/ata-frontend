// The read-only answer key's words (design review B3): the expected answer and the marking criteria as text under
// small labels, in the borderless box the question text uses, so nothing looks editable. Also the marks' wording.
// Area: assessments

import { Box } from '@mui/material';
import MathTextDisplay from '../../components/common/MathTextDisplay';

const label = { mb: '4px', fontSize: 12, lineHeight: '16px', fontWeight: 500, color: 'var(--mst-ink-3)' };

// "1 mark" or "3 marks", as the question's heading shows them.
export const markText = (marks) => `${marks ?? '—'} ${Number(marks) === 1 ? 'mark' : 'marks'}`;

export default function AnswerKeyText({ answer, rubric }) {
  return [
    ['Expected answer', answer],
    ['Marking criteria', rubric],
  ].map(([name, value]) => (
    <div key={name}>
      <Box sx={label}>{name}</Box>
      <div className="qa-prompt-preview">
        <div className="qa-prompt-text">
          <MathTextDisplay text={value || '—'} />
        </div>
      </div>
    </div>
  ));
}
