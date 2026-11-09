// Flashcards at full screen (Phase 1.38 design §6.6): read the question with the child, show the answer under a rule,
// then "Not yet" or "Sam knew it"; at the end, practise the cards not known yet. Moved here from FamilyResult.jsx.
// Area: family

import { useEffect, useState } from 'react';
import { Button, CircularProgress, Typography } from '@mui/material';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import MathText from '../MathText';
import useActivityProgress from '../useActivityProgress';
import { Prose, SaveNote, Steps } from './resultParts';

/**
 * `cards` are the set's cards; their place and ratings save through the activity's progress, as today. `end` is the
 * Next step card and `advanced` the frame's Advanced disclosure, both at the end; the frame's Close goes back (§6.4).
 */
export default function Flashcards({
  cards,
  activity,
  childName,
  end = null,
  advanced = null,
  onProgress,
  onQuiz,
  onNewVersion,
  busy,
}) {
  const saved = useActivityProgress(activity, { index: 0, ratings: {}, finished: false });
  const [turned, setTurned] = useState(false);
  const ids = cards.map((c, i) => c.id || `c${i + 1}`);
  const order = saved.value.order || ids;
  const i = Math.min(saved.value.index || 0, order.length - 1);
  const card = cards[ids.indexOf(order[i])];
  const ratings = saved.value.ratings || {};
  const missed = ids.filter((id) => ratings[id] === 'practise');
  // The bar's "Card 3 of 10"; ResultPage's state setter, so the effects run when the card changes, not each render.
  useEffect(() => {
    onProgress(!saved.ready || saved.value.finished ? '' : `Card ${i + 1} of ${order.length}`);
  }, [onProgress, saved.ready, saved.value.finished, i, order.length]);
  useEffect(() => () => onProgress(''), [onProgress]);
  if (!saved.ready)
    return (
      <div className="fam-viewer-scroll fam-centre">
        {saved.error ? <SaveNote saved={saved} /> : <CircularProgress aria-label="Loading the cards" />}
      </div>
    );
  if (!card) return null;
  const off = !!saved.error;
  const move = (n) => {
    setTurned(false);
    saved.update({ index: n });
  };
  const rate = (value) => {
    setTurned(false);
    saved.update({
      ratings: { ...ratings, [order[i]]: value },
      index: i < order.length - 1 ? i + 1 : i,
      finished: i === order.length - 1,
    });
  };
  if (saved.value.finished) {
    const known = ids.length - missed.length;
    return (
      <>
        <div className="fam-viewer-scroll">
          <div className="fam-col fam-stack">
            <section className="fam-end mst-g1 mst-rim">
              <Typography component="h2" className="fam-end-title">
                All cards done
              </Typography>
              <Typography className="fam-end-sub">
                {missed.length
                  ? `${childName} knew ${known} of ${ids.length}. ${missed.length} to practise again.`
                  : `${childName} knew all ${ids.length}.`}
              </Typography>
              <div className="fam-end-actions">
                <Button disabled={off} onClick={() => saved.update({ order: ids, index: 0, finished: false })}>
                  Start over
                </Button>
                {!missed.length && (
                  <Button disabled={busy} onClick={onNewVersion} startIcon={<AutoAwesomeRounded />}>
                    Make flashcards
                  </Button>
                )}
              </div>
              {off && <SaveNote saved={saved} />}
            </section>
            {end}
            {advanced}
          </div>
        </div>
        <footer className="fam-viewer-foot" data-col="680">
          <span className="fam-grow" />
          {missed.length > 0 ? (
            <Button
              variant="contained"
              disabled={off}
              onClick={() => saved.update({ order: missed, index: 0, finished: false })}
            >
              Practise {missed.length} card{missed.length === 1 ? '' : 's'} again
            </Button>
          ) : (
            <Button
              variant="contained"
              className="mst-ai"
              disabled={busy}
              onClick={onQuiz}
              startIcon={<AutoAwesomeRounded />}
            >
              Practise with a quiz
            </Button>
          )}
        </footer>
      </>
    );
  }
  return (
    <>
      <div className="fam-viewer-scroll">
        <div className="fam-col">
          <Steps count={order.length} now={i} />
          {/* The line above the card follows the step (§6.6), and says the missed cards come back at the end. */}
          <Typography className="fam-quiz-hint">
            {turned
              ? `Did ${childName} know it? Cards ${childName} doesn’t know yet come back at the end.`
              : `Read the question with ${childName}. When ${childName} has had a go, show the answer.`}
          </Typography>
          <section className="fam-fcard mst-g1 mst-rim" aria-label={`Card ${i + 1}`}>
            <div className="fam-fcard-in">
              <span className="fam-fcard-side">Question</span>
              <MathText text={card.front} />
              <div aria-live="polite">
                {turned && (
                  <div className="fam-fcard-back">
                    <span className="fam-fcard-side">Answer</span>
                    <MathText text={card.back} />
                  </div>
                )}
              </div>
            </div>
          </section>
          {turned && card.explanation && (
            <div className="fam-fcard-more">
              <Prose text={card.explanation} />
            </div>
          )}
          {off && <SaveNote saved={saved} />}
        </div>
      </div>
      <footer className="fam-viewer-foot" data-col="680">
        <Button className="fam-back" data-hide={i === 0} disabled={i === 0 || off} onClick={() => move(i - 1)}>
          Previous card
        </Button>
        <span className="fam-grow" />
        {turned ? (
          <>
            <Button variant="outlined" disabled={off} onClick={() => rate('practise')}>
              Not yet
            </Button>
            <Button variant="contained" disabled={off} onClick={() => rate('got_it')}>
              {childName} knew it
            </Button>
          </>
        ) : (
          <Button variant="contained" onClick={() => setTurned(true)}>
            Show answer
          </Button>
        )}
      </footer>
    </>
  );
}
