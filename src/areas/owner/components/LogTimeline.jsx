// A task's AI calls as a log: each call's time, step, model, duration, tokens, cost and outcome, oldest first.
// A call opens to plain label–value rows and its reply as text (design §3.8, §10 A10, A12).
// Area: owner

import { useEffect, useState } from 'react';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import { clock, cost, duration, model, tokens } from '../format';
import { CallChip, CostNote, FilledInTag } from './Chips';
import TextViewer from './TextViewer';

// The price set a call was costed at: "Gemini 3.7 Flash, introductory prices (to 1 Jan 2027)".
function priceUsed(price) {
  if (!price) return null;
  const period = price.period === 'introductory' ? 'introductory prices' : 'standard prices';
  return `${model(price.model)}, ${period}`;
}

// When a call started: it's kept when it ended, so its duration comes off (QA's Section 4 P3-2).
const startOf = (call) => new Date(Date.parse(call.occurred_at) - (call.duration_ms || 0));

// A call's error: its type, and its HTTP status only when that's an error (an answered call has 200: P2-1).
function errorOf(call) {
  const status = call.http_status >= 400 ? call.http_status : null;
  return [status, call.error_type].filter(Boolean).join(' · ');
}

function Details({ call }) {
  const rows = [
    ['Input', `${tokens(call.input_tokens)}${call.cached_tokens ? ` (${tokens(call.cached_tokens)} cached)` : ''}`],
    ['Output', tokens(call.output_tokens)],
    ['Thinking', tokens(call.thinking_tokens)],
    call.tool_tokens ? ['Tool', tokens(call.tool_tokens)] : null,
    ['Price used', priceUsed(call.price)],
    ['Error', errorOf(call)],
    ['Trace', call.trace_id],
  ].filter((row) => row && row[1]);
  return (
    <div className="owner-call-body">
      <dl className="owner-call-rows">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {call.reply ? <TextViewer expanded title="Reply" value={call.reply} /> : null}
    </div>
  );
}

function Call({ call, expanded }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (expanded !== undefined) setOpen(expanded);
  }, [expanded]);
  return (
    <li className="owner-call" data-open={open ? 'true' : 'false'}>
      <button aria-expanded={open} className="owner-call-head" onClick={() => setOpen(!open)} type="button">
        <ExpandMoreRounded aria-hidden="true" className="owner-viewer-arrow" />
        <span className="owner-call-time">{clock(startOf(call))}</span>
        <span className="owner-call-step">{call.step || 'Call'}</span>
        <span className="owner-call-model">{model(call.model)}</span>
        <span className="owner-call-num">{duration((call.duration_ms || 0) / 1000)}</span>
        <span className="owner-call-num">{tokens(call.total_tokens)}</span>
        <span className="owner-call-num">
          {call.cost_usd !== null && call.cost_status === 'billed' ? (
            cost(call.cost_usd)
          ) : (
            <CostNote status={call.cost_status} />
          )}
        </span>
        <CallChip call={call} />
        {call.filled_in ? <FilledInTag /> : null}
      </button>
      {open ? <Details call={call} /> : null}
    </li>
  );
}

export default function LogTimeline({ calls, expanded }) {
  return (
    <ol className="owner-log">
      {calls.map((call, index) => (
        <Call call={call} expanded={expanded} key={`${call.occurred_at}-${index}`} />
      ))}
    </ol>
  );
}
