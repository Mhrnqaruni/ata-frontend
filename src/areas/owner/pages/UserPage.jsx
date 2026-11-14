// One account (/owner/users/:user_id): who they are, their AI use and problems in the range, and what they made.
// AI use comes first, then problems, then each mode's records, all time (design §3.4, §10 A13, A14).
// Area: owner

import { useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Tooltip } from '@mui/material';
import DataUsageOutlined from '@mui/icons-material/DataUsageOutlined';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import TokenOutlined from '@mui/icons-material/TokenOutlined';
import ReportProblemOutlined from '@mui/icons-material/ReportProblemOutlined';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import PageHeader from '../../../components/common/PageHeader';
import StatusChip from '../../../components/assessments/StatusChip';
import ChartCard from '../components/ChartCard';
import { KindChip, OutcomeChip, Tag } from '../components/Chips';
import DataNote from '../components/DataNote';
import OwnerTable from '../components/OwnerTable';
import { LoadError, Loading } from '../components/PageState';
import RangeMenu from '../components/RangeMenu';
import RankedList from '../components/RankedList';
import SectionBar from '../components/SectionBar';
import StatTile from '../components/StatTile';
import { cost, count, day, relative, sentenceCase, time, tokens } from '../format';
import { problemLink, taskLink, useUser } from '../ownerQueries';
import usePageTitle from '../usePageTitle';
import useRange from '../useRange';

const SECTIONS = { ai: 'AI use', problems: 'Problems', teaching: 'Teaching', parent: 'Parent' };
const KINDS = {
  check: 'Check',
  flashcards: 'Flashcards',
  learn: 'Learn',
  mindmap: 'Mind map',
  quiz: 'Quiz',
  story: 'Story',
};
const ACTIVITY_STATES = { completed: 'done', failed: 'failed' };

function Section({ id, title, note, link, children }) {
  return (
    <section className="owner-card owner-section owner-anchor" id={id}>
      <header className="mst-card-head owner-card-head">
        <h2>
          {title} {note ? <span className="owner-head-note">{note}</span> : null}
        </h2>
        {link}
      </header>
      {children}
    </section>
  );
}

const SeeAll = ({ to, children = 'See all' }) => (
  <Link className="mst-panel-link" to={to}>
    {children} <ChevronRightRounded aria-hidden="true" />
  </Link>
);

const Minis = ({ items }) => (
  <div className="mst-minis owner-minis">
    {items.map((item) => (
      <div className="mst-mini" key={item.key}>
        <span className="mst-mini-value">{count(item.value)}</span>
        <span className="mst-mini-label">{item.label}</span>
      </div>
    ))}
  </div>
);

function Teaching({ user, range }) {
  return (
    <Section id="teaching" note="All time" title="Teaching">
      <Minis items={user.teaching} />
      <h3 className="owner-subhead">Classes</h3>
      <OwnerTable
        columns={[
          { key: 'name', label: 'Class', className: 'owner-pin', grow: true },
          { key: 'students', label: 'Students', numeric: true, render: (row) => count(row.students) },
          { key: 'assessments', label: 'Assessments', numeric: true, render: (row) => count(row.assessments) },
        ]}
        empty="No classes yet."
        label="Classes"
        rowKey={(row) => row.class_id}
        rows={user.classes}
      />
      <h3 className="owner-subhead">
        Recent assessments <SeeAll to={range.linkTo('/owner/assessments', { user_id: user.user_id })} />
      </h3>
      <OwnerTable
        columns={[
          {
            key: 'name',
            label: 'Assessment',
            className: 'owner-pin',
            grow: true,
            render: (row) => row.name || 'Untitled',
          },
          { key: 'class_name', label: 'Class', render: (row) => row.class_name || '—' },
          { key: 'status', label: 'Status', render: (row) => <StatusChip status={row.status} /> },
          { key: 'students', label: 'Students', numeric: true, render: (row) => count(row.students) },
          { key: 'created_at', label: 'Created', render: (row) => day(row.created_at) },
        ]}
        empty="No assessments yet."
        label="Recent assessments"
        rowKey={(row) => row.assessment_id}
        rowTo={(row) => `/owner/assessments/${encodeURIComponent(row.assessment_id)}`}
        rows={user.recent_assessments}
      />
    </Section>
  );
}

function Parent({ user }) {
  return (
    <Section id="parent" note="All time" title="Parent">
      <Minis items={user.parent} />
      <h3 className="owner-subhead">Children</h3>
      <OwnerTable
        columns={[
          { key: 'name', label: 'Child', className: 'owner-pin', grow: true },
          { key: 'activities', label: 'Activities', numeric: true, render: (row) => count(row.activities) },
        ]}
        empty="No children yet."
        label="Children"
        rowKey={(row) => row.child_id}
        rows={user.children}
      />
      <h3 className="owner-subhead">Recent activities</h3>
      <OwnerTable
        columns={[
          {
            key: 'kind',
            label: 'Activity',
            className: 'owner-pin',
            grow: true,
            render: (row) => KINDS[row.kind] || row.kind,
          },
          { key: 'child_name', label: 'Child', render: (row) => row.child_name || '—' },
          { key: 'created_at', label: 'When', render: (row) => time(row.created_at) },
          {
            key: 'status',
            label: 'Outcome',
            render: (row) =>
              ACTIVITY_STATES[row.status] ? (
                <OutcomeChip outcome={ACTIVITY_STATES[row.status]} />
              ) : (
                <Tag>{row.status}</Tag>
              ),
          },
        ]}
        empty="No activities yet."
        label="Recent activities"
        rowKey={(row) => row.activity_id}
        rowTo={(row) => taskLink('family_activity', row.activity_id)}
        rows={user.recent_activities}
      />
    </Section>
  );
}

export default function UserPage() {
  const { user_id: id } = useParams();
  const range = useRange();
  const { data: user, error, isLoading, isPlaceholderData, refetch } = useUser(id, range.query);
  const name = user ? user.name || user.email : 'User';
  usePageTitle(name);
  const back = range.linkTo('/owner/users');
  const { hash } = useLocation();
  // A search result opens the page at its section (#teaching, #parent) once the page has loaded.
  const loaded = Boolean(user);
  useEffect(() => {
    if (hash && loaded) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [hash, loaded]);
  if (isLoading || error) {
    return (
      <>
        <PageHeader backLabel="Users" backTo={back} title={name} />
        {error ? <LoadError error={error} retry={refetch} /> : <Loading />}
      </>
    );
  }
  return (
    <>
      <PageHeader
        actions={<RangeMenu />}
        backLabel="Users"
        backTo={back}
        breadcrumbs={[{ label: 'Users', to: back }, { label: name }]}
        subtitle={user.email}
        title={name}
        titleAdornment={user.modes.map((mode) => (
          <Tag key={mode}>{mode === 'teacher' ? 'Teacher' : 'Parent'}</Tag>
        ))}
      />
      <p className="owner-facts">
        <span>Joined {day(user.created_at)}</span>
        <Tooltip title={user.last_active ? `${time(user.last_active)} UTC` : ''}>
          <span>Last active {sentenceCase(relative(user.last_active))}</span>
        </Tooltip>
        {user.organization ? <span>Organization: {user.organization}</span> : null}
      </p>
      <DataNote completeFrom={user.complete_from} start={range.start} />
      <div className="owner-refreshing" data-refreshing={isPlaceholderData ? 'true' : undefined}>
        <div className="owner-tiles" data-count="4">
          <StatTile icon={DataUsageOutlined} label="AI tasks" value={count(user.ai_tasks)} />
          <StatTile icon={PaymentsOutlined} label="Estimated cost" value={cost(user.cost_usd ?? 0)} />
          <StatTile icon={TokenOutlined} label="Tokens" value={tokens(user.tokens, { short: true })} />
          <StatTile
            icon={ReportProblemOutlined}
            label="Problems"
            to="#problems"
            tone={user.problems ? 'warn' : undefined}
            value={count(user.problems)}
          />
        </div>
        <SectionBar sections={user.sections.map((key) => ({ id: key, label: SECTIONS[key] }))} />
        <Section
          id="ai"
          link={
            <SeeAll to={range.linkTo('/owner/ai', { user_id: user.user_id })}>
              All {count(user.ai_tasks)} AI tasks
            </SeeAll>
          }
          note={range.label}
          title="AI use"
        >
          <div className="owner-grid owner-inner-grid">
            <div className="owner-span-6">
              <ChartCard
                completeFrom={user.complete_from}
                format={cost}
                lines={(point) => [`${count(point.tasks)} AI tasks`, `${tokens(point.tokens, { short: true })} tokens`]}
                points={user.ai_by_day.map((g) => ({
                  day: g.key,
                  value: Number(g.cost_usd || 0),
                  tasks: g.tasks,
                  tokens: g.tokens,
                }))}
                title="Estimated cost per day"
              />
            </div>
            <div className="owner-span-6">
              <RankedList
                empty={`No AI use ${range.during}.`}
                rows={user.ai_by_category.map((g) => ({
                  key: g.key,
                  label: g.label,
                  figure: cost(g.cost_usd),
                  share: g.share,
                  to: range.linkTo('/owner/ai', { user_id: user.user_id, category: g.key }),
                }))}
                title="By category"
              />
            </div>
          </div>
          <h3 className="owner-subhead">Costliest tasks</h3>
          <OwnerTable
            columns={[
              { key: 'title', label: 'Task', className: 'owner-pin', grow: true },
              { key: 'when', label: 'When (UTC)', render: (task) => time(task.started_at) },
              { key: 'tokens', label: 'Tokens', numeric: true, render: (task) => tokens(task.tokens) },
              { key: 'cost', label: 'Estimated cost', numeric: true, render: (task) => cost(task.cost_usd) },
              { key: 'outcome', label: 'Outcome', render: (task) => <OutcomeChip outcome={task.outcome} /> },
            ]}
            empty={`No AI use ${range.during}.`}
            label="Costliest tasks"
            rowKey={(task) => `${task.task_kind}:${task.task_id}`}
            rowTo={(task) => taskLink(task.task_kind, task.task_id)}
            rows={user.costliest_tasks}
          />
        </Section>
        <Section
          id="problems"
          link={user.problems ? <SeeAll to={range.linkTo('/owner/problems', { user_id: user.user_id })} /> : null}
          title="Problems"
        >
          <OwnerTable
            columns={[
              { key: 'reason', label: 'Reason', className: 'owner-pin owner-wrap', render: (p) => p.reason_label },
              { key: 'kind', label: 'Kind', render: (p) => <KindChip kind={p.kind} /> },
              { key: 'title', label: 'Task', grow: true, render: (p) => p.title },
              { key: 'when', label: 'When (UTC)', render: (p) => time(p.started_at) },
            ]}
            empty={`No problems ${range.during}.`}
            label="Problems"
            rowKey={(p) => `${p.task_kind}:${p.task_id}`}
            rowTo={problemLink}
            rows={user.latest_problems}
          />
        </Section>
        {user.sections.includes('teaching') ? <Teaching range={range} user={user} /> : null}
        {user.sections.includes('parent') ? <Parent user={user} /> : null}
      </div>
    </>
  );
}
