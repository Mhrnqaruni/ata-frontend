// One pupil's answers in one quiz run, at /quizzes/:quizId/runs/:runId/pupils/:pupilId (Phase 1.47 S4.2; design.md
// §3.9): every question with the map, marks and comments saved card by card with Undo, ‹ › and the report.
// Area: quizzes

import { useCallback, useMemo, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { Alert, Button, Skeleton } from '@mui/material';
import { useSnackbar } from '../../../hooks/useSnackbar';
import { cacheFamilies, invalidateTeacher } from '../../../services/queryCache';
import { markNumber } from '../../../components/review/cardSaver';
import DownloadMenu from '../../../components/review/DownloadMenu';
import ReviewHeader from '../../../components/review/ReviewHeader';
import ReviewLayout from '../../../components/review/ReviewLayout';
import UndoToast from '../../../components/review/UndoToast';
import useLeaveGuard from '../../../components/review/useLeaveGuard';
import useReviewSaves from '../../../components/review/useReviewSaves';
import { resultsLink } from '../links';
import * as rules from './answers';
import { downloadReport, saveMark } from './api';
import { reviewLink } from './links';
import { useAnswers, useRunSummary } from './queries';
import QuizCard from './QuizCard';
import { PUPIL_REVIEW } from './words';
import './review.css';

function ReviewSkeleton() {
  return (
    <div aria-label={PUPIL_REVIEW.loading} className="mst-rv" role="status">
      <Skeleton height={280} variant="rounded" />
      <div className="mst-rv-cards">
        <Skeleton height={220} variant="rounded" />
        <Skeleton height={220} variant="rounded" />
      </div>
    </div>
  );
}

function LoadFailed({ error, onRetry, back }) {
  const missing = error?.status === 404;
  const action = missing ? (
    <Button color="inherit" component={RouterLink} size="small" to={back}>
      {PUPIL_REVIEW.backToResults}
    </Button>
  ) : (
    <Button color="inherit" onClick={onRetry} size="small">
      {PUPIL_REVIEW.tryAgain}
    </Button>
  );
  return (
    <Alert action={action} severity="error">
      {missing ? PUPIL_REVIEW.missing : error?.message || PUPIL_REVIEW.loadFailed}
    </Alert>
  );
}

function PupilReview({ quizId, runId, pupilId }) {
  const answers = useAnswers(quizId, runId, pupilId);
  const summary = useRunSummary(quizId, runId);
  const { showSnackbar } = useSnackbar();
  const [landed, setLanded] = useState(null); // the total the last save gave: { score, at }
  const data = answers.data;
  const records = useMemo(() => (data?.questions ?? []).filter(rules.markable), [data]);

  // C4. Undoing a teacher's first change on an answer sends restore, which puts back the AI's or the automatic mark,
  // its comment and who marked it; undoing a later change sends the earlier values again (SOT-6).
  const save = useCallback(
    async (values, record, { undo } = {}) => {
      const restore = Boolean(undo) && undo.answer?.marked_by !== 'teacher';
      const result = await saveMark(quizId, runId, pupilId, record.question_id, {
        points: markNumber(values.mark) ?? 0,
        comment: values.comment ?? '',
        expected_revision: record.answer?.revision ?? null,
        ...(restore ? { restore: true } : {}),
      });
      setLanded({ score: result.score, at: Date.now() });
      void invalidateTeacher(cacheFamilies.quiz); // the results, the list and the pupil's pages follow
      return { ...record, answer: result.answer };
    },
    [quizId, runId, pupilId]
  );
  const saves = useReviewSaves({
    records,
    idOf: rules.questionId,
    valuesOf: rules.valuesOf,
    isValid: rules.isValid,
    save,
    requestedAt: data?.requested_at ?? 0,
  });
  useLeaveGuard(saves.unsaved, PUPIL_REVIEW.backToResults);

  const back = resultsLink(quizId, runId);
  if (answers.isPending) return <ReviewSkeleton />;
  if (!data) return <LoadFailed back={back} error={answers.error} onRetry={() => answers.refetch()} />;

  const { run, pupil } = data;
  // Each card's freshest record: the one its last save gave, else the last read's.
  const questions = data.questions.map((question) =>
    rules.markable(question) ? saves.card(question).record : question
  );
  const byId = new Map(questions.map((question) => [rules.questionId(question), question]));
  const near = rules.neighboursOf(rules.reviewOrder(summary.data), pupilId);
  const linkTo = (row) => (row ? { to: reviewLink(quizId, runId, row.id), name: row.name } : null);
  const score = landed && landed.at > data.requested_at ? landed.score : pupil.score;
  const locked = !data.can_mark;

  // "Reload this question", after someone else changed it first.
  const reload = async (id) => {
    const fresh = (await answers.refetch()).data?.questions?.find((question) => rules.questionId(question) === id);
    if (fresh) saves.card(fresh).reset(fresh);
  };
  const download = async (format) => {
    try {
      await downloadReport(run.kind, runId, pupil, format);
    } catch (error) {
      showSnackbar(PUPIL_REVIEW.reportFailed(format), 'error');
      throw error;
    }
  };

  return (
    <div className="quiz-review" data-mst="quiz-review">
      <ReviewHeader
        backLabel={PUPIL_REVIEW.backToResults}
        backTo={back}
        breadcrumbs={[
          { label: PUPIL_REVIEW.quizzes, to: '/quizzes' },
          { label: PUPIL_REVIEW.results, to: back },
          { label: PUPIL_REVIEW.review },
        ]}
        max={pupil.max_points}
        neighbours={{ previous: linkTo(near.previous), next: linkTo(near.next) }}
        score={score}
        subtitle={rules.contextLine(run)}
        title={pupil.name}
      >
        {pupil.finished ? <DownloadMenu onDownload={download} /> : null}
      </ReviewHeader>
      {pupil.finished ? null : (
        <Alert className="mst-qr-banner" severity="info">
          {run.kind === 'homework' ? PUPIL_REVIEW.stillWorking(pupil.name) : PUPIL_REVIEW.stillRunning}
        </Alert>
      )}
      {rules.allBlank(questions) ? <p className="mst-qr-blank">{PUPIL_REVIEW.noAnswers(pupil.name)}</p> : null}
      <ReviewLayout
        items={questions.map(rules.mapItem)}
        renderCard={(item) => {
          const question = byId.get(item.id);
          return (
            <QuizCard
              card={rules.markable(question) ? saves.card(question) : null}
              key={item.id}
              locked={locked}
              onReload={() => reload(item.id)}
              question={question}
            />
          );
        }}
      />
      <UndoToast onClose={saves.closeToast} toast={saves.toast} />
    </div>
  );
}

// A new pupil or run starts the page afresh: its own saves, map and toast.
export default function ReviewPage() {
  const { quizId, runId, pupilId } = useParams();
  return <PupilReview key={`${runId}:${pupilId}`} pupilId={pupilId} quizId={quizId} runId={runId} />;
}
