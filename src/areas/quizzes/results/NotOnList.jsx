// The walk-ins (design.md §3.8): who joined with the code but isn't on the class list, folded at the bottom of the
// pupils' half and left out of the figures, each with the ID they typed, Review › and "Match to a pupil…".
// Area: quizzes

import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, ButtonBase, Collapse, Table, TableBody, TableCell, TableRow } from '@mui/material';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import { WORDS } from '../words';
import { ResultWord, ReviewLink, ScoreCell } from './cells';
import { byName, reviewPath } from './figures';
import MatchDialog from './MatchDialog';
import { RESULTS } from './words';

export default function NotOnList({ quizId, run, summary }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [matching, setMatching] = useState(null);
  const id = useId();
  const walkIns = byName(summary.not_on_class_list);
  // Who a walk-in can be: a class pupil who hasn't taken part, with the school ID the match asks for.
  const candidates = byName(
    summary.pupils.filter((pupil) => ['absent', 'not_started'].includes(pupil.status) && pupil.display_id)
  );
  if (!walkIns.length) return null;
  return (
    <div className="quiz-results-walk-ins" data-mst="results-walk-ins">
      <h3 className="quiz-results-fold-head">
        <ButtonBase
          aria-controls={id}
          aria-expanded={open}
          className="quiz-results-fold"
          data-open={open ? 'true' : undefined}
          onClick={() => setOpen((now) => !now)}
        >
          {WORDS.notOnClassList}
          <span className="quiz-results-count">{walkIns.length}</span>
          <ExpandMoreRounded aria-hidden="true" className="quiz-results-fold-icon" />
        </ButtonBase>
      </h3>
      <Collapse id={id} in={open} unmountOnExit>
        <p className="quiz-results-note">{RESULTS.notOnListNote}</p>
        <Table
          aria-label={WORDS.notOnClassList}
          className="mst-table quiz-results-table quiz-results-pupils-table"
          size="small"
        >
          <TableBody>
            {walkIns.map((walkIn) => {
              const path = reviewPath(quizId, run.id, walkIn);
              return (
                <TableRow
                  data-link={path ? 'true' : undefined}
                  hover={Boolean(path)}
                  key={walkIn.id}
                  onClick={path ? () => navigate(path) : undefined}
                >
                  <TableCell className="quiz-results-name">
                    {walkIn.name}
                    <span className="quiz-results-typed">
                      {RESULTS.typedId} <span className="quiz-results-typed-id">{walkIn.display_id || '—'}</span>
                    </span>
                  </TableCell>
                  <TableCell className="quiz-results-score-cell">
                    <ScoreCell pupil={walkIn} summary={summary} />
                  </TableCell>
                  <TableCell className="quiz-results-result-cell">
                    {candidates.length ? (
                      <Button
                        className="quiz-results-match"
                        onClick={(event) => {
                          event.stopPropagation();
                          setMatching(walkIn);
                        }}
                        size="small"
                      >
                        {RESULTS.match}
                      </Button>
                    ) : (
                      <ResultWord pupil={walkIn} summary={summary} />
                    )}
                  </TableCell>
                  <TableCell className="quiz-results-review-cell">
                    <ReviewLink name={walkIn.name} to={path} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Collapse>
      {matching ? (
        <MatchDialog
          candidates={candidates}
          onClose={() => setMatching(null)}
          quizId={quizId}
          run={run}
          walkIn={matching}
        />
      ) : null}
    </div>
  );
}
