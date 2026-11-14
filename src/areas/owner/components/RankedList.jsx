// A ranked list: each row's name, a bar for its share, its value and share; rows open what they name (§3.13).
// An "Other" row makes the list add up to its total (design §10, A8); a muted row opens nothing.
// Area: owner

import { Link } from 'react-router-dom';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import { percent } from '../format';

function Row({ row }) {
  const cells = (
    <>
      <span className="owner-rank-name" title={row.label}>
        {row.label}
      </span>
      <span aria-hidden="true" className="owner-rank-track">
        <span className="owner-rank-bar" style={{ width: `${Math.min(100, Math.max(0, (row.share || 0) * 100))}%` }} />
      </span>
      <span className="owner-rank-value">{row.figure}</span>
      <span className="owner-rank-share">{percent(row.share)}</span>
    </>
  );
  if (row.to && !row.muted) {
    return (
      <Link className="owner-rank-row owner-rank-link" to={row.to}>
        {cells}
        <ChevronRightRounded aria-hidden="true" className="owner-rank-chevron" />
      </Link>
    );
  }
  return (
    <div className="owner-rank-row" data-muted={row.muted ? 'true' : undefined} title={row.hint}>
      {cells}
    </div>
  );
}

export default function RankedList({ title, seeAll, rows, other, empty }) {
  return (
    <section className="owner-card owner-rank">
      <header className="mst-panel-head">
        <h2 className="owner-card-title">{title}</h2>
        {seeAll ? (
          <Link className="mst-panel-link" to={seeAll}>
            See all <ChevronRightRounded aria-hidden="true" />
          </Link>
        ) : null}
      </header>
      {rows.length ? (
        <div className="owner-rank-rows">
          {rows.map((row) => (
            <Row key={row.key} row={row} />
          ))}
          {other ? <Row row={{ key: 'other', label: other.label || 'Other', ...other, to: null }} /> : null}
        </div>
      ) : (
        <p className="mst-panel-empty">{empty}</p>
      )}
    </section>
  );
}
