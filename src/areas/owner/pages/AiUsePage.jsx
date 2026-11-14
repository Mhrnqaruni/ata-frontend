// AI use (/owner/ai): how much AI, when, on what and by whom, and every task, newest or costliest first (§3.7).
// A category or a user filters the whole page, from a row, a link or the address; costs are estimates.
// Area: owner

import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Chip } from '@mui/material';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import TokenOutlined from '@mui/icons-material/TokenOutlined';
import DataUsageOutlined from '@mui/icons-material/DataUsageOutlined';
import ReportProblemOutlined from '@mui/icons-material/ReportProblemOutlined';
import PageHeader from '../../../components/common/PageHeader';
import ChartCard from '../components/ChartCard';
import { CostNote, FilledInTag, OutcomeChip } from '../components/Chips';
import CostNotes from '../components/CostNotes';
import DataNote from '../components/DataNote';
import OwnerTable from '../components/OwnerTable';
import { LoadError, Loading } from '../components/PageState';
import RangeMenu from '../components/RangeMenu';
import StatTile from '../components/StatTile';
import WhereItGoes from '../components/WhereItGoes';
import { cost, count, duration, time, tokens } from '../format';
import { taskLink, useAiSummary, useAiTasks, useProblems } from '../ownerQueries';
import usePageTitle from '../usePageTitle';
import useRange, { capital } from '../useRange';

const SORTS = ['cost', 'tokens', 'duration'];

// Every day from the first to the last, with a zero day where nothing ran, so the chart never skips one.
function everyDay(groups, start, end) {
  const found = Object.fromEntries(groups.map((group) => [group.key, group]));
  const first = start || groups[0]?.key || end;
  const days = [];
  for (let at = Date.parse(`${first}T00:00:00Z`); at <= Date.parse(`${end}T00:00:00Z`); at += 86400000) {
    const key = new Date(at).toISOString().slice(0, 10);
    const group = found[key];
    days.push({ day: key, value: Number(group?.cost_usd || 0), tasks: group?.tasks || 0, tokens: group?.tokens || 0 });
  }
  return days;
}

function columns(userLink) {
  return [
    { key: 'when', label: 'When (UTC)', className: 'owner-pin', render: (task) => time(task.started_at) },
    {
      key: 'title',
      label: 'Task',
      grow: true,
      render: (task) => (
        <span className="owner-task-title">
          <span className="owner-clip" title={task.title}>
            {task.title}
          </span>
          {task.filled_in ? <FilledInTag /> : null}
        </span>
      ),
    },
    { key: 'category', label: 'Category', render: (task) => task.category_label },
    {
      key: 'user',
      label: 'User',
      render: (task) =>
        task.user_id ? (
          <Link className="owner-link" onClick={(event) => event.stopPropagation()} to={userLink(task.user_id)}>
            {task.user_name}
          </Link>
        ) : (
          <span className="owner-dash">User unknown</span>
        ),
    },
    { key: 'duration', label: 'Duration', numeric: true, sortable: true, render: (task) => duration(task.duration_s) },
    { key: 'tokens', label: 'Tokens', numeric: true, sortable: true, render: (task) => tokens(task.tokens) },
    {
      key: 'cost',
      label: 'Estimated cost',
      numeric: true,
      sortable: true,
      render: (task) =>
        task.cost_usd === null && task.cost_unknown ? <CostNote status="unknown" /> : cost(task.cost_usd),
    },
    { key: 'outcome', label: 'Outcome', render: (task) => <OutcomeChip outcome={task.outcome} /> },
  ];
}

export default function AiUsePage() {
  usePageTitle('AI use');
  const range = useRange();
  const [params, setParams] = useSearchParams();
  const [by, setBy] = useState('category');
  const category = params.get('category') || undefined;
  const userId = params.get('user_id') || undefined;
  const sortKey = SORTS.includes(params.get('sort')) ? params.get('sort') : undefined;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const filters = { ...range.query, category, user_id: userId };
  const summary = useAiSummary({ ...filters, group_by: by });
  const days = useAiSummary({ ...filters, group_by: 'day' });
  const list = useAiTasks({ ...filters, sort: sortKey || 'time', page });
  const problems = useProblems({ ...range.query, user_id: userId });

  // Changes the address's filters, sort or page; a new filter or sort starts again at page 1.
  const set = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, String(value)) : next.delete(key)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const header = (
    <PageHeader actions={<RangeMenu />} subtitle="Where the AI goes. Costs are estimates." title="AI use" />
  );
  const failed = summary.error || days.error || list.error;
  if (failed || !summary.data || !days.data || !list.data) {
    return (
      <>
        {header}
        {failed ? (
          <LoadError error={failed} retry={() => [summary, days, list].forEach((q) => q.refetch())} />
        ) : (
          <Loading />
        )}
      </>
    );
  }
  const total = summary.data.total;
  const categoryLabel = by === 'category' ? summary.data.groups.find((g) => g.key === category)?.label : null;
  const userName = list.data.items.find((task) => task.user_id === userId)?.user_name;
  const userLink = (id) => range.linkTo(`/owner/users/${id}`);
  return (
    <>
      {header}
      <DataNote completeFrom={summary.data.complete_from} start={range.start} />
      {category || userId ? (
        <div className="owner-filters">
          {category ? (
            <Chip label={`Category: ${categoryLabel || category}`} onDelete={() => set({ category: null })} />
          ) : null}
          {userId ? <Chip label={`User: ${userName || 'this user'}`} onDelete={() => set({ user_id: null })} /> : null}
        </div>
      ) : null}
      <div
        className="owner-tiles"
        data-count="4"
        data-refreshing={summary.isPlaceholderData || problems.isPlaceholderData ? 'true' : undefined}
      >
        <StatTile icon={PaymentsOutlined} label="Estimated cost" value={cost(total.cost_usd ?? 0)} />
        <StatTile
          context={`${tokens(total.cached_tokens, { short: true })} cached`}
          icon={TokenOutlined}
          label="Tokens"
          value={tokens(total.tokens, { short: true })}
        />
        <StatTile
          context={`${count(total.calls)} AI calls`}
          hint="A task is one piece of work, such as marking an assessment. It can make several AI calls."
          icon={DataUsageOutlined}
          label="AI tasks"
          value={count(total.tasks)}
        />
        <StatTile
          context={category ? 'In every category' : capital(range.during)}
          icon={ReportProblemOutlined}
          label="Problems"
          to={range.linkTo('/owner/problems', { user_id: userId })}
          tone={problems.data?.total ? 'warn' : undefined}
          value={problems.data ? count(problems.data.total) : '—'}
        />
      </div>
      <div className="owner-grid">
        <div className="owner-span-12" data-refreshing={days.isPlaceholderData ? 'true' : undefined}>
          <ChartCard
            completeFrom={summary.data.complete_from}
            format={cost}
            lines={(point) => [`${count(point.tasks)} AI tasks`, `${tokens(point.tokens, { short: true })} tokens`]}
            points={everyDay(days.data.groups, range.start, range.end)}
            title={categoryLabel ? `${categoryLabel}: estimated cost per day` : 'Estimated cost per day'}
          />
        </div>
        <div className="owner-span-12" data-refreshing={summary.isPlaceholderData ? 'true' : undefined}>
          <WhereItGoes
            by={by}
            empty={`No AI use ${range.during}.`}
            groups={summary.data.groups}
            onBy={setBy}
            onPick={(group) => set(by === 'category' ? { category: group.key } : { user_id: group.key })}
            total={total}
            userLink={userLink}
          />
        </div>
      </div>
      <OwnerTable
        columns={columns(userLink)}
        empty={`No AI use ${range.during}.`}
        label="AI tasks"
        onPage={(next) => set({ page: next })}
        onSort={(next) => set({ sort: next && next.order === 'desc' ? next.key : null })}
        page={{ page, pageSize: list.data.page_size, total: list.data.total }}
        refreshing={list.isPlaceholderData}
        rowKey={(task) => `${task.task_kind}:${task.task_id}`}
        rowTo={(task) => taskLink(task.task_kind, task.task_id)}
        rows={list.data.items}
        sort={sortKey ? { key: sortKey, order: 'desc' } : null}
        toolbar={<h2 className="owner-card-title">AI tasks</h2>}
      />
      <CostNotes />
    </>
  );
}
