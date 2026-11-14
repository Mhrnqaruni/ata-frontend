// AI use's "Where it goes": a ranked table by category or by user, highest first, with a total row (§3.7).
// A category row filters the page to it; a user row adds the user filter, and the name opens their page.
// Area: owner

import { Link } from 'react-router-dom';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { cost, count, percent, tokens } from '../format';

function Bar({ share }) {
  return (
    <span aria-hidden="true" className="owner-rank-track">
      <span className="owner-rank-bar" style={{ width: `${Math.min(100, Math.max(0, (share || 0) * 100))}%` }} />
    </span>
  );
}

export default function WhereItGoes({ by, onBy, groups, total, onPick, userLink, empty }) {
  return (
    <section className="owner-card owner-where">
      <header className="mst-card-head owner-card-head">
        <h2>Where it goes</h2>
        <ToggleButtonGroup exclusive onChange={(_, next) => next && onBy(next)} size="small" value={by}>
          <ToggleButton value="category">By category</ToggleButton>
          <ToggleButton value="user">By user</ToggleButton>
        </ToggleButtonGroup>
      </header>
      {groups.length ? (
        <table className="owner-where-table">
          <thead>
            <tr>
              <th scope="col">{by === 'category' ? 'Category' : 'User'}</th>
              <th aria-label="Share" scope="col" />
              <th scope="col">AI tasks</th>
              <th scope="col">Tokens</th>
              <th scope="col">Estimated cost</th>
              <th scope="col">Share</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr
                className={group.key ? 'owner-where-link' : undefined}
                data-muted={group.key ? undefined : 'true'}
                key={group.key || 'none'}
                onClick={group.key ? () => onPick(group) : undefined}
              >
                <td>
                  {by === 'user' && group.key ? (
                    <Link className="owner-link" onClick={(event) => event.stopPropagation()} to={userLink(group.key)}>
                      {group.label}
                    </Link>
                  ) : (
                    group.label
                  )}
                </td>
                <td>
                  <Bar share={group.share} />
                </td>
                <td>{count(group.tasks)}</td>
                <td>{tokens(group.tokens)}</td>
                <td>{cost(group.cost_usd)}</td>
                <td>{percent(group.share)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td />
              <td>{count(total.tasks)}</td>
              <td>{tokens(total.tokens)}</td>
              <td>{cost(total.cost_usd)}</td>
              <td>100%</td>
            </tr>
          </tfoot>
        </table>
      ) : (
        <p className="mst-panel-empty">{empty}</p>
      )}
    </section>
  );
}
