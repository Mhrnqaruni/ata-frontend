// The access record (/owner/access): every sign-in, failed sign-in, sign-out and page viewed in Admin (§3.12).
// A search's term is never kept, so its row just says "Search" (SOT-5).
// Area: owner

import { useSearchParams } from 'react-router-dom';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import PageHeader from '../../../components/common/PageHeader';
import OwnerTable from '../components/OwnerTable';
import { LoadError, Loading } from '../components/PageState';
import { time } from '../format';
import { useAccess } from '../ownerQueries';
import usePageTitle from '../usePageTitle';

const ACTIONS = { sign_in: 'Signed in', sign_in_failed: 'Failed sign-in', sign_out: 'Signed out', view: 'Viewed' };
const FILTERS = [
  ['all', 'All'],
  ['sign_in', 'Sign-ins'],
  ['sign_in_failed', 'Failed sign-ins'],
  ['view', 'Views'],
];
// What each panel route shows, in the panel's own words.
const PAGES = {
  '/api/owner/overview': 'Overview',
  '/api/owner/users': 'Users',
  '/api/owner/users/{user_id}': 'User',
  '/api/owner/organizations': 'Organizations',
  '/api/owner/assessments': 'Assessments',
  '/api/owner/assessments/{assessment_id}': 'Assessment',
  '/api/owner/assessments/{assessment_id}/answers/{result_id}/readings': "An answer's readings",
  '/api/owner/ai/summary': 'AI use',
  '/api/owner/ai/tasks': 'AI tasks',
  '/api/owner/ai/tasks/{task_kind}/{task_id}': 'AI task',
  '/api/owner/problems': 'Needs attention',
  '/api/owner/search': 'Search',
  '/api/owner/prices': 'Prices',
  '/api/owner/access-events': 'Access record',
  '/api/owner/session': 'Sign-in',
};
// The page, then its subject's id: "User · 2ea8df42-…". The page's name already says what the id is.
function what(event) {
  const page = PAGES[event.route] || event.route || '—';
  return event.subject_id ? `${page} · ${event.subject_id}` : page;
}

const COLUMNS = [
  { key: 'when', label: 'When (UTC)', className: 'owner-pin', render: (event) => time(event.occurred_at) },
  { key: 'action', label: 'Action', render: (event) => ACTIONS[event.action] || event.action },
  { key: 'what', label: 'What', className: 'owner-wrap', render: what },
  { key: 'address', label: 'Address', render: (event) => event.client_address || '—' },
];

export default function AccessPage() {
  usePageTitle('Access record');
  const [params, setParams] = useSearchParams();
  const action = params.get('action') || '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const { data, error, isLoading, isPlaceholderData, refetch } = useAccess({ action, page });
  const set = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, String(value)) : next.delete(key)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };
  const header = <PageHeader subtitle="Every sign-in and every page viewed in Admin." title="Access record" />;
  if (isLoading || error) {
    return (
      <>
        {header}
        {error ? <LoadError error={error} retry={refetch} /> : <Loading />}
      </>
    );
  }
  return (
    <>
      {header}
      <OwnerTable
        columns={COLUMNS}
        empty="Nothing recorded yet."
        label="Access record"
        onPage={(next) => set({ page: next })}
        page={{ page, pageSize: data.page_size, total: data.total }}
        refreshing={isPlaceholderData}
        rowKey={(event) => event.id}
        rows={data.items}
        toolbar={
          <ToggleButtonGroup
            exclusive
            onChange={(_, next) => next && set({ action: next === 'all' ? null : next })}
            size="small"
            value={action || 'all'}
          >
            {FILTERS.map(([key, label]) => (
              <ToggleButton key={key} value={key}>
                {label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        }
      />
    </>
  );
}
