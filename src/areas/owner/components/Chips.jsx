// The panel's chips: a task's outcome, a call's, a problem's kind, a cost that isn't an amount, and the outlined
// tags. Every status chip is filled and has an icon (design §3.13, §10 A11).
// Area: owner

import { Chip, Tooltip } from '@mui/material';
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import ScheduleRounded from '@mui/icons-material/ScheduleRounded';
import ReplayRounded from '@mui/icons-material/ReplayRounded';
import PendingOutlined from '@mui/icons-material/PendingOutlined';
import HelpOutlineRounded from '@mui/icons-material/HelpOutlineRounded';
import BlockRounded from '@mui/icons-material/BlockRounded';

const OUTCOMES = {
  done: { label: 'Done', color: 'success', icon: <CheckCircleOutlineRounded /> },
  failed: { label: 'Failed', color: 'error', icon: <ErrorOutlineRounded /> },
  partly_failed: { label: 'Partly failed', color: 'warning', icon: <WarningAmberRounded /> },
  slow: { label: 'Slow', color: 'warning', icon: <ScheduleRounded /> },
  recovered: {
    label: 'Recovered',
    color: 'default',
    icon: <ReplayRounded />,
    hint: 'The AI was busy, and the re-send worked.',
  },
  running: { label: 'Running', color: 'default', icon: <PendingOutlined /> },
};

const KINDS = {
  failed: OUTCOMES.failed,
  partly_failed: OUTCOMES.partly_failed,
  slow: OUTCOMES.slow,
  data_gap: { label: 'Data gap', color: 'default', icon: <HelpOutlineRounded /> },
};

function StatusChip({ config, mst }) {
  const chip = (
    <Chip
      className="mst-status owner-chip"
      color={config.color}
      data-mst={mst}
      icon={config.icon}
      label={config.label}
      size="small"
    />
  );
  return config.hint ? <Tooltip title={config.hint}>{chip}</Tooltip> : chip;
}

export const OutcomeChip = ({ outcome }) => <StatusChip config={OUTCOMES[outcome] || OUTCOMES.done} />;

export const KindChip = ({ kind }) => <StatusChip config={KINDS[kind] || KINDS.data_gap} />;

// What one call did: answered, busy, an error, timed out, never sent or no reply (§3.13's call outcomes).
export function callOutcome(call) {
  if (call.http_status === 429) return { label: 'AI busy (429)', color: 'warning', icon: <WarningAmberRounded /> };
  if (call.outcome === 'response') return { label: 'Answered', color: 'success', icon: <CheckCircleOutlineRounded /> };
  if (/timeout/i.test(call.error_type || ''))
    return { label: 'Timed out', color: 'warning', icon: <ScheduleRounded /> };
  if (call.outcome === 'outcome_unknown' || call.cost_status === 'unknown') {
    return { label: 'No reply', color: 'warning', icon: <HelpOutlineRounded /> };
  }
  if (call.cost_status === 'free' && !call.http_status) {
    return { label: 'Not sent', color: 'default', icon: <BlockRounded /> };
  }
  return { label: 'Error', color: 'error', icon: <ErrorOutlineRounded /> };
}

export const CallChip = ({ call }) => <StatusChip config={callOutcome(call)} />;

// A cost cell that has no amount: refused or never sent, sent with no reply, or no price for the model.
const COSTS = {
  free: { label: 'Not billed', hint: 'Refused or never sent, so not billed.' },
  unknown: { label: 'Cost unknown', hint: "Sent, but no reply came back, so the cost can't be known." },
  no_price: { label: 'No price', hint: 'No price is set for this model.' },
};

export function CostNote({ status }) {
  const note = COSTS[status];
  if (!note) return null;
  return (
    <Tooltip title={note.hint}>
      <span className="owner-cost-note" data-warn={status === 'free' ? undefined : 'true'}>
        {note.label}
      </span>
    </Tooltip>
  );
}

// An outlined tag: "Filled in", "Quick" or "Not in class".
export function Tag({ children, hint }) {
  const tag = <Chip className="owner-tag" label={children} size="small" variant="outlined" />;
  return hint ? <Tooltip title={hint}>{tag}</Tooltip> : tag;
}

export const FilledInTag = () => <Tag hint="Filled in from older records. It may be incomplete.">Filled in</Tag>;
