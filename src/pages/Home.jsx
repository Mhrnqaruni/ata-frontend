// The teacher's front-page dashboard: greeting, counts, student performance, latest assessments and quizzes.
// Area: analytics

import { assessmentDestination } from '../utils/assessmentNavigation';
import { useTeacherData } from '../hooks/useTeacherData';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { libraryQuery } from '../areas/quizzes/queries';
import { quizLink } from '../areas/quizzes/links';
import { classList } from '../areas/quizzes/words';
import StatusDot from '../areas/quizzes/shared/StatusDot';
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

const shortDate = (value) =>
  value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';
// The quizzes on the go, last used first: what Home's panel lists (SOT-2, QA P2-4).
const ON_THE_GO = { state: ['draft', 'ready', 'live', 'homework'], sort: 'last_used', limit: 4 };

function RecentPanel({ title, note, to, loading, error, empty, children }) {
  return (
    <section className="mst-g1 mst-rim home-recent">
      <header>
        <div className="home-section-heading">
          <h2 className="mst-card-title">{title}</h2>
          {note && <span className="home-remaining-note">{note}</span>}
        </div>
        <Button component={Link} to={to} size="small" endIcon={<ArrowForwardRounded />}>
          See all
        </Button>
      </header>
      {error ? (
        <p className="mst-panel-empty" role="status">
          Unable to load {title.toLowerCase()}. Refresh to try again.
        </p>
      ) : loading ? (
        <Skeleton height={64} sx={{ mx: 2 }} />
      ) : children.length ? (
        <ul className="mst-list">{children}</ul>
      ) : (
        <p className="mst-panel-empty">{empty}</p>
      )}
    </section>
  );
}

// Real teacher data only. All actions keep the existing routes and API contracts.
export default function Home() {
  const { user } = useAuth();
  const summaryQuery = useTeacherData('summary');
  const assessmentQuery = useTeacherData('assessments');
  const quizQuery = useQuery({
    ...libraryQuery(user?.id, ON_THE_GO),
    enabled: Boolean(user?.id),
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });
  const summary = summaryQuery.data;
  const assessments = assessmentQuery.data ?? null;
  const library = quizQuery.data ?? null;
  const errors = {
    summary: !summary && summaryQuery.error,
    assessments: !assessments && assessmentQuery.error,
    quizzes: !library && quizQuery.error,
  };
  const recent = [...(assessments || [])].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const activeQuizzes = library?.items ?? [];
  const pending = recent.filter((job) => job.status === 'Pending Review').length;
  // The counts ignore the state filter: all but archived is what the list's total is with no filter.
  const counts = library?.counts;
  const quizCount = counts && counts.draft + counts.ready + counts.live + counts.homework + counts.finished;
  const drafts = counts?.draft ?? 0;
  const stats = [
    ['Classes', summary?.classCount, SchoolOutlined],
    ['Students', summary?.studentCount, PeopleAltOutlined],
    ['Assessments', assessments?.length, GradingOutlined],
    ['Quizzes', quizCount, QuizOutlined],
  ];
  return (
    <div className="home-home">
      <GreetingBanner />
      <QueryNotice query={summaryQuery} label="summary" />
      <QueryNotice query={assessmentQuery} label="assessments" />
      <QueryNotice query={quizQuery} label="quizzes" />
      <section className="mst-g1 mst-rim home-summary" aria-label="Teaching summary">
        {stats.map(([label, value, Icon]) => (
          <div className="home-summary-item" key={label}>
            <span className="home-summary-icon">
              <Icon aria-hidden="true" />
            </span>
            <strong>{value ?? '—'}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>
      <div className="home-dashboard-grid">
        <PerformancePanel assessments={assessments} loadError={errors.assessments} />
        <div className="home-recent-grid">
          <RecentPanel
            title="Recent assessments"
            note={pending ? `${pending} needs attention` : null}
            to="/assessments"
            loading={!assessments}
            error={errors.assessments}
            empty={
              assessments?.length
                ? 'All assessments are complete. See all for results.'
                : 'No assessments yet. Open Assessments to get started.'
            }
          >
            {recent.slice(0, 4).map((job) => (
              <li key={job.id}>
                <Link className="mst-list-row home-row-button" to={assessmentDestination(job)}>
                  <span className="mst-tile" data-size="sm">
                    <GradingOutlined />
                  </span>
                  <span className="mst-list-text">
                    <span className="mst-list-title">{job.assessmentName}</span>
                    <span className="mst-list-meta">
                      {[job.className, shortDate(job.createdAt)].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <ArrowForwardRounded className="home-row-arrow" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </RecentPanel>
          <RecentPanel
            title="Quizzes"
            note={drafts ? `${drafts} ${drafts === 1 ? 'draft' : 'drafts'} to finish` : null}
            to="/quizzes"
            loading={!library}
            error={errors.quizzes}
            empty={
              quizCount
                ? 'All your quizzes are finished. See all for their results.'
                : 'No quizzes yet. Open Quizzes to create one.'
            }
          >
            {activeQuizzes.map((quiz) => (
              <li key={quiz.id}>
                {/* Each quiz opens where its state says (links.js): a live or homework run, or the editor. */}
                <Link className="mst-list-row home-row-button" to={quizLink(quiz)}>
                  <span className="mst-tile" data-size="sm">
                    <QuizOutlined />
                  </span>
                  <span className="mst-list-text">
                    <span className="mst-list-title">{quiz.title}</span>
                    <span className="mst-list-meta">
                      {classList(quiz.classes)} · {quiz.question_count}{' '}
                      {quiz.question_count === 1 ? 'question' : 'questions'} ·{' '}
                      {quiz.mode === 'self_paced' ? 'Homework' : 'Live'}
                    </span>
                  </span>
                  <StatusDot state={quiz.state} deadline={quiz.open_run?.deadline} tip={false} />
                </Link>
              </li>
            ))}
          </RecentPanel>
        </div>
      </div>
    </div>
  );
}
