import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Alert, TextField, Button, Card, Skeleton } from '@mui/material';
import reviewService from '../../services/reviewService';
import { useSnackbar } from '../../hooks/useSnackbar';
import StatusChip from '../../components/assessments/StatusChip';
import PageHeader from '../../components/common/PageHeader';
import QuestionNavigator from '../../components/common/QuestionNavigator';

const AssessmentReviewPage = () => {
  const { job_id, entity_id } = useParams();
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const [dirty, setDirty] = useState({});
  const [saving, setSaving] = useState(null);
  const [saveError, setSaveError] = useState({});
  const [saved, setSaved] = useState({});
  const requestVersion = useRef(0);

  useEffect(() => {
    let active = true;
    requestVersion.current += 1;
    setLoading(true); setError(null); setDirty({}); setSaved({}); setSaveError({}); setSaving(null);
    reviewService.getStudentReview(job_id, entity_id).then(value => {
      if (!active) return;
      setData(value);
      const firstPending = value.perQuestion?.find(q => q.status === 'PENDING_REVIEW');
      setSelected((firstPending || value.perQuestion?.[0])?.questionId ?? null);
      setFilter(firstPending ? 'pending' : 'all');
    }).catch(err => active && setError(err.message || 'Could not load this review.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [job_id, entity_id]);

  // Switching questions keeps drafts in page state; leaving the page must not silently discard them.
  const hasDrafts = Object.values(dirty).some(Boolean);
  useEffect(() => {
    if (!hasDrafts) return undefined;
    const unload = event => { event.preventDefault(); event.returnValue = ''; };
    const leave = event => {
      const anchor = event.target.closest?.('a[href]');
      const back = event.target.closest?.('button[aria-label="Back to results"]');
      if ((anchor && anchor.origin === window.location.origin && anchor.pathname !== window.location.pathname) || back) {
        if (!window.confirm('Leave this review? Unsaved marks and feedback will be lost.')) {
          event.preventDefault(); event.stopPropagation();
        }
      }
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', leave, true);
    return () => {
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('click', leave, true);
    };
  }, [hasDrafts]);

  const change = (id, field, value) => {
    setData(previous => ({ ...previous, perQuestion: previous.perQuestion.map(q => q.questionId === id ? { ...q, [field]: value } : q) }));
    setDirty(previous => ({ ...previous, [id]: true }));
    setSaved(previous => ({ ...previous, [id]: false }));
    setSaveError(previous => ({ ...previous, [id]: null }));
  };
  const save = async q => {
    const version = requestVersion.current;
    const maximum = q.maxScore ?? 100;
    const grade = Number(q.grade);
    if (q.grade == null || q.grade === '' || !Number.isFinite(grade) || grade < 0 || grade > maximum) {
      setSaveError(previous => ({ ...previous, [q.questionId]: `Enter a mark from 0 to ${maximum}.` }));
      return;
    }
    setSaving(q.questionId);
    setSaveError(previous => ({ ...previous, [q.questionId]: null }));
    try {
      await reviewService.saveQuestion(job_id, entity_id, q.questionId, { grade, feedback: q.feedback ?? '' });
      if (version !== requestVersion.current) return;
      setData(previous => ({ ...previous, perQuestion: previous.perQuestion.map(item =>
        item.questionId === q.questionId ? { ...item, status: 'TEACHER_GRADED' } : item) }));
      setDirty(previous => ({ ...previous, [q.questionId]: false }));
      setSaved(previous => ({ ...previous, [q.questionId]: true }));
      showSnackbar('Question saved.', 'success');
    } catch (err) {
      if (version === requestVersion.current) setSaveError(previous => ({ ...previous, [q.questionId]: err.message || 'Could not save. Your edits are still here.' }));
    } finally { if (version === requestVersion.current) setSaving(null); }
  };
  const questions = data?.perQuestion ?? [];
  const pending = questions.filter(q => q.status === 'PENDING_REVIEW');
  const visible = filter === 'pending' ? pending : questions;
  const current = visible.find(q => q.questionId === selected) || visible[0];
  const number = current ? questions.findIndex(q => q.questionId === current.questionId) + 1 : 0;
  const items = visible.map(q => ({
    id: q.questionId, number: questions.indexOf(q) + 1, title: q.questionText?.slice(0, 80),
    state: dirty[q.questionId] ? 'Unsaved' : q.status === 'PENDING_REVIEW' ? 'Needs review' : 'Marked',
  }));

  if (loading) return <Box><Skeleton height={80} /><Skeleton height={420} /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <Alert severity="info">No review data found.</Alert>;
  return (
    <Box className="mst-review-workspace" sx={{ maxWidth: 1240, mx: 'auto', minWidth: 0 }}>
      <PageHeader backLabel="Back to results" backTo={`/assessments/${job_id}/results`}
        breadcrumbs={[{ label: 'Assessments', to: '/assessments' }, { label: data.assessmentName || 'Results', to: `/assessments/${job_id}/results` }, { label: data.studentName || 'Review' }]}
        title={data.studentName || 'Review'}
        subtitle={`${data.assessmentName} · ${questions.length} questions · ${pending.length} need review`} />
      <div className="mst-review-overview">
        <p>Check the answer, adjust the mark or feedback, then save this question.</p>
        <span aria-live="polite">{Object.values(dirty).filter(Boolean).length ? `${Object.values(dirty).filter(Boolean).length} unsaved` : 'No unsaved changes'}</span>
      </div>
      <div className="mst-question-workspace">
        <QuestionNavigator items={items} selected={current?.questionId} onSelect={setSelected} label="Review questions">
          <div className="mst-review-filters" role="group" aria-label="Filter review questions">
            <Button size="small" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All ({questions.length})</Button>
            <Button size="small" aria-pressed={filter === 'pending'} onClick={() => setFilter('pending')}>Needs review ({pending.length})</Button>
          </div>
          <p className="mst-question-nav-hint">Dot: needs review · ring: unsaved edit</p>
        </QuestionNavigator>
        <div className="mst-focused-question">
          {!current ? <Alert severity="success">Nothing needs review. Choose All to inspect marked answers.</Alert> : (
            <Card className="mst-rim mst-review-q" key={current.questionId}>
              <div className="mst-review-q-head">
                <h2 className="mst-review-q-title">Question {number} <span className="mst-hint">of {questions.length}</span></h2>
                <StatusChip status={current.status} />
              </div>
              <p className="mst-review-q-text">{current.questionText}</p>
              <div className="mst-review-answer">
                <span className="mst-review-answer-label">Student's answer</span>
                <span className="mst-review-answer-text">{current.studentAnswer || 'No answer was read from the sheet.'}</span>
              </div>
              <div className="mst-review-fields">
                <TextField label={`Mark (out of ${current.maxScore})`} type="number"
                  value={current.grade ?? ''} disabled={saving === current.questionId}
                  onChange={event => change(current.questionId, 'grade', event.target.value)}
                  inputProps={{ min: 0, max: current.maxScore }} />
                <TextField fullWidth label="Feedback for the student" multiline minRows={3}
                  value={current.feedback ?? ''} disabled={saving === current.questionId}
                  onChange={event => change(current.questionId, 'feedback', event.target.value)} />
              </div>
              {saveError[current.questionId] && <Alert severity="error">{saveError[current.questionId]}</Alert>}
              <div className="mst-review-q-foot">
                <span role="status">{saving === current.questionId ? 'Saving…' : dirty[current.questionId] ? 'Unsaved changes' : saved[current.questionId] ? 'Saved' : 'Mark and feedback shown above'}</span>
                <div className="mst-review-save-actions">
                  <Button variant="contained" disabled={saving !== null} onClick={() => save(current)}>
                    {saving === current.questionId ? 'Saving…' : 'Save question'}
                  </Button>
                  <Button variant="outlined" aria-label="Next review question"
                    disabled={saving !== null || Boolean(dirty[current.questionId]) || visible.indexOf(current) >= visible.length - 1}
                    onClick={() => setSelected(visible[visible.indexOf(current) + 1].questionId)}>Next question</Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </Box>
  );
};
export default AssessmentReviewPage;
