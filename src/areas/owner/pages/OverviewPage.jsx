// The admin panel's overview (/owner): how many people use MST, what the AI costs, where it goes, what went wrong.
// Five tiles with their change, two charts and three lists, each opening its page (design §3.2, §10 A1, A4–A8).
// Area: owner

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import PeopleOutline from '@mui/icons-material/PeopleOutline';
import PersonAddAltOutlined from '@mui/icons-material/PersonAddAltOutlined';
import DataUsageOutlined from '@mui/icons-material/DataUsageOutlined';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import ReportProblemOutlined from '@mui/icons-material/ReportProblemOutlined';
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import PageHeader from '../../../components/common/PageHeader';
import ChartCard from '../components/ChartCard';
import { KindChip } from '../components/Chips';
import DataNote from '../components/DataNote';
import { Empty, LoadError, Loading } from '../components/PageState';
import RangeMenu from '../components/RangeMenu';
import RankedList from '../components/RankedList';
import StatTile, { changeOf } from '../components/StatTile';
import { cost, count, time, tokens } from '../format';
import { problemLink, useOverview } from '../ownerQueries';
import usePageTitle from '../usePageTitle';
import useRange from '../useRange';

const TOP = 5;
const KIND_WORDS = {
  failed: (n) => `${n} failed`,
  partly_failed: (n) => `${n} partly failed`,
  slow: (n) => `${n} slow`,
  data_gap: (n) => `${n} data ${n === 1 ? 'gap' : 'gaps'}`,
};
const SERIES = {
  daily: 'Days are in UTC.',
  weekly: 'Weekly means active in the last 7 days. Days are in UTC.',
  monthly: 'Monthly means active in the last 30 days. Days are in UTC.',
};

// "On the previous 30 days": the period as long as the range, just before it.
const periodOf = (range) => {
  if (!range.start) return null;
  const days = Math.round((Date.parse(range.end) - Date.parse(range.start)) / 86400000) + 1;
  return days === 1 ? 'day' : `${days} days`;
};

// The two largest kinds, then "{n} more" (A5); "All clear" with nothing.
function problemsLine(counts) {
  const kinds = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  if (!kinds.length) return null;
  const named = kinds.slice(0, 2).map(([kind, n]) => KIND_WORDS[kind](n));
  const rest = kinds.slice(2).reduce((sum, [, n]) => sum + n, 0);
  return [...named, rest ? `${rest} more` : null].filter(Boolean).join(' · ');
}

// A list's top rows, then one row for the rest, so it adds up to its total (A8).
function topAndRest(groups, total, label, toOf) {
  const shown = groups.slice(0, TOP);
  const rows = shown.map((group) => ({
    key: group.key || 'none',
    label: group.label,
    figure: cost(group.cost_usd),
    share: group.share,
    to: group.key ? toOf(group) : null,
    muted: !group.key,
    hint: group.key ? undefined : "This call's user wasn't recorded. It's counted in the totals.",
  }));
  if (groups.length <= TOP) return { rows, other: null };
  const restCost = Number(total.cost_usd || 0) - shown.reduce((sum, g) => sum + Number(g.cost_usd || 0), 0);
  const restShare = Math.max(0, 1 - shown.reduce((sum, g) => sum + g.share, 0));
  return { rows, other: { label, figure: cost(restCost), share: restShare } };
}

function LatestProblems({ problems, seeAll }) {
  return (
    <section className="owner-card owner-rank">
      <header className="mst-panel-head">
        <h2 className="owner-card-title">Needs attention</h2>
        <Link className="mst-panel-link" to={seeAll}>
          See all <ChevronRightRounded aria-hidden="true" />
        </Link>
      </header>
      {problems.length ? (
        <ul className="owner-problems-mini">
          {problems.map((problem) => {
            const to = problemLink(problem);
            const body = (
              <>
                <span className="owner-problem-reason">{problem.reason_label}</span>
                <KindChip kind={problem.kind} />
                <span className="owner-problem-when">{time(problem.started_at)}</span>
              </>
            );
            return (
              <li key={`${problem.task_kind}:${problem.task_id}`}>
                {to ? (
                  <Link className="owner-problem-row" to={to}>
                    {body}
                  </Link>
                ) : (
                  <div className="owner-problem-row">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mst-panel-empty owner-all-clear">
          <CheckCircleOutlineRounded aria-hidden="true" /> Nothing needs attention
        </p>
      )}
    </section>
  );
}

export default function OverviewPage() {
  usePageTitle('Overview');
  const range = useRange();
  const [series, setSeries] = useState('daily');
  const { data, error, isLoading, isPlaceholderData, refetch } = useOverview(range.query);
  const header = <PageHeader actions={<RangeMenu />} title="Overview" />;
  if (isLoading || error) {
    return (
      <>
        {header}
        {error ? <LoadError error={error} retry={refetch} /> : <Loading />}
      </>
    );
  }

  const { current, previous, accounts, problem_counts: counts } = data;
  const period = periodOf(range);
  const compare = { previousStart: data.previous_start, completeFrom: data.complete_from, period };
  const problems = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const where = topAndRest(data.categories, current, 'Other', (g) => range.linkTo('/owner/ai', { category: g.key }));
  const who = topAndRest(data.top_users, current, 'Everyone else', (g) => range.linkTo(`/owner/users/${g.key}`));
  const quiet = !current.calls && !current.people_active && !current.signups.accounts;
  return (
    <>
      {header}
      <DataNote completeFrom={data.complete_from} start={range.start} />
      <div className="owner-tiles" data-refreshing={isPlaceholderData ? 'true' : undefined}>
        <StatTile
          change={previous && changeOf(current.people_active, previous.people_active, compare)}
          context={`of ${count(accounts.accounts)} accounts`}
          icon={PeopleOutline}
          label="People active"
          to={range.linkTo('/owner/users', { sort: 'last_active' })}
          value={count(current.people_active)}
        />
        <StatTile
          change={previous && changeOf(current.signups.accounts, previous.signups.accounts, compare)}
          context={`${count(current.signups.teachers)} teachers · ${count(current.signups.parents)} parents${
            current.signups.both ? ` (${count(current.signups.both)} have both)` : ''
          }`}
          icon={PersonAddAltOutlined}
          label="New sign-ups"
          to={range.linkTo('/owner/users', { sort: 'created' })}
          value={count(current.signups.accounts)}
        />
        <StatTile
          change={previous && changeOf(current.tasks, previous.tasks, compare)}
          context={`${count(current.calls)} AI calls`}
          hint="A task is one piece of work, such as marking an assessment. It can make several AI calls."
          icon={DataUsageOutlined}
          label="AI tasks"
          to={range.linkTo('/owner/ai')}
          value={count(current.tasks)}
        />
        <StatTile
          change={previous && changeOf(current.cost_usd, previous.cost_usd, { ...compare, percent: true })}
          context={`${tokens(current.tokens, { short: true })} tokens`}
          icon={PaymentsOutlined}
          label="Estimated AI cost"
          to={range.linkTo('/owner/ai')}
          value={cost(current.cost_usd ?? 0)}
        />
        <StatTile
          context={problemsLine(counts) || 'All clear'}
          icon={ReportProblemOutlined}
          label="Needs attention"
          tone={problems > 0 ? 'warn' : undefined}
          to={range.linkTo('/owner/problems')}
          value={count(problems)}
        />
      </div>
      {quiet ? (
        <Empty allTime={range.key === 'all' ? null : '/owner?range=all'} title={`No AI use ${range.during}.`} />
      ) : null}
      <div className="owner-grid" data-refreshing={isPlaceholderData ? 'true' : undefined}>
        <div className="owner-span-6">
          <ChartCard
            action={
              <ToggleButtonGroup exclusive onChange={(_, next) => next && setSeries(next)} size="small" value={series}>
                <ToggleButton value="daily">Daily</ToggleButton>
                <ToggleButton value="weekly">Weekly</ToggleButton>
                <ToggleButton value="monthly">Monthly</ToggleButton>
              </ToggleButtonGroup>
            }
            caption={SERIES[series]}
            completeFrom={data.complete_from}
            format={count}
            points={data.activity.map((point) => ({ day: point.day, value: point[series] }))}
            title="People active"
          />
        </div>
        <div className="owner-span-6">
          <ChartCard
            axisFormat={cost}
            completeFrom={data.complete_from}
            format={cost}
            lines={(point) => [`${count(point.tasks)} AI tasks`, `${tokens(point.tokens, { short: true })} tokens`]}
            points={data.cost_by_day.map((g) => ({
              day: g.key,
              value: Number(g.cost_usd || 0),
              tasks: g.tasks,
              tokens: g.tokens,
            }))}
            title="Estimated AI cost per day"
          />
        </div>
      </div>
      <div className="owner-grid" data-refreshing={isPlaceholderData ? 'true' : undefined}>
        <div className="owner-span-4">
          <RankedList
            empty={`No AI use ${range.during}.`}
            other={where.other}
            rows={where.rows}
            seeAll={range.linkTo('/owner/ai')}
            title="Where the AI goes"
          />
        </div>
        <div className="owner-span-4">
          <RankedList
            empty={`No AI use ${range.during}.`}
            other={who.other}
            rows={who.rows}
            seeAll={range.linkTo('/owner/users', { sort: 'cost' })}
            title="Most AI use"
          />
        </div>
        <div className="owner-span-4">
          <LatestProblems problems={data.latest_problems} seeAll={range.linkTo('/owner/problems')} />
        </div>
      </div>
    </>
  );
}
