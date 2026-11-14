// Needs attention (/owner/problems): what failed, partly failed, was slow or is missing from the records (§3.9).
// A kind switch with counts filters the table; each row opens its task, or the record that went wrong.
// Area: owner

import { Link, useSearchParams } from 'react-router-dom';
import { Chip, ToggleButton, ToggleButtonGroup } from '@mui/material';
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded';
import PageHeader from '../../../components/common/PageHeader';
import { KindChip } from '../components/Chips';
import DataNote from '../components/DataNote';
import OwnerTable from '../components/OwnerTable';
import { LoadError, Loading } from '../components/PageState';
import RangeMenu from '../components/RangeMenu';
import { count, time } from '../format';
import { problemLink, useProblems } from '../ownerQueries';
import usePageTitle from '../usePageTitle';
import useRange from '../useRange';

const KINDS = [
  ['failed', 'Failed'],
  ['partly_failed', 'Partly failed'],
  ['slow', 'Slow'],
  ['data_gap', 'Data gaps'],
];

function columns(userLink) {
  return [
    { key: 'when', label: 'When (UTC)', className: 'owner-pin', render: (p) => time(p.started_at) },
    { key: 'kind', label: 'Kind', render: (p) => <KindChip kind={p.kind} /> },
    { key: 'reason', label: 'Reason', className: 'owner-wrap', render: (p) => p.reason_label },
    { key: 'task', label: 'Task', grow: true, render: (p) => p.title },
    {
      key: 'user',
      label: 'User',
      render: (p) =>
        p.user_id ? (
          <Link className="owner-link" onClick={(event) => event.stopPropagation()} to={userLink(p.user_id)}>
            {p.user_name}
          </Link>
        ) : (
          <span className="owner-dash">User unknown</span>
        ),
    },
    { key: 'category', label: 'Category', render: (p) => p.category_label },
  ];
}

export default function ProblemsPage() {
  usePageTitle('Needs attention');
  const range = useRange();
  const [params, setParams] = useSearchParams();
  const kind = params.get('kind') || '';
  const userId = params.get('user_id') || '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const { data, error, isLoading, isPlaceholderData, refetch } = useProblems({
    ...range.query,
    kind,
    user_id: userId,
    page,
  });

  const set = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, String(value)) : next.delete(key)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const header = (
    <PageHeader
      actions={<RangeMenu />}
      subtitle="Failed, partly failed and slow tasks, and gaps in the records."
      title="Needs attention"
    />
  );
  if (isLoading || error) {
    return (
      <>
        {header}
        {error ? <LoadError error={error} retry={refetch} /> : <Loading />}
      </>
    );
  }
  const all = Object.values(data.counts).reduce((sum, n) => sum + n, 0);
  const userName = data.items.find((p) => p.user_id === userId)?.user_name;
  return (
    <>
      {header}
      <DataNote completeFrom={data.complete_from} start={range.start} />
      <OwnerTable
        columns={columns((id) => range.linkTo(`/owner/users/${id}`))}
        empty={
          <span className="owner-all-clear owner-center">
            <CheckCircleOutlineRounded aria-hidden="true" /> Nothing needs attention {range.during}.
          </span>
        }
        label="Problems"
        onPage={(next) => set({ page: next })}
        page={{ page, pageSize: data.page_size, total: data.total }}
        refreshing={isPlaceholderData}
        rowKey={(p) => `${p.task_kind}:${p.task_id}`}
        rowTo={problemLink}
        rows={data.items}
        toolbar={
          <>
            <ToggleButtonGroup
              exclusive
              onChange={(_, next) => next && set({ kind: next === 'all' ? null : next })}
              size="small"
              value={kind || 'all'}
            >
              <ToggleButton data-mst="owner-kind-all" value="all">
                All {count(all)}
              </ToggleButton>
              {KINDS.map(([key, label]) => (
                <ToggleButton data-mst={`owner-kind-${key}`} key={key} value={key}>
                  {label} {count(data.counts[key])}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            {userId ? (
              <Chip label={`User: ${userName || 'this user'}`} onDelete={() => set({ user_id: null })} />
            ) : null}
          </>
        }
      />
    </>
  );
}
