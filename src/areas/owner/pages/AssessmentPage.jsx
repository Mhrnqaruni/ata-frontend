// One assessment (/owner/assessments/:assessment_id) as a log: its students, answers and marks as MST stores
// them, its AI tasks, and its set-up (design §3.6; R8). Deleted ones open too, marked so.
// Area: owner

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Button } from '@mui/material';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import TaskAltOutlined from '@mui/icons-material/TaskAltOutlined';
import RateReviewOutlined from '@mui/icons-material/RateReviewOutlined';
import TokenOutlined from '@mui/icons-material/TokenOutlined';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import PageHeader from '../../../components/common/PageHeader';
import StatusChip from '../../../components/assessments/StatusChip';
import { OutcomeChip, Tag } from '../components/Chips';
import OwnerTable from '../components/OwnerTable';
import { LoadError, Loading } from '../components/PageState';
import SectionBar from '../components/SectionBar';
import StatTile from '../components/StatTile';
import StudentMarks from '../components/StudentMarks';
import TextViewer from '../components/TextViewer';
import { cost, count, day, duration, time, tokens } from '../format';
import { taskLink, useAssessment } from '../ownerQueries';
import usePageTitle from '../usePageTitle';

const SECTIONS = [
  { id: 'students', label: 'Students and marks' },
  { id: 'tasks', label: 'AI tasks' },
  { id: 'setup', label: 'Set-up' },
];

const TASK_COLUMNS = [
  { key: 'title', label: 'Task', className: 'owner-pin', grow: true },
  { key: 'when', label: 'When (UTC)', render: (task) => time(task.started_at) },
  { key: 'duration', label: 'Duration', numeric: true, render: (task) => duration(task.duration_s) },
  { key: 'tokens', label: 'Tokens', numeric: true, render: (task) => tokens(task.tokens) },
  { key: 'cost', label: 'Estimated cost', numeric: true, render: (task) => cost(task.cost_usd) },
  { key: 'outcome', label: 'Outcome', render: (task) => <OutcomeChip outcome={task.outcome} /> },
];

export default function AssessmentPage() {
  const { assessment_id: id } = useParams();
  const { data: assessment, error, isLoading, refetch } = useAssessment(id);
  const [expanded, setExpanded] = useState(undefined);
  const name = assessment?.name || 'Assessment';
  usePageTitle(name);
  const back = '/owner/assessments';
  if (isLoading || error) {
    return (
      <>
        <PageHeader backLabel="Assessments" backTo={back} title={name} />
        {error ? <LoadError error={error} retry={refetch} /> : <Loading />}
      </>
    );
  }
  const where = [assessment.teacher_name, assessment.class_name, `created ${day(assessment.created_at)}`].filter(
    Boolean
  );
  const { setup } = assessment;
  return (
    <>
      <PageHeader
        backLabel="Assessments"
        backTo={back}
        breadcrumbs={[{ label: 'Assessments', to: back }, { label: name }]}
        subtitle={where.join(' · ')}
        title={name}
        titleAdornment={
          <>
            <StatusChip status={assessment.status} />
            {assessment.quick ? <Tag>Quick</Tag> : null}
            {assessment.deleted_at ? <Tag>Deleted {day(assessment.deleted_at)}</Tag> : null}
          </>
        }
      />
      {assessment.status === 'Failed' ? (
        <Alert className="owner-problem-alert" severity="error">
          Failed: {assessment.failure_code || 'no reason was kept'}.
        </Alert>
      ) : null}
      <div className="owner-tiles">
        <StatTile icon={GroupsOutlined} label="Students" value={count(assessment.students_count)} />
        <StatTile icon={TaskAltOutlined} label="Answers marked" value={count(assessment.answers_marked)} />
        <StatTile
          icon={RateReviewOutlined}
          label="Held for the teacher"
          tone={assessment.held ? 'warn' : undefined}
          value={count(assessment.held)}
        />
        <StatTile icon={TokenOutlined} label="Tokens" value={tokens(assessment.tokens, { short: true })} />
        <StatTile icon={PaymentsOutlined} label="Estimated cost" value={cost(assessment.cost_usd ?? 0)} />
      </div>
      <SectionBar sections={SECTIONS} />
      <section className="owner-card owner-section owner-anchor" id="students">
        <header className="mst-card-head owner-card-head">
          <h2>Students and marks</h2>
          <span className="owner-head-actions">
            <Button data-mst="owner-expand-all" onClick={() => setExpanded(true)} size="small">
              Expand all
            </Button>
            <Button onClick={() => setExpanded(false)} size="small">
              Collapse all
            </Button>
          </span>
        </header>
        <StudentMarks assessmentId={assessment.assessment_id} expanded={expanded} students={assessment.students} />
      </section>
      <section className="owner-card owner-section owner-anchor" id="tasks">
        <header className="mst-card-head owner-card-head">
          <h2>AI tasks</h2>
        </header>
        <OwnerTable
          columns={TASK_COLUMNS}
          empty="No AI task was recorded for this assessment."
          label="AI tasks"
          rowKey={(task) => `${task.task_kind}:${task.task_id}`}
          rowTo={(task) => taskLink(task.task_kind, task.task_id)}
          rows={assessment.ai_tasks}
        />
      </section>
      <section className="owner-card owner-section owner-anchor" id="setup">
        <header className="mst-card-head owner-card-head">
          <h2>Set-up</h2>
        </header>
        <div className="owner-content">
          <TextViewer expanded={expanded} title="Question paper as read" value={setup.question_paper} />
          <TextViewer expanded={expanded} title="Answer key" value={setup.answer_key} />
          <TextViewer expanded={expanded} title="Grading contract" value={setup.grading_contract} />
        </div>
      </section>
    </>
  );
}
