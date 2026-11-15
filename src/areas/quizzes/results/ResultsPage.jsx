// A quiz's one results page at /quizzes/:quizId/results (Phase 1.46, SOT-7; design.md §3.11): any run and any of its
// classes, picked in the header and kept in the address (?run=, ?class=); the summary first, then pupils and questions.
// Area: quizzes

import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Button } from '@mui/material';
import InsightsOutlined from '@mui/icons-material/InsightsOutlined';
import EmptyState from '../../../components/common/EmptyState';
import PageHeader from '../../../components/common/PageHeader';
import { useExtras, useQuiz, useRuns, useSummary } from './queries';
import ResultsActions from './ResultsActions';
import RunPicker from './RunPicker';
import RunResults, { ResultsSkeleton } from './RunResults';
import useDownloads from './useDownloads';
import { RESULTS } from './words';
import './results.css';

function LoadFailed({ error, onRetry }) {
  const missing = error?.status === 404;
  return (
    <Alert
      action={
        missing ? (
          <Button color="inherit" component={RouterLink} size="small" to="/quizzes">
            {RESULTS.backToQuizzes}
          </Button>
        ) : (
          <Button color="inherit" onClick={onRetry} size="small">
            {RESULTS.tryAgain}
          </Button>
        )
      }
      severity="error"
    >
      {missing ? RESULTS.quizMissing : RESULTS.loadFailed}
    </Alert>
  );
}

export default function ResultsPage() {
  const { quizId } = useParams();
  const [search, setSearch] = useSearchParams();
  const quiz = useQuiz(quizId);
  const runs = useRuns(quizId);
  const list = runs.data ?? [];
  // The run in the address, else the newest; the class only if the run has it.
  const run = list.find((item) => item.id === search.get('run')) ?? list[0] ?? null;
  const classId = run?.classes?.some((item) => item.id === search.get('class')) ? search.get('class') : null;
  const summary = useSummary(quizId, run, classId);
  const extras = useExtras(quizId, run, quiz.data);
  const title = quiz.data?.display_title || quiz.data?.title || RESULTS.title;
  const downloads = useDownloads(run, { title, summary: summary.data });
  const choose = (runId, chosenClass) => setSearch(chosenClass ? { run: runId, class: chosenClass } : { run: runId });

  let body;
  if (quiz.error || runs.error) {
    body = (
      <LoadFailed
        error={runs.error || quiz.error}
        onRetry={() => {
          if (quiz.error) quiz.refetch();
          if (runs.error) runs.refetch();
        }}
      />
    );
  } else if (quiz.isPending || runs.isPending) {
    body = <ResultsSkeleton />;
  } else if (!run) {
    body = (
      <EmptyState icon={<InsightsOutlined />} title={RESULTS.noRuns}>
        {RESULTS.noRunsText}
      </EmptyState>
    );
  } else {
    body = (
      <RunResults
        extras={extras}
        key={`${run.id}:${classId ?? ''}`}
        quiz={quiz.data}
        quizId={quizId}
        run={run}
        runs={list}
        summary={summary}
      />
    );
  }

  return (
    <div className="quiz-results" data-mst="quiz-results">
      <PageHeader
        actions={
          run && summary.data ? (
            <ResultsActions downloads={downloads} run={run} summary={summary.data} title={title} />
          ) : null
        }
        breadcrumbs={[{ label: RESULTS.quizzes, to: '/quizzes' }, { label: RESULTS.title }]}
        subtitle={
          run ? (
            <RunPicker
              classId={classId}
              onClass={(chosenClass) => choose(run.id, chosenClass)}
              onRun={(runId) => choose(runId, null)}
              run={run}
              runs={list}
            />
          ) : null
        }
        title={title}
      />
      {body}
    </div>
  );
}
