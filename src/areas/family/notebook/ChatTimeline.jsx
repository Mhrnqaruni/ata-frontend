// The Notebook's messages (Phase 1.38 design §4.5) in teacher's chat look: the parent's on the right, answers on the
// left under "AI assistant", Explain more simply under the latest, and each thing made here as one glass row with Open.
// Area: family

import { useEffect, useState } from 'react';
import { Alert, Button, Chip, CircularProgress } from '@mui/material';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import LightbulbOutlined from '@mui/icons-material/LightbulbOutlined';
import { Link } from 'react-router-dom';
import FamilyEvidence from '../FamilyEvidence';
import FamilyMarkdown from '../FamilyMarkdown';
import { isRunning } from '../familyWords';
import { rowStatus } from '../lists/rowWords';
import { kindIcon } from './kinds';
import { madeLine } from './notebookWords';

/** The answer is being written: teacher's three dots, with words that change with the wait (never a percentage). */
export function Thinking({ since, stage }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.floor((now - since) / 1000));
  return (
    <div className="mst-msg" data-role="bot" role="status" aria-live="polite">
      <span className="mst-msg-avatar" aria-hidden>
        <AutoAwesomeRounded />
      </span>
      <div className="mst-thinking">
        <span className="mst-thinking-dots" aria-hidden>
          <span />
          <span />
          <span />
        </span>
        <span>
          {seconds < 45 ? stage || 'Preparing your reply…' : 'Still working on it. You can leave and come back.'}
        </span>
      </div>
    </div>
  );
}

/** The parent's own words, on the right in the accent fill. */
export function MineBubble({ text, sending = false }) {
  return (
    <div className={sending ? 'mst-msg fam-nb-sending' : 'mst-msg'} data-role="user">
      <div className="mst-msg-bubble">{text}</div>
    </div>
  );
}

function Turn({ turn, child, latest, simpler, onSimpler, disabled }) {
  const activity = turn.activity;
  const result = activity.result;
  return (
    <>
      <MineBubble text={turn.text} />
      {isRunning(activity) ? (
        <Thinking stage={activity.stage} since={Date.parse(activity.createdAt) || Date.now()} />
      ) : (
        // Keyed by status, so a finished answer fades in.
        <div className="fam-nb-answer" key={activity.status}>
          <p className="fam-nb-who">AI assistant</p>
          <div className="mst-msg" data-role="bot" data-fresh-answer={latest}>
            <span className="mst-msg-avatar" aria-hidden>
              <AutoAwesomeRounded />
            </span>
            <div className="mst-msg-bubble">
              {result ? (
                <>
                  <FamilyMarkdown text={result.explanation || result.message} />
                  <FamilyEvidence childId={child.id} activity={activity} />
                </>
              ) : (
                <Alert severity="warning">
                  {activity.error ||
                    'This reply couldn’t finish. Your message is saved. Check its status before deliberately trying again.'}
                </Alert>
              )}
            </div>
          </div>
          {simpler && activity.status === 'completed' && result?.explanation?.length > 60 && (
            <Button
              variant="outlined"
              className="fam-nb-simpler"
              startIcon={<LightbulbOutlined />}
              disabled={disabled}
              onClick={onSimpler}
              data-mst="family-explain-simpler"
            >
              Explain more simply
            </Button>
          )}
        </div>
      )}
    </>
  );
}

// The row's one status (design §1.6): Not tried yet as a chip, a score in neutral ink, Making… with a spinner, or a
// warning. A finished item with nothing to say shows none.
function MadeStatus({ status }) {
  if (status.state === 'untried') return <Chip component="span" size="small" color="primary" label={status.text} />;
  if (!status.text) return null;
  const warn = status.state === 'pages' || status.state === 'failed';
  return (
    <span className="fam-nb-status" data-tone={warn ? 'warn' : undefined}>
      {status.state === 'making' && <CircularProgress size={16} aria-hidden />}
      {status.text}
    </span>
  );
}

function MadeRow({ row, attempt, isNew, link }) {
  const Icon = kindIcon(row.kind);
  const status = rowStatus({
    kind: row.kind,
    status: row.status,
    summary: attempt ? { latest: { score: attempt.score, total: attempt.total } } : undefined,
  });
  // "New" and "Not tried yet" say one thing, so a quiz not tried yet shows only its chip.
  const fresh = isNew && status.state !== 'untried';
  return (
    <div className="fam-nb-made" data-state={status.state}>
      <span className="mst-tile" data-size="sm" aria-hidden>
        <Icon />
      </span>
      <span className="fam-nb-made-text">
        <span className="fam-nb-made-name">
          {row.title}
          {fresh && <span className="fam-sr">, new</span>}
        </span>
        <span className="fam-nb-made-meta">{madeLine(row)}</span>
      </span>
      <span className="fam-nb-made-end">
        {fresh && <Chip component="span" size="small" color="primary" label="New" aria-hidden />}
        <MadeStatus status={status} />
      </span>
      <Button
        component={Link}
        to={link.to}
        state={link.state}
        className="fam-nb-open"
        aria-label={`Open ${row.title}`}
        data-mst="family-chat-open"
      >
        Open
      </Button>
    </div>
  );
}

/**
 * `items` is the chat's timeline, oldest first: { kind: 'turn', key, turn } or { kind: 'act', key, row }. The newest
 * item is the fresh answer the log scrolls to; Explain more simply sits under the latest answer only.
 * `resultLink(row)` gives a made thing's { to, state }; `isNew(id)` its New mark.
 */
export default function ChatTimeline({ items, child, attempts, isNew, resultLink, onSimpler, disabled }) {
  const lastTurn = items.filter((item) => item.kind === 'turn').at(-1)?.key;
  return items.map((item, index) =>
    item.kind === 'act' ? (
      <MadeRow
        key={item.key}
        row={item.row}
        attempt={attempts.find((attempt) => attempt.activityId === item.row.id)}
        isNew={!!isNew?.(item.row.id)}
        link={resultLink(item.row)}
      />
    ) : (
      <Turn
        key={item.key}
        turn={item.turn}
        child={child}
        latest={index === items.length - 1}
        simpler={item.key === lastTurn}
        onSimpler={() => onSimpler(item.turn)}
        disabled={disabled}
      />
    )
  );
}
