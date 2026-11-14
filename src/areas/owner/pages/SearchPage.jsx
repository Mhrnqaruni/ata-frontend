// Search (/owner/search?q=): users, assessments, classes and students whose names hold q, in four groups (§3.11).
// A class or a student opens its teacher's page at Teaching; the search is literal, so "50%" finds "50%".
// Area: owner

import { Link, useSearchParams } from 'react-router-dom';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import PageHeader from '../../../components/common/PageHeader';
import StatusChip from '../../../components/assessments/StatusChip';
import EmptyState from '../../../components/common/EmptyState';
import SearchRounded from '@mui/icons-material/SearchRounded';
import { Tag } from '../components/Chips';
import { LoadError, Loading } from '../components/PageState';
import { count, day } from '../format';
import { useSearch } from '../ownerQueries';
import usePageTitle from '../usePageTitle';

function Group({ title, rows, more, render }) {
  if (!rows.length) return null;
  return (
    <section className="owner-card owner-section">
      <header className="mst-card-head owner-card-head">
        <h2>
          {title} <span className="owner-head-note">{count(rows.length)}</span>
        </h2>
      </header>
      <ul className="owner-results">
        {rows.map((row) => {
          const { key, to, main, sub, side } = render(row);
          return (
            <li key={key}>
              <Link className="owner-result" to={to}>
                <span className="owner-name">
                  <span className="owner-name-main">{main}</span>
                  {sub ? <span className="owner-sub">{sub}</span> : null}
                </span>
                <span className="owner-result-side">{side}</span>
                <ChevronRightRounded aria-hidden="true" className="owner-rank-chevron" />
              </Link>
            </li>
          );
        })}
      </ul>
      {more ? <p className="owner-card-caption">Showing the first 20. Type more to narrow it.</p> : null}
    </section>
  );
}

const userPage = (id, section) => (id ? `/owner/users/${id}${section ? `#${section}` : ''}` : '/owner/users');

export default function SearchPage() {
  usePageTitle('Search');
  const [params] = useSearchParams();
  const q = (params.get('q') || '').trim();
  const { data, error, isLoading, isPlaceholderData, refetch } = useSearch(q);
  const header = <PageHeader subtitle={q ? `Results for "${q}"` : null} title="Search" />;
  if (q.length < 2) {
    return (
      <>
        {header}
        <p className="owner-note">Type at least 2 letters.</p>
      </>
    );
  }
  if (isLoading || error) {
    return (
      <>
        {header}
        {error ? <LoadError error={error} retry={refetch} /> : <Loading />}
      </>
    );
  }
  const found = data.users.length + data.assessments.length + data.classes.length + data.students.length;
  return (
    <>
      {header}
      {found ? null : (
        <EmptyState icon={<SearchRounded />} title={`No results for "${q}".`}>
          Try part of a name or an email.
        </EmptyState>
      )}
      <div className="owner-refreshing" data-refreshing={isPlaceholderData ? 'true' : undefined}>
        <Group
          more={data.more.users}
          render={(user) => ({
            key: user.user_id,
            to: userPage(user.user_id),
            main: user.name || user.email,
            sub: user.email,
            side: user.modes.map((mode) => <Tag key={mode}>{mode === 'teacher' ? 'Teacher' : 'Parent'}</Tag>),
          })}
          rows={data.users}
          title="Users"
        />
        <Group
          more={data.more.assessments}
          render={(row) => ({
            key: row.assessment_id,
            to: `/owner/assessments/${encodeURIComponent(row.assessment_id)}`,
            main: row.name || 'Untitled',
            sub: `${row.teacher_name} · created ${day(row.created_at)}`,
            side: <StatusChip status={row.status} />,
          })}
          rows={data.assessments}
          title="Assessments"
        />
        <Group
          more={data.more.classes}
          render={(row) => ({
            key: row.class_id,
            to: userPage(row.user_id, 'teaching'),
            main: row.name,
            sub: row.owner_name,
            side: `${count(row.students)} ${row.students === 1 ? 'student' : 'students'}`,
          })}
          rows={data.classes}
          title="Classes"
        />
        <Group
          more={data.more.students}
          render={(row) => ({
            key: row.student_id,
            to: userPage(row.user_id, 'teaching'),
            main: row.name,
            sub: [row.classes.join(', '), row.owner_name].filter(Boolean).join(' · ') || null,
            side: row.student_number,
          })}
          rows={data.students}
          title="Students"
        />
      </div>
    </>
  );
}
