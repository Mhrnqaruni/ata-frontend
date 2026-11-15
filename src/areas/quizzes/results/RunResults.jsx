// One run's results under the header (design.md §3.8, §4): the summary, then two halves, the pupils and the questions,
// with one filter on the pupils; a post quiz's before-and-after; and every state's words.
// Area: quizzes

import { useEffect, useState } from 'react';
import { Alert, Button, Skeleton } from '@mui/material';
import QueryNotice from '../../../components/common/QueryNotice';
import TagAnalytics from '../../../components/tags/TagAnalytics';
import BeforeAfter from './BeforeAfter';
import { isOpen } from './figures';
import NotOnList from './NotOnList';
import PendingMarks from './PendingMarks';
import PupilTable from './PupilTable';
import QuestionList from './QuestionList';
import Summary from './Summary';
import { RESULTS } from './words';

export function ResultsSkeleton() {
  return (
    <div aria-label={RESULTS.loading} className="quiz-results-loading" role="status">
      <Skeleton height={168} variant="rounded" />
      <div className="quiz-results-halves">
        <Skeleton height={420} variant="rounded" />
        <Skeleton height={420} variant="rounded" />
      </div>
    </div>
  );
}

// Each question's picture address, by question id, from the quiz as it is now.
const picturesOf = (quiz) =>
  Object.fromEntries((quiz?.questions || []).filter((q) => q.media_url).map((q) => [String(q.id), q.media_url]));

// The typed answers the AI marks: at Close or Same meaning (C1; a question saved before the level is Same meaning).
// Exact is checked by code, so it isn't "Marked by AI".
const aiMarkedOf = (quiz) =>
  new Set(
    (quiz?.questions || [])
      .filter((q) => q.question_type === 'short_answer' && (q.match_level ?? 'meaning') !== 'exact')
      .map((q) => String(q.id))
  );

const HEAD_OFFSET = 96; // px from the top: below the page header once it condenses and sticks (12 + 70 px)

// After a click on a question, the pupils' half comes into view 96 px from the top, since the shorter list it now
// shows can end above the screen, chip and all (design check C6, P2 R1). Reduced motion jumps.
function showPupils() {
  const pupils = document.querySelector('[data-mst="results-pupils"]');
  if (!pupils) return;
  const top = pupils.getBoundingClientRect().top;
  if (top >= HEAD_OFFSET && top < window.innerHeight - 160) return; // its header is in view already
  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: window.scrollY + top - HEAD_OFFSET, behavior: still ? 'auto' : 'smooth' });
}

// summary and extras: the run's queries; runs: every run of the quiz.
export default function RunResults({ quizId, quiz, run, runs, summary, extras }) {
  // null, { kind: 'below' } or { kind: 'question', id }: one filter on the pupils at a time.
  const [filter, setFilter] = useState(null);
  const pickedId = filter?.kind === 'question' ? filter.id : null;
  useEffect(() => {
    if (pickedId) showPupils();
  }, [pickedId]);
  // The extras' notice sits above the summary, so the page waits for both rather than jump when it arrives.
  if (summary.isPending || (extras.isPending && extras.fetchStatus === 'fetching')) return <ResultsSkeleton />;
  if (!summary.data) {
    // A run whose questions can't be read is quiet, never a page-wide failure (SOT-19, X1).
    if (summary.error?.status === 409) {
      return (
        <Alert data-mst="run-unreadable" severity="info">
          {RESULTS.runUnreadable} {runs.length > 1 ? RESULTS.otherRuns : ''}
        </Alert>
      );
    }
    return (
      <Alert
        action={
          <Button color="inherit" disabled={summary.isFetching} onClick={() => summary.refetch()} size="small">
            {RESULTS.tryAgain}
          </Button>
        }
        severity="error"
      >
        {summary.error?.message || RESULTS.runFailed}
      </Alert>
    );
  }
  const data = summary.data;
  const nobody = !data.took_part && !data.not_on_class_list.length && !isOpen(data);
  const onlyBelow = filter?.kind === 'below';
  // The question filter follows the latest figures, since an open run's summary refreshes itself.
  const question = filter?.kind === 'question' ? data.questions.find((q) => q.id === filter.id) : null;
  const shownFilter = onlyBelow ? filter : question ? { kind: 'question', question } : null;
  const pickQuestion = (picked) =>
    setFilter((now) => (now?.kind === 'question' && now.id === picked.id ? null : { kind: 'question', id: picked.id }));
  return (
    <div className="quiz-results-body" data-refreshing={summary.isPlaceholderData ? 'true' : undefined}>
      <QueryNotice label={RESULTS.theseResults} query={summary} />
      {run.kind === 'live' ? <PendingMarks runId={run.id} waiting={extras.data?.waiting ?? 0} /> : null}
      <Summary onBelow={() => setFilter(onlyBelow ? null : { kind: 'below' })} onlyBelow={onlyBelow} summary={data} />
      {nobody ? null : (
        <div className="quiz-results-halves">
          <PupilTable
            filter={shownFilter}
            onClear={() => setFilter(null)}
            quizId={quizId}
            runId={run.id}
            summary={data}
          >
            <NotOnList quizId={quizId} run={run} summary={data} />
          </PupilTable>
          <QuestionList
            aiMarked={aiMarkedOf(quiz)}
            onClear={() => setFilter(null)}
            onPick={pickQuestion}
            picked={question?.id ?? null}
            pictures={picturesOf(quiz)}
            questions={data.questions}
          />
        </div>
      )}
      {extras.data?.comparison ? <BeforeAfter comparison={extras.data.comparison} /> : null}
      <TagAnalytics activityId={run.id} />
    </div>
  );
}
