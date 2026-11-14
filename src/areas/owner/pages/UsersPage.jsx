// Users (/owner/users): every teacher and parent account, with its totals and the range's AI use (§3.3).
// The columns are grouped by period (A3), the role sits under the name (M1), and any column sorts.
// Area: owner

import { useSearchParams } from 'react-router-dom';
import { ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import PageHeader from '../../../components/common/PageHeader';
import DataNote from '../components/DataNote';
import OwnerTable from '../components/OwnerTable';
import { LoadError, Loading } from '../components/PageState';
import RangeMenu from '../components/RangeMenu';
import TableSearch from '../components/TableSearch';
import { cost, count, relative, time, tokens } from '../format';
import { useUsers } from '../ownerQueries';
import usePageTitle from '../usePageTitle';
import useRange from '../useRange';

const ROLE_WORDS = { teacher: 'Teacher', parent: 'Parent' };
export const roleOf = (modes) =>
  modes.length === 2 ? 'Teacher, parent' : modes.map((mode) => ROLE_WORDS[mode]).join('') || 'Account';

// A teacher's count, or a dash on an account that doesn't teach.
const teaching = (key) => (user) =>
  user.modes.includes('teacher') ? count(user[key]) : <span className="owner-dash">—</span>;

const COLUMNS = [
  {
    key: 'name',
    label: 'Name',
    sortable: true,
    className: 'owner-pin owner-name-cell',
    render: (user) => (
      <span className="owner-name">
        <span className="owner-name-main">{user.name || user.email}</span>
        <span className="owner-sub">
          {roleOf(user.modes)} · {user.email}
        </span>
      </span>
    ),
  },
  {
    key: 'last_active',
    label: 'Last active',
    sortable: true,
    firstOrder: 'desc',
    render: (user) => (
      <Tooltip title={user.last_active ? `${time(user.last_active)} UTC` : ''}>
        <span>{relative(user.last_active)}</span>
      </Tooltip>
    ),
  },
  { key: 'cost', label: 'Estimated cost', numeric: true, sortable: true, render: (user) => cost(user.cost_usd) },
  { key: 'ai_tasks', label: 'AI tasks', numeric: true, sortable: true, render: (user) => count(user.ai_tasks) },
  {
    key: 'tokens',
    label: 'Tokens',
    numeric: true,
    sortable: true,
    render: (user) => (
      <Tooltip title={tokens(user.tokens)}>
        <span>{tokens(user.tokens, { short: true })}</span>
      </Tooltip>
    ),
  },
  {
    key: 'problems',
    label: 'Problems',
    numeric: true,
    sortable: true,
    render: (user) =>
      user.problems ? (
        <span className="owner-warn-count">
          <WarningAmberRounded aria-hidden="true" />
          {count(user.problems)}
        </span>
      ) : (
        '0'
      ),
  },
  { key: 'classes', label: 'Classes', numeric: true, sortable: true, render: teaching('classes') },
  { key: 'students', label: 'Students', numeric: true, sortable: true, render: teaching('students') },
  { key: 'assessments', label: 'Assessments', numeric: true, sortable: true, render: teaching('assessments') },
  { key: 'quizzes', label: 'Quizzes', numeric: true, sortable: true, render: teaching('quizzes') },
];

export default function UsersPage() {
  usePageTitle('Users');
  const range = useRange();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const role = params.get('role') || '';
  const sort = params.get('sort') ? { key: params.get('sort'), order: params.get('order') || 'desc' } : null;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const { data, error, isLoading, isPlaceholderData, refetch } = useUsers({
    ...range.query,
    q,
    role,
    sort: sort?.key,
    order: sort?.order,
    page,
  });

  const set = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, String(value)) : next.delete(key)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const counts = data?.counts;
  const subtitle = counts
    ? `${count(counts.accounts)} accounts: ${count(counts.teachers)} teachers, ${count(counts.parents)} parents (${count(counts.both)} have both)`
    : null;
  const header = <PageHeader actions={<RangeMenu />} subtitle={subtitle} title="Users" />;
  if (isLoading || error) {
    return (
      <>
        {header}
        {error ? <LoadError error={error} retry={refetch} /> : <Loading />}
      </>
    );
  }
  const filtered = Boolean(q || role);
  return (
    <>
      {header}
      <DataNote completeFrom={data.complete_from} start={range.start} />
      <OwnerTable
        columns={COLUMNS}
        empty={filtered ? 'No account matches.' : 'No accounts yet.'}
        groups={[
          { label: '', span: 2 },
          { label: range.label, span: 4 },
          { label: 'All time', span: 4 },
        ]}
        label="Users"
        onPage={(next) => set({ page: next })}
        onSort={(next) => set({ sort: next?.key, order: next?.order })}
        page={{ page, pageSize: data.page_size, total: data.total }}
        refreshing={isPlaceholderData}
        rowKey={(user) => user.user_id}
        rowTo={(user) => range.linkTo(`/owner/users/${user.user_id}`)}
        rows={data.items}
        sort={sort || { key: 'last_active', order: 'desc' }}
        toolbar={
          <>
            <TableSearch placeholder="Search by name or email" />
            <ToggleButtonGroup
              exclusive
              onChange={(_, next) => next && set({ role: next === 'all' ? null : next })}
              size="small"
              value={role || 'all'}
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="teacher">Teachers</ToggleButton>
              <ToggleButton value="parent">Parents</ToggleButton>
            </ToggleButtonGroup>
            <span className="owner-grow" />
            {filtered ? (
              <span className="owner-table-count">
                {count(data.total)} of {count(counts.accounts)}
              </span>
            ) : null}
          </>
        }
      />
    </>
  );
}
