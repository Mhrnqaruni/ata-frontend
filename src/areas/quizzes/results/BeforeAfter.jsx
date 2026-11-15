// A post quiz's before-and-after, kept from today's results: the before quiz's latest finished run beside this run,
// and the change, for the measures teachers read (design.md §3.11 leaves out "Median" and the like).
// Area: quizzes

import { Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { points } from './figures';
import { RESULTS } from './words';

const percent = (value) => `${Math.round(value)}%`;
const share = (value) => percent(value * 100);

// The measures, in order, by the names each kind's comparison gives them; `better` marks those where up is good.
const MEASURES = [
  { key: 'average_score', label: 'Average points', show: points, better: true },
  { key: 'average_accuracy_rate', label: 'Answers right', show: share, better: true },
  { key: 'completion_rate', label: 'Handed in', show: percent, better: true },
  { key: 'total_participants', label: 'Took part', show: String },
];

const has = (value) => value !== null && value !== undefined;

// "+3.5", "−12%", or "0", in the measure's own unit; up is ok ink and down warning ink where it matters.
function Change({ measure, delta }) {
  if (!has(delta)) return <span className="quiz-results-quiet">—</span>;
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
  const tone = measure.better && delta ? (delta > 0 ? 'ok' : 'warn') : undefined;
  return (
    <span className="quiz-results-change" data-tone={tone}>
      {sign}
      {measure.show(Math.abs(delta))}
    </span>
  );
}

// comparison: today's pre_post_comparison for this run, or { available: false } with no finished before run.
export default function BeforeAfter({ comparison }) {
  const rows = MEASURES.filter((measure) => comparison.metrics?.[measure.key]);
  return (
    <section aria-labelledby="quiz-results-compare" className="quiz-results-card" data-mst="results-before-after">
      <header className="quiz-results-card-head">
        <h2 id="quiz-results-compare">{RESULTS.beforeAfter}</h2>
        {comparison.available === false ? null : (
          <span className="quiz-results-caption">
            {comparison.pre_quiz_title} → {comparison.post_quiz_title}
          </span>
        )}
      </header>
      {comparison.available === false || !rows.length ? (
        <p className="quiz-results-note">{RESULTS.nothingToCompare}</p>
      ) : (
        <Table aria-labelledby="quiz-results-compare" className="mst-table quiz-results-table" size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <span className="mst-visually-hidden">Measure</span>
              </TableCell>
              <TableCell align="right">{RESULTS.before}</TableCell>
              <TableCell align="right">{RESULTS.after}</TableCell>
              <TableCell align="right">{RESULTS.change}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((measure) => {
              const { pre, post, delta } = comparison.metrics[measure.key];
              return (
                <TableRow key={measure.key}>
                  <TableCell>{measure.label}</TableCell>
                  <TableCell align="right" className="quiz-results-figure">
                    {has(pre) ? measure.show(pre) : '—'}
                  </TableCell>
                  <TableCell align="right" className="quiz-results-figure">
                    {has(post) ? measure.show(post) : '—'}
                  </TableCell>
                  <TableCell align="right" className="quiz-results-figure">
                    <Change delta={delta} measure={measure} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
