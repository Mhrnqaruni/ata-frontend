// The marking review page for one student: every question on one page with the map, the AI's reading before each
// mark, marks and feedback saved card by card with Undo (Phase 1.47), Download, and feedback for all students.
// Area: assessments

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Alert, AlertTitle, Box, Button, CircularProgress, Skeleton } from '@mui/material';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import ErrorAlert from '../../components/common/ErrorAlert';
import OriginalScriptDialog from '../../components/assessments/OriginalScriptDialog';
import ReportDownloadMenu from '../../areas/assessments/ReportDownloadMenu';
import realisticService from '../../areas/assessments/realisticService';
import { preparedWords, WORDS } from '../../areas/assessments/realisticRules';
import ReviewHeader from '../../components/review/ReviewHeader';
import ReviewLayout from '../../components/review/ReviewLayout';
import UndoToast from '../../components/review/UndoToast';
import useLeaveGuard from '../../components/review/useLeaveGuard';
import useReviewSaves from '../../components/review/useReviewSaves';
import AssessmentReviewCard from '../../areas/assessments/AssessmentReviewCard';
import { reasonFromFeedback } from '../../areas/assessments/HeldReason';
import * as rules from '../../areas/assessments/reviewRules';
import { useSnackbar } from '../../hooks/useSnackbar';
import reviewService from '../../services/reviewService';

const BACK = 'Back to results';
const SCRIPT = 'View submitted script';

// A held answer's reason once went into its feedback (TODO #106): its box starts empty (design §3.5), and an older
// result's reason goes on the reason line instead.
const opened = (q) => (rules.isHeld(q) ? { ...q, feedback: '', oldReason: reasonFromFeedback(q.feedback) } : q);

function StudentReview({ jobId, entityId }) {
  const asked = useSearchParams()[0].get('question'); // the held-questions alert opens a student on one
  const { showSnackbar } = useSnackbar();
  const [load, setLoad] = useState({ loading: true, error: null, data: null });
  const [script, setScript] = useState(null); // the question whose submitted script is open
  const [inView, setInView] = useState(null);
  const [queueing, setQueueing] = useState(false); // "Prepare feedback for all students" is waiting for its answer

  // The review, with the time it was asked for, so a read older than a save never undoes it.
  const read = useCallback(async () => {
    const requestedAt = Date.now();
    const value = await reviewService.getStudentReview(jobId, entityId);
    return { ...value, perQuestion: (value.perQuestion || []).map(opened), requestedAt };
  }, [jobId, entityId]);
  useEffect(() => {
    let active = true;
    read()
      .then((data) => active && setLoad({ loading: false, error: null, data }))
      .catch((error) => active && setLoad({ loading: false, error, data: null }));
    return () => {
      active = false;
    };
  }, [read]);

  const data = load.data;
  const records = useMemo(() => data?.perQuestion ?? [], [data]);
  // The save's rules stay the server's (assessments/commands.py): the status becomes Teacher graded, the job turns
  // Completed when nothing is pending, the AI summary is cleared, and each question has its own revision check.
  const save = useCallback(
    async (values, record) => {
      const body = rules.saveBody(values, record);
      try {
        const confirmation = await reviewService.saveQuestion(jobId, entityId, record.questionId, body);
        return rules.afterSave(record, body, confirmation);
      } catch (error) {
        throw rules.refusal(error);
      }
    },
    [jobId, entityId]
  );
  const saves = useReviewSaves({
    records,
    idOf: rules.idOf,
    valuesOf: rules.valuesOf,
    isValid: rules.isValid,
    save,
    canUndo: rules.canUndo,
    requestedAt: data?.requestedAt,
  });
  useLeaveGuard(saves.unsaved, BACK);

  if (load.loading)
    return (
      <Box>
        <Skeleton height={80} />
        <Skeleton height={420} />
      </Box>
    );
  if (load.error)
    return <ErrorAlert error={load.error}>{load.error.message || 'Could not load this review.'}</ErrorAlert>;
  if (!data) return <Alert severity="info">No review data found.</Alert>;

  const questions = records.map((q) => saves.card(q).record); // each card's freshest record
  const byId = new Map(questions.map((q, index) => [rules.idOf(q), { question: q, number: index + 1 }]));
  const pending = questions.filter(rules.isHeld).length;
  const start = questions.find((q) => rules.idOf(q) === asked) ?? questions.find(rules.isHeld); // asked, or first held
  const viewed = byId.get(inView)?.question ?? questions[0];
  const { total, maximum } = rules.totals(questions);
  const context = [data.assessmentName, `${questions.length} questions`, pending ? `${pending} pending review` : null];

  // "Reload this question", after it changed somewhere else.
  const reload = async (id) => {
    try {
      const fresh = (await read()).perQuestion.find((q) => rules.idOf(q) === id);
      if (fresh) saves.card(fresh).reset(fresh);
    } catch (error) {
      showSnackbar(error.message || 'Could not load this review.', 'error', error.reference);
    }
  };

  // Queues every student whose review is final, then says how many are queued and ready (SOT-6 API).
  const prepareAll = async () => {
    setQueueing(true);
    try {
      showSnackbar(preparedWords(await realisticService.prepareAll(jobId)), 'success');
    } catch (error) {
      showSnackbar(error.message, 'error', error.reference);
    } finally {
      setQueueing(false);
    }
  };

  return (
    <Box className="mst-review-page" sx={{ minWidth: 0 }}>
      {script ? (
        <OriginalScriptDialog
          jobId={jobId}
          key={`${jobId}:${entityId}:${script.questionId}:${script.sourceExecutionId}`}
          onClose={() => setScript(null)}
          question={script}
          studentId={entityId}
          studentName={data.studentName}
        />
      ) : null}
      <ReviewHeader
        backLabel={BACK}
        backTo={`/assessments/${jobId}/results`}
        breadcrumbs={[
          { label: 'Assessments', to: '/assessments' },
          { label: 'Results', to: `/assessments/${jobId}/results` },
          { label: 'Review' },
        ]}
        max={maximum}
        score={total}
        subtitle={context.filter(Boolean).join(' · ')}
        title={data.studentName || 'Review'}
      >
        {viewed ? (
          <Button onClick={() => setScript(viewed)} variant="outlined">
            {SCRIPT}
          </Button>
        ) : null}
        <Button
          disabled={queueing}
          onClick={prepareAll}
          startIcon={queueing ? <CircularProgress size={16} /> : <AutoAwesomeRounded />}
          variant="outlined"
        >
          {WORDS.prepareAll}
        </Button>
        {total === null ? null : <ReportDownloadMenu entityId={entityId} jobId={jobId} name={data.studentName} />}
      </ReviewHeader>
      {data.isOutsider && data.matchNote ? (
        <Alert
          action={
            viewed ? (
              <Button onClick={() => setScript(viewed)} size="small">
                {SCRIPT}
              </Button>
            ) : null
          }
          severity="warning"
          sx={{ mb: 2 }}
        >
          <AlertTitle>Not matched to the student list</AlertTitle>
          {data.matchNote}
        </Alert>
      ) : null}
      <ReviewLayout
        initialId={start ? rules.idOf(start) : undefined}
        items={questions.map((q, index) => rules.mapItem(q, index + 1))}
        legend={rules.LEGEND}
        onActive={setInView}
        renderCard={(item) => {
          const { question, number } = byId.get(item.id);
          return (
            <AssessmentReviewCard
              card={saves.card(question)}
              key={item.id}
              number={number}
              onReload={() => reload(item.id)}
              onScript={setScript}
              question={question}
            />
          );
        }}
      />
      <UndoToast onClose={saves.closeToast} toast={saves.toast} />
    </Box>
  );
}

// Another student or assessment starts the page afresh: its own saves, map and toast.
const AssessmentReviewPage = () => {
  const { job_id, entity_id } = useParams();
  return <StudentReview entityId={entity_id} jobId={job_id} key={`${job_id}:${entity_id}`} />;
};
export default AssessmentReviewPage;
