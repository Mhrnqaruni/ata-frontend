// Organizations (/owner/organizations): AI use by organization: teacher workspaces, then each parent (§3.10).
// One table in two groups, each by cost; a row opens its owner's page. Organizations with many teachers show here.
// Area: owner

import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/common/PageHeader';
import DataNote from '../components/DataNote';
import { LoadError, Loading } from '../components/PageState';
import RangeMenu from '../components/RangeMenu';
import { cost, count, percent, tokens } from '../format';
import { useOrganizations } from '../ownerQueries';
import usePageTitle from '../usePageTitle';
import useRange from '../useRange';

function Row({ row, members, open }) {
  return (
    <tr className={open ? 'owner-where-link' : undefined} onClick={open || undefined}>
      <td>
        <span className="owner-name">
          <span className="owner-name-main">{row.label}</span>
          {members ? <span className="owner-sub">{members}</span> : null}
        </span>
      </td>
      <td>{count(row.members)}</td>
      <td>{count(row.tasks)}</td>
      <td>{tokens(row.tokens)}</td>
      <td>{cost(row.cost_usd)}</td>
      <td>{percent(row.share)}</td>
    </tr>
  );
}

export default function OrganizationsPage() {
  usePageTitle('Organizations');
  const range = useRange();
  const navigate = useNavigate();
  const { data, error, isLoading, isPlaceholderData, refetch } = useOrganizations(range.query);
  const header = (
    <PageHeader
      actions={<RangeMenu />}
      subtitle={`Organizations with AI use ${range.during}. Today each teacher has their own workspace, and each parent is their own group.`}
      title="Organizations"
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
  const opener = (row) =>
    row.owner_user_id ? () => navigate(range.linkTo(`/owner/users/${row.owner_user_id}`)) : null;
  const teachers = (n) => `${count(n)} ${n === 1 ? 'teacher' : 'teachers'}`;
  return (
    <>
      {header}
      <DataNote completeFrom={data.complete_from} start={range.start} />
      <section className="owner-card" data-refreshing={isPlaceholderData ? 'true' : undefined}>
        {data.workspaces.length || data.parents.length ? (
          <table className="owner-where-table owner-org-table">
            <thead>
              <tr>
                <th scope="col">Organization</th>
                <th scope="col">Members</th>
                <th scope="col">AI tasks</th>
                <th scope="col">Tokens</th>
                <th scope="col">Estimated cost</th>
                <th scope="col">Share</th>
              </tr>
            </thead>
            <tbody>
              <tr className="owner-org-group">
                <th colSpan={6} scope="rowgroup">
                  Teacher workspaces
                </th>
              </tr>
              {data.workspaces.map((row) => (
                <Row
                  key={row.key || 'none'}
                  members={row.key ? teachers(row.members) : null}
                  open={opener(row)}
                  row={row}
                />
              ))}
              <tr className="owner-org-group">
                <th scope="rowgroup">All parents with AI use</th>
                <td>{count(data.all_parents.members)}</td>
                <td>{count(data.all_parents.tasks)}</td>
                <td>{tokens(data.all_parents.tokens)}</td>
                <td>{cost(data.all_parents.cost_usd)}</td>
                <td>{percent(data.all_parents.share)}</td>
              </tr>
              {data.parents.map((row) => (
                <Row key={row.key} open={opener(row)} row={row} />
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mst-panel-empty">No AI use {range.during}.</p>
        )}
      </section>
    </>
  );
}
