// The marked homework's summary card (design §5.5): the score, a bar of one segment per question, the AI's comment and
// who marked it. The bar replaces the ring, whose percentage only repeated the score.
// Area: family

import { useState } from 'react';
import { Button, Collapse } from '@mui/material';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import { forChild } from '../familyWords';
import { TidyText } from './HomeworkText';
import { barLabel } from './resultWords';

/** `items` are the questions with their states, and `counts` the summary's (resultWords.js countStates). */
export default function HomeworkSummary({ items, counts, result, name }) {
  const [more, setMore] = useState(false);
  // Today's AI comment; a longer explanation, when there's one as well, waits behind Read the full comment.
  const comment = result.message || result.explanation;
  const rest = result.message ? result.explanation : '';
  return (
    <section className="mst-g1 mst-rim fam-hw-summary">
      <h2 className="fam-hw-score">
        {counts.right} of {items.length} right
      </h2>
      <div className="fam-hw-bar" role="img" aria-label={barLabel(counts)}>
        {items.map((item) => (
          <span key={item.id} data-state={item.state} />
        ))}
      </div>
      {comment && (
        <p className="fam-hw-comment">
          <TidyText text={forChild(comment, name)} />
        </p>
      )}
      {rest && (
        <>
          <Collapse in={more}>
            <p className="fam-hw-comment">
              <TidyText text={forChild(rest, name)} />
            </p>
          </Collapse>
          <Button
            size="small"
            className="fam-hw-more"
            onClick={() => setMore(!more)}
            aria-expanded={more}
            endIcon={<ExpandMoreRounded className="fam-hw-chev" data-open={more} />}
          >
            {more ? 'Show less' : 'Read the full comment'}
          </Button>
        </>
      )}
      <p className="fam-hw-fine">Marked by AI. It’s a guide, not a teacher’s mark.</p>
    </section>
  );
}
