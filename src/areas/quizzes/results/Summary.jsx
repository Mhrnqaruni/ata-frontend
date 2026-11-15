// The summary card that opens a run's results (design.md §3.11, AN1-AN3): who took part, the average and whom it
// covers, the hardest question, and who is below half the points (a filter for the pupils), then one plain sentence.
// Area: quizzes

import { ButtonBase } from '@mui/material';
import FilterListRounded from '@mui/icons-material/FilterListRounded';
import { RESULTS, summaryFacts, summarySentence } from './words';

function Fact({ fact }) {
  return (
    <>
      <span className="quiz-results-fact-value">{fact.value}</span>
      <span className="quiz-results-fact-label">{fact.label}</span>
      {fact.detail ? <span className="quiz-results-fact-detail">{fact.detail}</span> : null}
    </>
  );
}

// onlyBelow: whether the pupils are filtered to those below half the points; onBelow toggles it.
export default function Summary({ summary, onlyBelow, onBelow }) {
  const facts = summaryFacts(summary);
  return (
    <section aria-label="Summary" className="mst-g1 mst-rim quiz-results-summary" data-mst="results-summary">
      <div className="quiz-results-facts">
        {facts.map((fact) =>
          fact.key === 'below' && fact.count > 0 ? (
            <ButtonBase
              aria-label={onlyBelow ? RESULTS.showEveryone : RESULTS.showOnlyBelow(fact.count)}
              className="quiz-results-fact quiz-results-fact-button"
              data-active={onlyBelow ? 'true' : undefined}
              data-mst="below-half"
              key={fact.key}
              onClick={onBelow}
            >
              <Fact fact={fact} />
              <span className="quiz-results-fact-action">
                <FilterListRounded aria-hidden="true" />
                {onlyBelow ? RESULTS.showEveryone : RESULTS.showThem}
              </span>
            </ButtonBase>
          ) : (
            <div className="quiz-results-fact" key={fact.key}>
              <Fact fact={fact} />
            </div>
          )
        )}
      </div>
      <p className="quiz-results-sentence">{summarySentence(summary)}</p>
    </section>
  );
}
