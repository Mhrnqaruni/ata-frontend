// Assessments (/owner/assessments): every assessment made in the range, whose, what state, what it cost (§3.5).
// It filters by name, status and teacher; newest first, 50 a page; a row opens the assessment.
// Area: owner

import { useSearchParams } from 'react-router-dom';
import { Chip, MenuItem, TextField } from '@mui/material';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import PageHeader from '../../../components/common/PageHeader';
import StatusChip from '../../../components/assessments/StatusChip';
import { Tag } from '../components/Chips';
import OwnerTable from '../components/OwnerTable';
import { LoadError, Loading } from '../components/PageState';
import RangeMenu from '../components/RangeMenu';
import TableSearch from '../components/TableSearch';
import { cost, count, day, tokens } from '../format';
import { useAssessments } from '../ownerQueries';
import usePageTitle from '../usePageTitle';
import useRange from '../useRange';

const STATUS_WORDS = { Completed: 'Completed', 'Pending Review': 'Pending review', Failed: 'Failed' };

const COLUMNS = [
  {
    key: 'name',
    label: 'Assessment',
    className: 'owner-pin owner-name-cell',
    render: (row) => (
      <span className="owner-task-title">
        <span className="owner-name-main" title={row.name || undefined}>
          {row.name || 'Untitled'}
        </span>
        {row.quick ? <Tag>Quick</Tag> : null}
      </span>
    ),
  },
  { key: 'teacher', label: 'Teacher', render: (row) => row.teacher_name },
  { key: 'class', label: 'Class', render: (row) => row.class_name || '—' },
  { key: 'status', label: 'Status', render: (row) => <StatusChip status={row.status} /> },
  { key: 'students', label: 'Students', numeric: true, render: (row) => count(row.students) },
  { key: 'created', label: 'Created', render: (row) => day(row.created_at) },
  { key: 'tokens', label: 'Tokens', numeric: true, render: (row) => tokens(row.tokens, { short: true }) },
  { key: 'cost', label: 'Estimated cost', numeric: true, render: (row) => cost(row.cost_usd) },
  {
    key: 'problems',
    label: 'Problems',
    numeric: true,
    render: (row) =>
      row.problems ? (
        <span className="owner-warn-count">
          <WarningAmberRounded aria-hidden="true" />
          {count(row.problems)}
        </span>
      ) : (
        '0'
      ),
  },
];

export default function AssessmentsPage() {
  usePageTitle('Assessments');
  const range = useRange();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const status = params.get('status') || '';
  const userId = params.get('user_id') || '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const { data, error, isLoading, isPlaceholderData, refetch } = useAssessments({
    ...range.query,
    q,
    status,
    user_id: userId,
    page,
  });

  const set = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, String(value)) : next.delete(key)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const subtitle = data ? `${count(data.total)} ${range.during}` : null;
  const header = <PageHeader actions={<RangeMenu />} subtitle={subtitle} title="Assessments" />;
  if (isLoading || error) {
    return (
      <>
        {header}
        {error ? <LoadError error={error} retry={refetch} /> : <Loading />}
      </>
    );
  }
  const teacher = data.items[0]?.teacher_name;
  return (
    <>
      {header}
      <OwnerTable
        columns={COLUMNS}
        empty={q || status || userId ? 'No assessment matches.' : `No assessments ${range.during}.`}
        label="Assessments"
        onPage={(next) => set({ page: next })}
        page={{ page, pageSize: data.page_size, total: data.total }}
        refreshing={isPlaceholderData}
        rowKey={(row) => row.assessment_id}
        rowTo={(row) => `/owner/assessments/${encodeURIComponent(row.assessment_id)}`}
        rows={data.items}
        toolbar={
          <>
            <TableSearch placeholder="Search by assessment name" />
            <TextField
              InputLabelProps={{ shrink: true }}
              label="Status"
              onChange={(event) => set({ status: event.target.value })}
              select
              SelectProps={{ displayEmpty: true }}
              size="small"
              sx={{ minWidth: 180 }}
              value={status}
            >
              <MenuItem value="">All statuses</MenuItem>
              {data.statuses.map((value) => (
                <MenuItem key={value} value={value}>
                  {STATUS_WORDS[value] || value}
                </MenuItem>
              ))}
            </TextField>
            {userId ? (
              <Chip label={`Teacher: ${teacher || 'this teacher'}`} onDelete={() => set({ user_id: null })} />
            ) : null}
          </>
        }
      />
    </>
  );
}
