// The results' left half (design.md §3.8): the pupils lowest first, each with a score bar, a Result only for the
// exceptions and Review ›; a filter (below half, or a question's wrong or blank); the walk-ins folded under them.
// Area: quizzes

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, TableBody, TableCell, TableHead, TableRow, TableSortLabel } from '@mui/material';
import CloseRounded from '@mui/icons-material/CloseRounded';
import { WORDS } from '../words';
import { ResultWord, ReviewLink, ScoreCell } from './cells';
import { belowHalf, byName, byScore, missedBy, reviewPath } from './figures';
import { RESULTS } from './words';

const PAGE = 50;

// A sortable head: only the active one shows its arrow (the teacher tables' rule).
function Head({ column, label, sort, onSort, align, className }) {
  const active = sort.key === column;
  return (
    <TableCell align={align} className={className} sortDirection={active ? sort.order : false}>
      <TableSortLabel
        active={active}
        direction={active ? sort.order : 'asc'}
        hideSortIcon
        onClick={() => onSort(column)}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );
}

// The filter's chip in the header: "Below half the points ×" or "Q4 · wrong or blank ×".
function FilterChip({ filter, onClear }) {
  if (!filter) return null;
  const below = filter.kind === 'below';
  return (
    <Button
      aria-label={RESULTS.showEveryone}
      className="quiz-results-pick"
      data-mst="pupils-filter"
      data-set="true"
      endIcon={<CloseRounded />}
      onClick={onClear}
      variant="outlined"
    >
      {below ? WORDS.belowHalf : RESULTS.wrongOrBlank(filter.question.number)}
    </Button>
  );
}

// The pupils a filter keeps: { kind: 'below' } or { kind: 'question', question }; null keeps everyone.
function filtered(summary, filter) {
  if (filter?.kind === 'below') return belowHalf(summary.pupils, summary.max_points);
  if (filter?.kind === 'question') return missedBy(filter.question, summary.pupils);
  return summary.pupils;
}

// summary: the run's (or one class's); filter and onClear: the page's; quizId and runId: for each review's address;
// children: the walk-ins' fold.
export default function PupilTable({ summary, filter, onClear, quizId, runId, children }) {
  const navigate = useNavigate();
  const [sort, setSort] = useState({ key: 'score', order: 'asc' });
  const [limit, setLimit] = useState(PAGE);
  const shown = filtered(summary, filter);
  const sorted = sort.key === 'name' ? byName(shown, sort.order) : byScore(shown, sort.order);
  const rows = sorted.slice(0, limit);
  const onSort = (key) => setSort((now) => ({ key, order: now.key === key && now.order === 'asc' ? 'desc' : 'asc' }));
  return (
    <section aria-labelledby="quiz-results-pupils" className="quiz-results-card" data-mst="results-pupils">
      <header className="quiz-results-card-head">
        <h2 id="quiz-results-pupils">{RESULTS.pupils}</h2>
        <span className="quiz-results-count">{shown.length}</span>
        <FilterChip filter={filter} onClear={onClear} />
      </header>
      {filter?.kind === 'question' && !shown.length ? (
        <p className="quiz-results-note">{RESULTS.nobodyMissed(filter.question.number)}</p>
      ) : (
        <Table
          aria-labelledby="quiz-results-pupils"
          className="mst-table quiz-results-table quiz-results-pupils-table"
          size="small"
        >
          <TableHead>
            <TableRow>
              <Head column="name" label={RESULTS.name} onSort={onSort} sort={sort} />
              <Head
                className="quiz-results-score-col"
                column="score"
                label={RESULTS.score}
                onSort={onSort}
                sort={sort}
              />
              <TableCell className="quiz-results-result-col">{RESULTS.result}</TableCell>
              <TableCell className="quiz-results-review-col">
                <span className="mst-visually-hidden">{RESULTS.review}</span>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((pupil) => {
              const path = reviewPath(quizId, runId, pupil);
              return (
                <TableRow
                  data-link={path ? 'true' : undefined}
                  hover={Boolean(path)}
                  key={pupil.id}
                  onClick={path ? () => navigate(path) : undefined}
                >
                  <TableCell className="quiz-results-name">{pupil.name}</TableCell>
                  <TableCell className="quiz-results-score-cell">
                    <ScoreCell pupil={pupil} summary={summary} />
                  </TableCell>
                  <TableCell className="quiz-results-result-cell">
                    <ResultWord pupil={pupil} summary={summary} />
                  </TableCell>
                  <TableCell className="quiz-results-review-cell">
                    <ReviewLink name={pupil.name} to={path} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      {sorted.length > rows.length ? (
        <footer className="quiz-results-more">
          <Button onClick={() => setLimit((now) => now + PAGE)} size="small">
            Show {Math.min(PAGE, sorted.length - rows.length)} more
          </Button>
        </footer>
      ) : null}
      {children}
    </section>
  );
}
