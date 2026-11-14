// One AI task (/owner/ai/tasks/:task_kind/:task_id) as a log: what went wrong, what happened, each call (§3.8).
// In A9's order: the problem, what happened, the tiles, the calls, then everything MST kept, as plain text.
// Area: owner

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button } from '@mui/material';
import ScheduleRounded from '@mui/icons-material/ScheduleRounded';
import DataUsageOutlined from '@mui/icons-material/DataUsageOutlined';
import TokenOutlined from '@mui/icons-material/TokenOutlined';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import PageHeader from '../../../components/common/PageHeader';
import { CostNote, FilledInTag, OutcomeChip } from '../components/Chips';
import LogTimeline from '../components/LogTimeline';
import { LoadError, Loading } from '../components/PageState';
import StatTile from '../components/StatTile';
import TextViewer from '../components/TextViewer';
import { cost, count, duration, time, tokens } from '../format';
import { useAiTask } from '../ownerQueries';
import usePageTitle from '../usePageTitle';

const FIRST_CALLS = 50;
const sum = (calls, key) => calls.reduce((total, call) => total + (call[key] || 0), 0);
const hhmm = (value) => time(value).split(', ')[1];

// The payloads "What happened" already shows, so Content doesn't repeat them.
const SHOWN = { ai_tool_request: ['request', 'output'] };

// "1 student", "3 students".
const some = (n, one, many) => `${count(n)} ${n === 1 ? one : many}`;

// A marking run in one sentence, whose verb follows its outcome (design review D2): it never says "Marked" when
// the run failed.
function MarkingRun({ task, summary }) {
  const to = `/owner/assessments/${encodeURIComponent(summary.assessment_id)}`;
  const counts = `${some(summary.students, 'student', 'students')}, ${some(summary.answers, 'answer', 'answers')}`;
  if (task.outcome === 'failed') {
    return (
      <p className="owner-happened">
        Marking stopped.{' '}
        <Link className="owner-link" to={to}>
          The assessment
        </Link>
        : {counts}.
      </p>
    );
  }
  return (
    <p className="owner-happened">
      Marked{' '}
      <Link className="owner-link" to={to}>
        the assessment
      </Link>
      {task.outcome === 'partly_failed' ? ', with answers held' : ''}: {counts}, {count(summary.held)} held for the
      teacher.
    </p>
  );
}

function WhatHappened({ task }) {
  const { summary, content } = task;
  if (task.task_kind === 'assessment' && summary.assessment_id) return <MarkingRun summary={summary} task={task} />;
  if (task.task_kind === 'ai_tool_request') {
    return (
      <div className="owner-happened">
        <TextViewer expanded title="The teacher's request" value={content.request} />
        <TextViewer expanded title="The AI's output" value={content.output?.content ?? content.output} />
      </div>
    );
  }
  if (task.task_kind === 'dictation') {
    return (
      <p className="owner-happened">
        {summary.expired ? 'The transcript has expired.' : 'The transcript is under Content.'}
      </p>
    );
  }
  if (summary.note) return <p className="owner-happened">{summary.note}</p>;
  if (summary.messages !== undefined)
    return <p className="owner-happened">{count(summary.messages)} messages in the chat.</p>;
  return <p className="owner-happened">Each call and what MST kept are below. Prompts aren&apos;t kept.</p>;
}

// The AI calls tile's line (A10): "1 busy, re-sent" for a recovered task, else how many failed.
function callsLine(task) {
  const busy = task.timeline.filter((call) => call.http_status === 429).length;
  if (task.outcome === 'recovered' && busy) return `${busy} busy, re-sent`;
  const failed = task.timeline.filter((call) => call.outcome !== 'response').length;
  return failed ? `${count(failed)} without an answer` : 'All answered';
}

function CostTile({ task }) {
  const status = task.timeline.some((call) => call.cost_status === 'no_price') ? 'no_price' : 'unknown';
  const unknown = task.cost_usd === null || task.cost_usd === undefined;
  return (
    <StatTile
      context={!unknown && task.cost_unknown ? "Some calls' cost can't be known" : null}
      icon={PaymentsOutlined}
      label="Estimated cost"
      tone={unknown && task.cost_unknown ? 'warn' : undefined}
      value={unknown && task.cost_unknown ? <CostNote status={status} /> : cost(task.cost_usd ?? 0)}
    />
  );
}

export default function AiTaskPage() {
  const { task_kind: kind, task_id: id } = useParams();
  const { data: task, error, isLoading, refetch } = useAiTask(kind, id);
  const [expanded, setExpanded] = useState(undefined);
  const [allCalls, setAllCalls] = useState(false);
  usePageTitle(task?.title || 'AI task');
  if (isLoading || error) {
    return (
      <>
        <PageHeader backLabel="AI use" backTo="/owner/ai" title="AI task" />
        {error ? <LoadError error={error} retry={refetch} /> : <Loading />}
      </>
    );
  }
  const calls = allCalls ? task.timeline : task.timeline.slice(0, FIRST_CALLS);
  const shown = SHOWN[task.task_kind] || [];
  const payloads = Object.entries(task.content).filter(([key]) => !shown.includes(key));
  const who = [task.user_name || 'User unknown', task.organization, `${time(task.started_at)} UTC`].filter(Boolean);
  return (
    <>
      <PageHeader
        backLabel="AI use"
        backTo="/owner/ai"
        breadcrumbs={[{ label: 'AI use', to: '/owner/ai' }, { label: task.title }]}
        subtitle={who.join(' · ')}
        title={task.title}
        titleAdornment={
          <>
            <OutcomeChip outcome={task.outcome} />
            {task.filled_in ? <FilledInTag /> : null}
          </>
        }
      />
      {task.problem ? (
        <Alert className="owner-problem-alert" severity={task.outcome === 'failed' ? 'error' : 'warning'}>
          {task.problem}
        </Alert>
      ) : null}
      <section className="owner-card owner-section">
        <header className="mst-card-head owner-card-head">
          <h2>What happened</h2>
        </header>
        <WhatHappened task={task} />
      </section>
      <div className="owner-tiles" data-count="4">
        <StatTile
          context={`Started ${hhmm(task.started_at)} UTC`}
          icon={ScheduleRounded}
          label="Duration"
          value={duration(task.duration_s)}
        />
        <StatTile context={callsLine(task)} icon={DataUsageOutlined} label="AI calls" value={count(task.calls)} />
        <StatTile
          context={`In ${tokens(sum(task.timeline, 'input_tokens'))} (${tokens(sum(task.timeline, 'cached_tokens'))} cached) · Out ${tokens(sum(task.timeline, 'output_tokens'))} · Thinking ${tokens(sum(task.timeline, 'thinking_tokens'))}`}
          icon={TokenOutlined}
          label="Tokens"
          value={tokens(task.tokens, { short: true })}
        />
        <CostTile task={task} />
      </div>
      <section className="owner-card owner-section">
        <header className="mst-card-head owner-card-head">
          <h2>AI calls</h2>
          <span className="owner-head-actions">
            <Button data-mst="owner-expand-all" onClick={() => setExpanded(true)} size="small">
              Expand all
            </Button>
            <Button onClick={() => setExpanded(false)} size="small">
              Collapse all
            </Button>
          </span>
        </header>
        <LogTimeline calls={calls} expanded={expanded} />
        {calls.length < task.timeline.length ? (
          <Button className="owner-more" onClick={() => setAllCalls(true)} size="small">
            Show all {count(task.timeline.length)} calls
          </Button>
        ) : null}
      </section>
      {payloads.length ? (
        <section className="owner-card owner-section">
          <header className="mst-card-head owner-card-head">
            <h2>Content</h2>
          </header>
          <div className="owner-content">
            {payloads.map(([key, value]) => (
              <TextViewer expanded={expanded} key={key} title={key[0].toUpperCase() + key.slice(1)} value={value} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
