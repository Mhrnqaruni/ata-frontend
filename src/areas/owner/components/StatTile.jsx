// A stacked tile: a label with its icon, a big value, a context line and, on the overview, its change (§6).
// A tile that opens a page is a link that lifts on hover; the warning tone marks problems above 0.
// Area: owner

import { Link } from 'react-router-dom';
import { Tooltip } from '@mui/material';

export default function StatTile({ icon: Icon, label, hint, value, context, change, tone, to, mst }) {
  const name = (
    <span className="owner-tile-label">
      {Icon ? <Icon aria-hidden="true" /> : null}
      {label}
    </span>
  );
  const body = (
    <>
      {hint ? <Tooltip title={hint}>{name}</Tooltip> : name}
      <span className="owner-tile-value">{value}</span>
      {context ? <span className="owner-tile-context">{context}</span> : null}
      {change ? (
        <Tooltip title={change.tooltip || ''}>
          <span className="owner-tile-change">{change.text}</span>
        </Tooltip>
      ) : null}
    </>
  );
  const className = `mst-g1 mst-rim owner-tile${tone === 'warn' ? ' owner-tile-warn' : ''}`;
  // A tile that opens a section of the same page scrolls to it.
  if (to?.startsWith('#')) {
    return (
      <a
        className={`${className} owner-tile-link`}
        data-mst={mst}
        href={to}
        onClick={(event) => {
          event.preventDefault();
          document.getElementById(to.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
      >
        {body}
      </a>
    );
  }
  return to ? (
    <Link className={`${className} owner-tile-link`} data-mst={mst} to={to}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

// A tile's change on the previous period of the same length (design §10, A1): counts show the difference ("↑ 2"),
// cost a percentage ("↑ 21%"); "No full comparison yet" when that period starts before records are complete.
export function changeOf(current, previous, { percent = false, previousStart, completeFrom, period }) {
  if (previous === null || previous === undefined) return null;
  const tooltip = `On the previous ${period}`;
  if (!completeFrom || (previousStart && previousStart < completeFrom)) {
    return { text: 'No full comparison yet', tooltip };
  }
  const now = Number(current || 0);
  const then = Number(previous || 0);
  if (now === then) return { text: 'Same', tooltip };
  const arrow = now > then ? '↑' : '↓';
  if (!percent) return { text: `${arrow} ${Math.abs(now - then).toLocaleString('en-GB')}`, tooltip };
  if (then === 0) return { text: 'No earlier data', tooltip };
  return { text: `${arrow} ${Math.round((Math.abs(now - then) / then) * 100)}%`, tooltip };
}
