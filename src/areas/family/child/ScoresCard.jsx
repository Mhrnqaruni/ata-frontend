// The child profile's "How Sam is doing" card (Phase 1.38 design §3.4): homework or quiz scores as a line, with a
// caption, a tooltip on each dot, the trend in one sentence, and the same data as a hidden table. A dot opens its result.
// Area: family

import { useId, useMemo, useRef, useState } from 'react';
import { Button, Tab, Tabs, Tooltip, useMediaQuery } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../../hooks/useAuth';
import { sessionGeneration } from '../../../services/queryCache';
import { familyApi, familyKeys } from '../familyApi';
import { ukDate } from '../familyWords';
import { dayMonth, pointLabel, scorePoints, trendWords } from '../scoresSeries';
import './scoresCard.css';

// The switch's two sides: the list's kind, their words (design §3.4), and a data-mst name for the UI log.
const SIDES = [
  {
    kind: 'check',
    label: 'Homework',
    chart: 'Homework scores over time',
    caption: (name) => `Each dot is one homework check, by the day it was marked: how much ${name} got right.`,
    mst: 'homework',
  },
  {
    kind: 'quiz',
    label: 'Quizzes',
    chart: 'Quiz scores over time',
    caption: (name) => `Each dot is one quiz, by the day ${name} tried it: how much ${name} got right.`,
    mst: 'quizzes',
  },
];
// A 200 px plot, with room above it for the latest score's label and below it for the 12 px dates.
const MARGIN = { top: 28, right: 12, bottom: 0, left: 0 };
const AXIS = 28;
const HEIGHT = MARGIN.top + 200 + AXIS;
// Under 600 px the chart is 180 px tall, so Your chats starts above the fold (row 3's tester: "the chart fills the
// whole phone screen for one dot").
const PHONE_HEIGHT = 180;
const PHONE = '(max-width:599.95px)';

/**
 * The card for one child. `onOpen(item)` opens a result from its activity-list item; the page turns it into the
 * result's address. It reads one list of the chosen kind, the newest 50 (SOT C-24), and doesn't poll: it refreshes
 * with the child's other lists (B10).
 */
export default function ScoresCard({ childId, childName, onOpen }) {
  const userId = useAuth().user?.id;
  const [kind, setKind] = useState('check');
  const side = SIDES.find((option) => option.kind === kind);
  // Phones: the switch goes under the title at full width, and only the first and last dates show.
  const phone = useMediaQuery(PHONE, { noSsr: true });
  const id = useId();
  const filter = { kind, limit: 50 };
  const list = useQuery({
    queryKey: familyKeys.activities(sessionGeneration(), userId, childId, filter),
    queryFn: ({ signal }) => familyApi.listActivities(childId, filter, { signal }),
    enabled: Boolean(userId && childId),
  });
  const items = list.data?.items;
  const points = useMemo(() => scorePoints(items), [items]);
  const words = trendWords(points, kind, childName);

  let body;
  if (!items && list.isError) {
    body = (
      <p className="fam-scores-error">
        Could not load {childName}’s scores.
        <Button onClick={() => list.refetch()} data-mst="retry">
          Try again
        </Button>
      </p>
    );
  } else if (!items) {
    body = <div className="fam-scores-wait" style={{ height: phone ? PHONE_HEIGHT : HEIGHT }} aria-hidden />;
  } else {
    // With no score yet there's no chart and no caption: only the sentence saying when scores appear.
    const shown = points.length > 0;
    body = (
      <>
        {shown && <p className="fam-scores-caption">{side.caption(childName)}</p>}
        {shown && <ScoresChart points={points} label={side.chart} phone={phone} onOpen={onOpen} />}
        <p className="fam-scores-trend">
          {words.lead}
          {words.strong && <strong>{words.strong}</strong>}
          {words.tail}
        </p>
        {list.isError && <p className="fam-scores-note">Could not refresh. Showing what was saved.</p>}
        {shown && (
          <table className="fam-sr">
            <caption>{side.chart}</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Name</th>
                <th scope="col">Score</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.id}>
                  <td>{ukDate(point.at)}</td>
                  <td>{point.title}</td>
                  <td>{point.percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </>
    );
  }
  return (
    <section
      className="mst-g1 mst-rim fam-scores"
      aria-labelledby={`${id}-title`}
      aria-busy={!items && !list.isError}
      data-mst="family-scores"
    >
      <div className="fam-scores-head">
        <h2 id={`${id}-title`} className="mst-card-title">
          How {childName} is doing
        </h2>
        {/* Teacher's segmented control: the theme's Tabs, a pill that slides (design §3.4). */}
        <Tabs
          value={kind}
          onChange={(event, value) => setKind(value)}
          aria-labelledby={`${id}-title`}
          selectionFollowsFocus
          variant={phone ? 'fullWidth' : 'standard'}
          className="fam-scores-switch"
        >
          {SIDES.map((option) => (
            <Tab
              key={option.kind}
              value={option.kind}
              label={option.label}
              id={`${id}-${option.kind}`}
              aria-controls={`${id}-panel`}
              data-mst={option.mst}
            />
          ))}
        </Tabs>
      </div>
      <div className="fam-scores-body" role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${kind}`}>
        {body}
      </div>
    </section>
  );
}

// One dot per score in time order, joined by a line, with gridlines at 0, 50 and 100% and the latest score labelled.
// The dots sit evenly, one per item. Each has a 44 px target and a tooltip; the latest is the chart's one tab stop,
// and the arrow keys move between dots. On phones only the first and last dates show, so labels never touch.
function ScoresChart({ points, label, phone, onOpen }) {
  const dots = useRef([]);
  const last = points.length - 1;
  const dates = new Map(points.map((point) => [point.id, dayMonth(point.at)]));
  const ends = [...new Set([points[0].id, points[last].id])];
  function onKey(event, index, item) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen(item);
      return;
    }
    const next = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: last }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    dots.current[Math.min(Math.max(next, 0), last)]?.focus();
  }
  return (
    <div className="fam-scores-chart" role="group" aria-label={label}>
      <ResponsiveContainer width="100%" height={phone ? PHONE_HEIGHT : HEIGHT}>
        <LineChart data={points} margin={MARGIN}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="id"
            tickFormatter={(value) => dates.get(value)}
            ticks={phone ? ends : undefined}
            interval={phone ? 0 : 'preserveStartEnd'}
            minTickGap={24}
            padding={{ left: 24, right: 24 }}
            height={AXIS}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 50, 100]}
            tickFormatter={(value) => `${value}%`}
            width={44}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Line
            dataKey="percent"
            type="linear"
            isAnimationActive={false}
            activeDot={false}
            dot={({ cx, cy, index, payload }) => {
              const latest = index === last;
              const text = pointLabel(payload);
              return (
                <Tooltip key={payload.id} title={text} placement="top">
                  <g
                    ref={(element) => {
                      dots.current[index] = element;
                    }}
                    className="fam-scores-dot"
                    data-latest={latest}
                    role="button"
                    tabIndex={latest ? 0 : -1}
                    aria-label={text}
                    data-mst="dot"
                    onClick={() => onOpen(payload.item)}
                    onKeyDown={(event) => onKey(event, index, payload.item)}
                  >
                    <circle className="fam-scores-hit" cx={cx} cy={cy} r={22} />
                    <circle className="fam-scores-ring" cx={cx} cy={cy} r={latest ? 10.5 : 9} />
                    <circle className="fam-scores-mark" cx={cx} cy={cy} r={latest ? 6.5 : 5} />
                    {latest && (
                      <text className="fam-scores-latest" x={cx + 8} y={cy - 14} textAnchor="end">
                        {payload.percent}%
                      </text>
                    )}
                  </g>
                </Tooltip>
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
