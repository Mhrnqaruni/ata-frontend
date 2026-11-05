// The results page of one assessment: summary figures, the student results table and the analytics tab.
// Area: assessments

import AssessmentAnalytics from '../../components/assessments/AssessmentAnalytics';
import TagAnalytics from '../../components/tags/TagAnalytics';
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Box, Alert, AlertTitle, Link, Skeleton, Tabs, Tab } from '@mui/material';
import PeopleAltOutlined from '@mui/icons-material/PeopleAltOutlined';
import FunctionsOutlined from '@mui/icons-material/FunctionsOutlined';
import RateReviewOutlined from '@mui/icons-material/RateReviewOutlined';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import reviewService from '../../services/reviewService';
import ResultsTable from '../../components/assessments/ResultsTable';
import StatusChip from '../../components/assessments/StatusChip';
import PageHeader from '../../components/common/PageHeader';
import InfoCard from '../../components/home/InfoCard';
import ErrorAlert from '../../components/common/ErrorAlert';
import HeldQuestionsAlert from '../../areas/assessments/HeldQuestionsAlert';
import AnswerKeyDialog, { AnswerKeyNote } from '../../areas/assessments/QuickAnswerKey';

// Three figures worked out from the rows on screen (nothing extra is fetched)
const summarise = (rows = []) => {
  const present = rows.filter((s) => s.status !== 'ABSENT');
  const graded = present.filter((s) => s.status !== 'PENDING_REVIEW' && s.totalScore != null && s.maxTotalScore > 0);
  const average = graded.length
    ? graded.reduce((sum, s) => sum + (s.totalScore / s.maxTotalScore) * 100, 0) / graded.length
    : null;
  return { students: rows.length, average, pending: rows.filter((s) => s.status === 'PENDING_REVIEW').length };
};

const AssessmentResultsPage = () => {
  const { job_id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'analytics' ? 'analytics' : 'students';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [keyOpen, setKeyOpen] = useState(false);

  useEffect(() => {
    if (!job_id) {
      setLoading(false);
      return;
    }
    const fetchResults = async () => {
      try {
        setLoading(true);
        const data = await reviewService.getResultsOverview(job_id);
        setResults(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [job_id]);

  if (loading) {
    return (
      <Box>
        <Skeleton height={64} sx={{ mb: 3.5, maxWidth: 360 }} variant="rounded" />
        <div className="mst-grid mst-grid-3">
          {[0, 1, 2].map((i) => (
            <Skeleton height={104} key={i} variant="rectangular" />
          ))}
        </div>
        <Skeleton height={280} sx={{ mt: 4 }} variant="rectangular" />
      </Box>
    );
  }

  if (error) {
    return <ErrorAlert error={error}>{error.message || 'An error occurred while fetching results.'}</ErrorAlert>;
  }

  const rows = results?.students ?? [];
  const sum = summarise(rows);
  const held = results?.heldFiles ?? [];
  // A Quick assessment whose answer key the AI wrote, all or in part; a student's review carries the key itself.
  const answerKey = results?.answerKey?.writtenByAI > 0 ? results.answerKey : null;
  const keyEntityId = (rows.find((s) => s.status !== 'ABSENT') ?? rows[0])?.entityId;
  const unmatched = results?.assessmentOnly ? 0 : rows.filter((s) => s.isOutsider).length;
  const toUnmatched = (event) => {
    event.preventDefault();
    document.getElementById('not-matched')?.scrollIntoView({ block: 'start' });
  };

  return (
    <Box className={activeTab === 'analytics' ? 'mst-analytics-page' : undefined}>
      <PageHeader
        breadcrumbs={[
          { label: 'Assessments', to: '/assessments' },
          { label: activeTab === 'analytics' ? 'Analytics' : results?.assessmentName || 'Results' },
        ]}
        title={results?.assessmentName || 'Assessment results'}
        titleAdornment={results?.status ? <StatusChip status={results.status} /> : null}
        subtitle={answerKey && <AnswerKeyNote answerKey={answerKey} onView={() => setKeyOpen(true)} />}
      />
      {answerKey && (
        <AnswerKeyDialog
          open={keyOpen}
          onClose={() => setKeyOpen(false)}
          jobId={job_id}
          entityId={keyEntityId}
          answerKey={answerKey}
          heldQuestions={results.heldQuestions}
        />
      )}
      <Tabs
        value={activeTab}
        onChange={(_, value) => {
          const next = new URLSearchParams(searchParams);
          value === 'analytics' ? next.set('tab', value) : next.delete('tab');
          setSearchParams(next);
        }}
        aria-label="Assessment results views"
        sx={{ mb: 3 }}
      >
        <Tab value="students" label="Students" id="students-tab" aria-controls="students-panel" />
        <Tab value="analytics" label="Analytics" id="analytics-tab" aria-controls="analytics-panel" />
      </Tabs>
      {activeTab === 'analytics' ? (
        <Box role="tabpanel" id="analytics-panel" aria-labelledby="analytics-tab">
          <AssessmentAnalytics jobId={job_id} assessmentOnly={results?.assessmentOnly} />
        </Box>
      ) : (
        <Box role="tabpanel" id="students-panel" aria-labelledby="students-tab">
          <HeldQuestionsAlert jobId={job_id} held={results?.heldQuestions ?? []} />
          {held.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <AlertTitle>
                {held.length === 1 ? "1 file wasn't graded" : `${held.length} files weren't graded`}
              </AlertTitle>
              {held.map((file, i) => (
                <div key={file.id} style={i ? { marginTop: 8 } : undefined}>
                  {file.reason}
                </div>
              ))}
            </Alert>
          )}
          <dl className="mst-results-summary" aria-label="Assessment summary">
            <div>
              <dt>Students shown</dt>
              <dd>{sum.students}</dd>
            </div>
            <div>
              <dt>Average of graded submissions</dt>
              <dd>{sum.average == null ? '—' : `${sum.average.toFixed(1)}%`}</dd>
            </div>
            <div>
              <dt>Needs review</dt>
              <dd>{sum.pending}</dd>
            </div>
            {unmatched > 0 && (
              <div>
                <dt>
                  <WarningAmberRounded
                    aria-hidden="true"
                    color="warning"
                    sx={{ fontSize: 16, verticalAlign: '-3px', mr: 0.5 }}
                  />
                  Not matched to the student list
                </dt>
                <dd>
                  <Link href="#not-matched" onClick={toUnmatched}>
                    {unmatched}
                  </Link>
                </dd>
              </div>
            )}
          </dl>
          <div className="mst-section-label">Students</div>
          <TagAnalytics activityId={job_id} />
          <ResultsTable rows={rows} assessmentOnly={results?.assessmentOnly} toUnmatched={toUnmatched} />
        </Box>
      )}
    </Box>
  );
};

export default AssessmentResultsPage;
