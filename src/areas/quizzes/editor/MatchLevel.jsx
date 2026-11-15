// How close a typed answer must be (Phase 1.47 R5; design.md §3.7): Exact · Close · Same meaning under the accepted
// answers, with the chosen level's line and how it's marked. Exact is checked by code, so it has no AI sparkle.
// Area: quizzes

import { useId } from 'react';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import { levelOf, LEVELS } from './matchLevels';
import { MATCH } from './words';

// change(update) applies update to the question as it is when the change lands.
export default function MatchLevel({ question, change }) {
  const titleId = useId();
  const lineId = useId();
  const level = levelOf(question);
  const words = MATCH.levels[level];
  return (
    <div className="mst-qe-level-part">
      <div className="mst-qe-field-label" id={titleId}>
        {MATCH.title}
      </div>
      <ToggleButtonGroup
        exclusive
        aria-labelledby={titleId}
        aria-describedby={lineId}
        className="mst-qe-level"
        value={level}
        onChange={(_, value) => value && change((current) => ({ ...current, match_level: value }))}
      >
        {LEVELS.map((value) => (
          <ToggleButton key={value} value={value}>
            {MATCH.levels[value].label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <p className="mst-qe-note" id={lineId}>
        {words.line}
      </p>
      <p className="mst-qe-level-marking">
        {level === 'exact' ? null : <AutoAwesomeRounded className="mst-qe-level-ai" aria-hidden="true" />}
        {words.marking}
      </p>
    </div>
  );
}
