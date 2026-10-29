import { assessmentDestination } from '../utils/assessmentNavigation';
import { useTeacherData } from '../hooks/useTeacherData';
import QueryNotice from '../components/common/QueryNotice';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Skeleton } from '@mui/material';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import PeopleAltOutlined from '@mui/icons-material/PeopleAltOutlined';
import GradingOutlined from '@mui/icons-material/GradingOutlined';
import QuizOutlined from '@mui/icons-material/QuizOutlined';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import GreetingBanner from '../components/home/GreetingBanner';
import PerformancePanel from '../components/home/PerformancePanel';
import dashboardService from '../services/dashboardService';
import assessmentService from '../services/assessmentService';
import quizService from '../services/quizService';

const shortDate = value => value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';
const newest = (a, b) => new Date(b.updated_at || b.createdAt || b.created_at || 0) - new Date(a.updated_at || a.createdAt || a.created_at || 0);

function RecentPanel({ title, note, to, loading, error, empty, children }) {
  return <section className="mst-g1 mst-rim home-recent">
    <header><div className="home-section-heading"><h2 className="mst-card-title">{title}</h2>{note && <span className="home-remaining-note">{note}</span>}</div><Button component={Link} to={to} size="small" endIcon={<ArrowForwardRounded />}>See all</Button></header>
    {error ? <p className="mst-panel-empty" role="status">Unable to load {title.toLowerCase()}. Refresh to try again.</p>
      : loading ? <Skeleton height={64} sx={{ mx: 2 }} />
      : children.length ? <ul className="mst-list">{children}</ul> : <p className="mst-panel-empty">{empty}</p>}
  </section>;
}

// Real teacher data only. All actions keep the existing routes and API contracts.
export default function Home() {
  const summaryQuery = useTeacherData('summary');
  const assessmentQuery = useTeacherData('assessments');
  const quizQuery = useTeacherData('quizzes');
  const summary = summaryQuery.data;
  const assessments = assessmentQuery.data ?? null;
  const quizzes = quizQuery.data ?? null;
  const errors = { summary: !summary && summaryQuery.error,
    assessments: !assessments && assessmentQuery.error, quizzes: !quizzes && quizQuery.error };
  const recent = [...(assessments || [])].sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const activeQuizzes = (quizzes || []).filter(quiz => quiz.status !== 'completed').sort(newest);
  const pending = recent.filter(job => job.status === 'Pending Review').length;
  const drafts = activeQuizzes.filter(quiz => quiz.status === 'draft').length;
  const stats = [['Classes', summary?.classCount, SchoolOutlined], ['Students', summary?.studentCount, PeopleAltOutlined], ['Assessments', assessments?.length, GradingOutlined], ['Quizzes', quizzes?.length, QuizOutlined]];
  return <div className="home-home">
    <GreetingBanner />
    <QueryNotice query={summaryQuery} label="summary" /><QueryNotice query={assessmentQuery} label="assessments" /><QueryNotice query={quizQuery} label="quizzes" />
    <section className="mst-g1 mst-rim home-summary" aria-label="Teaching summary">
      {stats.map(([label, value, Icon]) => <div className="home-summary-item" key={label}><span className="home-summary-icon"><Icon aria-hidden="true" /></span><strong>{value ?? '—'}</strong><span>{label}</span></div>)}
    </section>
    <div className="home-dashboard-grid">
      <PerformancePanel assessments={assessments} loadError={errors.assessments} />
      <div className="home-recent-grid">
        <RecentPanel title="Recent assessments" note={pending ? `${pending} needs attention` : null} to="/assessments" loading={!assessments} error={errors.assessments} empty={assessments?.length ? 'All assessments are complete. See all for results.' : 'No assessments yet. Open Assessments to get started.'}>
          {recent.slice(0, 4).map(job => <li key={job.id}><Link className="mst-list-row home-row-button" to={assessmentDestination(job)}><span className="mst-tile" data-size="sm"><GradingOutlined /></span><span className="mst-list-text"><span className="mst-list-title">{job.assessmentName}</span><span className="mst-list-meta">{[job.className, shortDate(job.createdAt)].filter(Boolean).join(' · ')}</span></span><ArrowForwardRounded className="home-row-arrow" aria-hidden="true" /></Link></li>)}
        </RecentPanel>
        <RecentPanel title="Quizzes" note={drafts ? `${drafts} ${drafts === 1 ? 'draft' : 'drafts'} to finish` : null} to="/quizzes" loading={!quizzes} error={errors.quizzes} empty={quizzes?.length ? 'All quizzes are complete. See all for results.' : 'No quizzes yet. Open Quizzes to create one.'}>
          {activeQuizzes.slice(0, 4).map(quiz => <li key={quiz.id}><Link className="mst-list-row home-row-button" to={`/quizzes/${quiz.id}/edit`}><span className="mst-tile" data-size="sm"><QuizOutlined /></span><span className="mst-list-text"><span className="mst-list-title">{quiz.title}</span><span className="mst-list-meta">{quiz.question_count || 0} questions · {quiz.settings?.mode === 'self_paced' ? 'Self-paced' : 'Live'}</span></span><span className="home-work-state">{quiz.status === 'published' ? 'Ready' : String(quiz.status || '').replace(/^./, c => c.toUpperCase())}</span></Link></li>)}
        </RecentPanel>
      </div>
    </div>
  </div>;
}
