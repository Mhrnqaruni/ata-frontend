// The review page's header (design.md §3.9): back to the results, the pupil's or student's name and context line, and
// at the right the total that follows each saved mark, ‹ › to the neighbours, then the page's own actions.
// Area: platform

import { Link as RouterLink } from 'react-router-dom';
import { IconButton, Tooltip } from '@mui/material';
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import PageHeader from '../common/PageHeader';
import { REVIEW } from './words';

// Points as teachers read them: 76, 7.5; missing is "—", never 0.
const shown = (value) => {
  if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) return '—';
  const rounded = Math.round(Number(value) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

// One of ‹ ›: a link to the neighbour, named in its tooltip, or a quiet disabled button at either end.
function Step({ to, label, named, icon }) {
  if (!to) {
    return (
      <IconButton aria-label={label} className="mst-rv-step" disabled>
        {icon}
      </IconButton>
    );
  }
  return (
    <Tooltip title={named}>
      <IconButton aria-label={named} className="mst-rv-step" component={RouterLink} to={to}>
        {icon}
      </IconButton>
    </Tooltip>
  );
}

// score and max: the total (score null while there's none); neighbours: { previous, next }, each { to, name } or
// null, or leave it out where a page has none; children: the page's actions, such as Download report.
export default function ReviewHeader({
  title,
  subtitle,
  breadcrumbs,
  backTo,
  backLabel,
  score,
  max,
  neighbours,
  children,
}) {
  const previous = neighbours?.previous;
  const next = neighbours?.next;
  return (
    <PageHeader
      actions={
        <div className="mst-rv-head-actions">
          {max !== null && max !== undefined ? (
            <p className="mst-rv-total">
              <span className="mst-rv-total-value">
                <strong>{shown(score)}</strong> / {shown(max)}
              </span>
              <span className="mst-rv-total-unit">{REVIEW.points}</span>
            </p>
          ) : null}
          {neighbours ? (
            <span className="mst-rv-steps">
              <Step
                icon={<ChevronLeftRounded />}
                label={REVIEW.previous}
                named={previous ? REVIEW.previousOf(previous.name) : ''}
                to={previous?.to}
              />
              <Step
                icon={<ChevronRightRounded />}
                label={REVIEW.next}
                named={next ? REVIEW.nextOf(next.name) : ''}
                to={next?.to}
              />
            </span>
          ) : null}
          {children}
        </div>
      }
      backLabel={backLabel}
      backTo={backTo}
      breadcrumbs={breadcrumbs}
      subtitle={subtitle}
      title={title}
    />
  );
}
