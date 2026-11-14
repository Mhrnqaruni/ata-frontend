// "How cost is worked out": a closed disclosure at AI use's foot, with the price sets the estimates use (§3.7).
// Area: owner

import { useState } from 'react';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import { day, fullDay, model } from '../format';
import { usePrices } from '../ownerQueries';

const per = (value) => `$${Number(value).toFixed(2)}`;
// A price set applies up to, not on, its end day (prices.py: at < valid_to), so its last day is the day before:
// "1 Jan 2026 – 31 Dec 2026" (QA's Section 4 P2-2).
const lastDay = (end) => new Date(Date.parse(`${end}T00:00:00Z`) - 86400000);

export default function CostNotes() {
  const [open, setOpen] = useState(false);
  const prices = usePrices(open);
  return (
    <section className="owner-card owner-cost-notes" data-open={open ? 'true' : 'false'}>
      <button aria-expanded={open} className="owner-viewer-head" onClick={() => setOpen(!open)} type="button">
        <ExpandMoreRounded aria-hidden="true" className="owner-viewer-arrow" />
        <span>How cost is worked out</span>
      </button>
      {open ? (
        <div className="owner-cost-body">
          <ul>
            <li>Cost is an estimate from tokens and Google&apos;s list prices.</li>
            <li>Thinking is charged at the output price. Cached input is cheaper.</li>
            <li>A call that got no reply has no known cost, and is listed under Needs attention.</li>
            <li>
              Until 31 Dec 2026, Google bills the standard price and gives 50% back as credits, so the bill&apos;s lines
              differ.
            </li>
          </ul>
          {prices.data ? (
            <table className="owner-where-table owner-price-table">
              <caption>USD per million tokens</caption>
              <thead>
                <tr>
                  <th scope="col">Model</th>
                  <th scope="col">Endpoint</th>
                  <th scope="col">From</th>
                  <th scope="col">To</th>
                  <th scope="col">Input</th>
                  <th scope="col">Cached input</th>
                  <th scope="col">Output and thinking</th>
                  <th scope="col">Source</th>
                </tr>
              </thead>
              <tbody>
                {prices.data.items.map((price) => (
                  <tr key={`${price.model}-${price.endpoint}-${price.valid_from}`}>
                    <td>{model(price.model)}</td>
                    <td>{price.endpoint}</td>
                    <td>{fullDay(price.valid_from)}</td>
                    <td>{price.valid_to ? fullDay(lastDay(price.valid_to)) : '—'}</td>
                    <td>{per(price.input_usd_per_million)}</td>
                    <td>{per(price.cached_input_usd_per_million)}</td>
                    <td>{per(price.output_usd_per_million)}</td>
                    <td>
                      <a className="owner-link" href={price.source_url} rel="noreferrer" target="_blank">
                        Google
                      </a>{' '}
                      · checked {day(price.checked_on)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
