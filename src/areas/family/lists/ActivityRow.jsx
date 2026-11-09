// A row in parent mode's lists (design §1.6, §5.3): teacher Home's glass row, a link to the item's own address with
// its title, its date line, its status at the right and a chevron. Also the saved-upload row and the "New" chip.
// Area: family

import { Button, Chip, CircularProgress } from '@mui/material';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import { Link } from 'react-router-dom';
import { KIND_ICONS } from './listWords';
import { dateLine, lookWords, rowStatus, savedLine, savedTitle } from './rowWords';
import './lists.css';

/** The "New" chip in teacher's status look (design §1.6), seen but not heard: its row says ", new" after the name. */
export function NewChip() {
  return <Chip component="span" size="small" color="primary" label="New" className="fam-row-chip" aria-hidden />;
}

/** The "New" chip right after a name. Assistive technology hears the name plus ", new". */
export function NewPill() {
  return (
    <>
      <span className="fam-sr">, new</span>
      <NewChip />
    </>
  );
}

/**
 * One activity-list item as a row of a list card (<ul className="mst-list"> in the card). The row links to `to`, the
 * item's own address, so it also opens in a new tab, and gives the result `from` for its back link. `showKind`, for a
 * list that mixes kinds, adds the kind's tile and puts its name before the date line. `isNew` adds the New chip. A
 * check that needs more pages offers Add the missing pages beside the link when the page gives `onAddPages(item)`, and
 * `busy` turns it off while it works.
 */
export default function ActivityRow({ item, to, from, isNew = false, showKind = false, onAddPages, busy = false }) {
  const status = rowStatus(item);
  const KindIcon = showKind ? KIND_ICONS[item.kind] : null;
  // "New" and "Not tried yet" say one thing, so a quiz not tried yet shows only its chip.
  const fresh = isNew && status.state !== 'untried';
  // A check that couldn't be marked says so in its line, in the warning ink (design §5.3).
  const warnLine = item.kind === 'check' && status.state === 'failed';
  return (
    <li className="fam-list-item" data-state={status.state}>
      <Link
        to={to}
        state={{ from }}
        className="mst-list-row home-row-button fam-list-link"
        data-tile={KindIcon ? '' : undefined}
        data-mst="row"
      >
        {KindIcon && (
          <span className="mst-tile" data-size="sm" aria-hidden>
            <KindIcon />
          </span>
        )}
        <span className="mst-list-text">
          <span className="mst-list-title">
            {item.title}
            {fresh && <span className="fam-sr">, new</span>}
          </span>
          <span className="mst-list-meta" data-tone={warnLine ? 'warn' : undefined}>
            {dateLine(item, { withKind: showKind })}
          </span>
        </span>
        {/* Keyed by state, so a change of state fades in. */}
        <span className="fam-list-end" key={status.state}>
          {fresh && <NewChip />}
          {status.look > 0 && (
            <Chip
              component="span"
              size="small"
              color="warning"
              label={lookWords(status.look)}
              className="fam-row-chip"
            />
          )}
          <Status status={status} />
        </span>
        <ChevronRightRounded className="fam-list-chev" aria-hidden />
      </Link>
      {status.state === 'pages' && onAddPages && (
        <Button
          variant="outlined"
          size="small"
          className="fam-list-action"
          disabled={busy}
          onClick={() => onAddPages(item)}
          data-mst="add-pages"
        >
          Add the missing pages
        </Button>
      )}
    </li>
  );
}

// The row's status (design §1.6): the chip for a quiz not tried yet, a score in neutral ink so a low one doesn't look
// like success, the spinner while it's being made, or a warning. A finished item with nothing to say shows none.
function Status({ status }) {
  if (status.state === 'untried') {
    return <Chip component="span" size="small" color="primary" label={status.text} className="fam-row-chip" />;
  }
  if (!status.text) return null;
  return (
    <span className="fam-list-status" data-tone={status.state === 'failed' ? 'warn' : undefined}>
      {status.state === 'making' && <CircularProgress size={16} aria-hidden />}
      {status.text}
    </span>
  );
}

/**
 * A homework upload that no check uses yet (design §5.3; C-21): "Photos from 28 Oct", "2 photos, saved but not
 * marked" and Check now, which calls onMark(material) to send them for marking; `sending` shows that it's working,
 * and `busy` turns it off. The page decides which uploads count (SOT C-24). Nothing to open, so it isn't a link.
 */
export function UnmarkedRow({ material, onMark, busy = false, sending = false }) {
  return (
    <li className="fam-list-item" data-state="unmarked">
      <div className="mst-list-row home-row-button fam-list-static">
        <span className="mst-list-text">
          <span className="mst-list-title">{savedTitle(material)}</span>
          <span className="mst-list-meta">{savedLine(material)}</span>
        </span>
        <span className="fam-list-end">
          <Button
            variant="outlined"
            size="small"
            className="fam-list-action"
            disabled={busy}
            startIcon={sending ? <CircularProgress size={16} color="inherit" aria-hidden /> : undefined}
            onClick={() => onMark(material)}
            data-mst="mark"
          >
            {sending ? 'Sending…' : 'Check now'}
          </Button>
        </span>
      </div>
    </li>
  );
}
