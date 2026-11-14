// A chart card: one series per day as an area, days before "complete from" lighter, and a tooltip (§3.13, A2).
// One series at a time in the accent, with round y ticks, no axis lines and no animation (design §2, §10 A17).
// Area: owner

import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { day } from '../format';

// The tooltip: the date, then the value, then the extra lines (glass 2, from the theme's popover look).
function ChartTip({ active, payload, format, lines }) {
  const point = active ? payload?.[0]?.payload : null;
  if (!point) return null;
  return (
    <div className="owner-chart-tip">
      <span className="owner-chart-tip-day">{day(point.day)}</span>
      <strong>{format(point.value)}</strong>
      {(lines?.(point) || []).map((line) => (
        <span key={line}>{line}</span>
      ))}
    </div>
  );
}

export default function ChartCard({ title, action, points, format, axisFormat, lines, completeFrom, caption }) {
  // Days up to "complete from" draw in the lighter area, and both share that day, so the line never breaks.
  const data = points.map((point) => ({
    ...point,
    complete: !completeFrom || point.day >= completeFrom ? point.value : null,
    partial: completeFrom && point.day <= completeFrom ? point.value : null,
  }));
  const marker = completeFrom && points.some((point) => point.day < completeFrom) ? completeFrom : null;
  // The marker's words sit inside the chart: left of the line in its right half, else right of it (QA P3-6).
  const markerSide =
    points.findIndex((point) => point.day >= completeFrom) >= points.length / 2 ? 'insideTopRight' : 'insideTopLeft';
  return (
    <section className="owner-card owner-chart">
      <header className="mst-card-head owner-card-head">
        <h2>{title}</h2>
        {action}
      </header>
      {points.length < 2 ? (
        <div className="owner-chart-one">
          <strong>{format(points[0]?.value ?? 0)}</strong>
          <span>Charts need 2 days or more.</span>
        </div>
      ) : (
        <div className="owner-chart-body">
          <ResponsiveContainer height={220} width="100%">
            <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--mst-edge)" vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="day"
                minTickGap={24}
                tick={{ fill: 'var(--mst-ink-3)', fontSize: 12 }}
                tickFormatter={day}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tick={{ fill: 'var(--mst-ink-3)', fontSize: 12 }}
                tickCount={5}
                tickFormatter={axisFormat || format}
                tickLine={false}
                width={56}
              />
              <Tooltip
                content={<ChartTip format={format} lines={lines} />}
                cursor={{ stroke: 'var(--mst-edge-control)', strokeWidth: 1 }}
              />
              {marker ? (
                <ReferenceLine
                  label={{
                    value: `Complete records from ${day(marker)}`,
                    fill: 'var(--mst-ink-3)',
                    fontSize: 12,
                    offset: 8,
                    position: markerSide,
                  }}
                  stroke="var(--mst-edge-control)"
                  x={marker}
                />
              ) : null}
              <Area
                connectNulls={false}
                dataKey="partial"
                fill="var(--mst-accent)"
                fillOpacity={0.054}
                isAnimationActive={false}
                stroke="var(--mst-accent)"
                strokeOpacity={0.45}
                strokeWidth={2}
                type="monotone"
              />
              <Area
                connectNulls={false}
                dataKey="complete"
                fill="var(--mst-accent)"
                fillOpacity={0.12}
                isAnimationActive={false}
                stroke="var(--mst-accent)"
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      {caption ? <p className="owner-card-caption">{caption}</p> : null}
    </section>
  );
}
