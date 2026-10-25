import TagAnalytics from '../../components/tags/TagAnalytics';
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Alert, Skeleton } from '@mui/material';
import PeopleAltOutlined from '@mui/icons-material/PeopleAltOutlined';
import FunctionsOutlined from '@mui/icons-material/FunctionsOutlined';
import RateReviewOutlined from '@mui/icons-material/RateReviewOutlined';
import reviewService from '../../services/reviewService';
import ResultsTable from '../../components/assessments/ResultsTable';
import StatusChip from '../../components/assessments/StatusChip';
import PageHeader from '../../components/common/PageHeader';
import InfoCard from '../../components/home/InfoCard';

// Three figures worked out from the rows on screen (nothing extra is fetched)
const summarise = (rows = []) => {
  const present = rows.filter((s) => s.status !== 'ABSENT');
  const graded = present.filter((s) => s.status !== 'PENDING_REVIEW' && s.totalScore != null && s.maxTotalScore > 0);
  const average = graded.length ? graded.reduce((sum, s) => sum + (s.totalScore / s.maxTotalScore) * 100, 0) / graded.length : null;
  return { students: rows.length, average, pending: rows.filter((s) => s.status === 'PENDING_REVIEW').length };
};

const AssessmentResultsPage = () => {
  const { job_id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

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
        setError(err.message || 'An error occurred while fetching results.');
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
        <div className="mst-grid mst-grid-3">{[0, 1, 2].map((i) => <Skeleton height={104} key={i} variant="rectangular" />)}</div>
        <Skeleton height={280} sx={{ mt: 4 }} variant="rectangular" />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const rows = results?.students ?? [];
  const sum = summarise(rows);

  return (
    <Box>
      <PageHeader
        breadcrumbs={[{ label: 'Assessments', to: '/assessments' }, { label: results?.assessmentName || 'Results' }]}
        title={results?.assessmentName || 'Assessment results'}
        titleAdornment={results?.status ? <StatusChip status={results.status} /> : null}
      />
      <dl className="mst-results-summary" aria-label="Assessment summary">
        <div><dt>Students</dt><dd>{sum.students}</dd></div>
        <div><dt>Average</dt><dd>{sum.average == null ? '—' : `${sum.average.toFixed(1)}%`}</dd></div>
        <div><dt>Needs review</dt><dd>{sum.pending}</dd></div>
      </dl>
      <div className="mst-section-label">Students</div>
      <TagAnalytics activityId={job_id}/>
      <ResultsTable rows={rows} />
    </Box>
  );
};

export default AssessmentResultsPage;
