// Home's chart hook against QA's saved answers: one summary call that doesn't wait for the list, no timed repeat,
// a reload only when the list really changes, and the same figures as the per-assessment /overview calls gave
// before Phase 1.35 (C1, QA-1).
// Area: analytics
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { buildPerformanceSeries } from '../src/components/home/performanceData.js';

// The hook as written, with stand-ins for React, React Query, the signed-in user, the session counter and the API
// client: useQuery records the options the hook asks for, the query client records what it invalidates, the effect
// runs at once with one ref (one mounted Home), and each test answers api.get itself.
const standIns = {
  react:
    "const ref = { current: '' }; export const refs = ref; export const useRef = () => ref;" +
    ' export const useEffect = (effect) => effect();',
  'react-query':
    'export const asked = []; export const invalidated = [];' +
    ' export const useQuery = (options) => (asked.push(options), {});' +
    ' export const useQueryClient = () => ({ invalidateQueries: (filter) => invalidated.push(filter) });',
  useAuth: "export const useAuth = () => ({ user: { id: 'teacher-1' } });",
  queryCache: 'export const sessionGeneration = () => 0;',
  api: 'export default {};',
};
const bundle = await build({
  stdin: {
    contents: `export { default as usePerformance } from './src/components/home/usePerformance';
export { default as api } from './src/services/api';
export { asked, invalidated } from '@tanstack/react-query';
export { refs } from 'react';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
  logLevel: 'error',
  plugins: [
    {
      name: 'stand-ins',
      setup(build) {
        build.onResolve({ filter: /(^|\/)(react|react-query|useAuth|queryCache|api)$/ }, (args) => ({
          path: args.path.split('/').pop(),
          namespace: 'stand-in',
        }));
        build.onLoad({ filter: /.*/, namespace: 'stand-in' }, (args) => ({ contents: standIns[args.path] }));
      },
    },
  ],
});
// The bundle imports nothing, so it loads straight from memory.
const { usePerformance, api, asked, invalidated, refs } = await import(
  `data:text/javascript,${encodeURIComponent(bundle.outputFiles[0].text)}`
);

// The query the hook asks React Query for, given the list's assessments.
function queryFor(assessments) {
  asked.length = 0;
  usePerformance(assessments);
  return asked[0];
}
const signal = new AbortController().signal;
const job = (id, status, createdAt) => ({ id, status, createdAt });
const row = (entityId, status, totalScore, maxTotalScore) => ({
  entityId,
  status,
  isAbsent: false,
  totalScore,
  maxTotalScore,
});

// QA's before copies of the dev test account (Phase 1.35 QA tools, before/assessments.json and overview/*.json):
// the list, and each finished assessment's graded rows in /overview's order, with the student ids replaced. The
// absent and pending rows are left out, because the chart skips them.
const list = [
  job('job_8016ece1d94947e7', 'Pending Review', '2026-11-04T20:55:24.746075+01:00'),
  job('job_27c6f911da87455f99c9bd8c0198246c', 'Pending Review', '2026-11-04T20:26:24.065255+01:00'),
  job('job_7279e078cb714d0a925eb2fa833fab5a', 'Failed', '2026-11-04T20:13:59.923699+01:00'),
  job('job_c2b213984dcc413c947e6afcc5dd4928', 'Pending Review', '2026-11-04T19:42:00.382867+01:00'),
  job('job_e3424c12bb8a491db92e7451e299cd4b', 'Completed', '2026-11-04T19:10:51.763387+01:00'),
  job('job_859e893d59ee4f70', 'Pending Review', '2026-11-04T19:08:14.962301+01:00'),
  job('job_310031a398ff4be1', 'Failed', '2026-11-04T18:58:14.367050+01:00'),
  job('job_c1d31538b4454df2', 'Pending Review', '2026-11-04T18:52:21.350168+01:00'),
  job('job_eee222790fbb457c', 'Pending Review', '2026-11-03T19:26:41.407170+01:00'),
  job('job_5b4b60a13ddb42ab', 'Pending Review', '2026-11-03T16:27:16.781549+01:00'),
  job('job_bfb398a6a2f441dd', 'Completed', '2026-11-03T05:28:59.755928+01:00'),
  job('job_fe79e4e28d854359', 'Pending Review', '2026-11-03T04:53:33.278847+01:00'),
  job('job_cbe1aacfbaa44835', 'Completed', '2026-11-02T17:35:08.193207+01:00'),
  job('job_34ef6e821a0545ea', 'Pending Review', '2026-11-02T16:57:46.201289+01:00'),
  job('job_cb5de15633444b4a', 'Completed', '2026-11-02T16:57:30.352078+01:00'),
  job('job_e54c06364348418d', 'Completed', '2026-11-02T14:29:12.247317+01:00'),
  job('job_c950287a04d1410a', 'Completed', '2026-11-02T13:46:01.236208+01:00'),
  job('job_cfe71d1a094d4095', 'Failed', '2026-11-02T13:44:32.607398+01:00'),
  job('job_71b48e1c33b244c7', 'Completed', '2026-11-02T13:44:09.106845+01:00'),
  job('job_3b54663089c34ad4', 'Completed', '2026-11-02T13:43:45.764077+01:00'),
  job('job_6b831ce72e4f43e8', 'Completed', '2026-11-02T13:15:17.545164+01:00'),
  job('job_ec955ab10b7f4813', 'Failed', '2026-11-02T13:08:24.357731+01:00'),
  job('job_a6bf4a483e274ad9', 'Completed', '2026-11-02T12:50:32.618969+01:00'),
  job('job_a681d6ee33fc4370', 'Pending Review', '2026-11-01T15:42:29.189192+01:00'),
  job('job_c72c07a46cfb44c9', 'Completed', '2026-11-01T14:57:22.466557+01:00'),
];
const graded = {
  job_e3424c12bb8a491db92e7451e299cd4b: [
    row('s01', 'AI_GRADED', 20, 24),
    row('s02', 'AI_GRADED', 23, 24),
    row('s03', 'AI_GRADED', 21, 24),
  ],
  job_bfb398a6a2f441dd: [row('s04', 'AI_GRADED', 2, 2)],
  job_cbe1aacfbaa44835: [row('s05', 'AI_GRADED', 3, 3)],
  job_cb5de15633444b4a: [row('s06', 'AI_GRADED', 3, 3), row('s07', 'AI_GRADED', 3, 3), row('s08', 'AI_GRADED', 3, 3)],
  job_e54c06364348418d: [row('s09', 'AI_GRADED', 3, 3)],
  job_c950287a04d1410a: [row('s05', 'AI_GRADED', 3, 3)],
  job_71b48e1c33b244c7: [row('s10', 'AI_GRADED', 1, 3), row('s09', 'AI_GRADED', 3, 3)],
  job_3b54663089c34ad4: [row('s11', 'AI_GRADED', 3, 3), row('s12', 'AI_GRADED', 3, 3), row('s13', 'AI_GRADED', 3, 3)],
  job_6b831ce72e4f43e8: [row('s14', 'AI_GRADED', 3, 3), row('s15', 'AI_GRADED', 3, 3)],
  job_a6bf4a483e274ad9: [
    row('s16', 'TEACHER_GRADED', 80, 100),
    row('s17', 'AI_GRADED', 92, 100),
    row('s18', 'TEACHER_GRADED', 91, 100),
  ],
  job_c72c07a46cfb44c9: [row('s04', 'TEACHER_GRADED', 2, 2)],
};
// before/chart.json: Home's chart computed the old way from those copies, 92.39 % over 18 students on 4 days.
const chartBefore = {
  latest: { id: 'job_e3424c12bb8a491db92e7451e299cd4b', average: 92.38888888888889, graded: 18, label: '' },
  items: [
    { id: 'job_c72c07a46cfb44c9', average: 100, graded: 1, label: '', date: '2026-11-01' },
    { id: 'job_cbe1aacfbaa44835', average: 93.0888888888889, graded: 15, label: '', date: '2026-11-02' },
    { id: 'job_bfb398a6a2f441dd', average: 93.0888888888889, graded: 15, label: '', date: '2026-11-03' },
    {
      id: 'job_e3424c12bb8a491db92e7451e299cd4b',
      average: 92.38888888888889,
      graded: 18,
      label: '',
      date: '2026-11-04',
    },
  ],
};

test('one summary call gives the figures the per-assessment overview calls gave, with no timed repeat', async () => {
  const finished = list.filter((item) => ['Completed', 'Pending Review'].includes(item.status));
  // The summary sends the finished assessments with their dates, here in another order than the list's.
  const summary = {
    assessments: finished
      .map((item) => ({ id: item.id, createdAt: item.createdAt, students: graded[item.id] ?? [] }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
  const calls = [];
  api.get = async (url, options) => {
    calls.push([url, options.signal]);
    return { data: summary };
  };
  const query = queryFor(list);
  const figures = await query.queryFn({ signal });
  // Before: one /overview call per finished assessment, each adding its students to the list's entry.
  const perOverview = buildPerformanceSeries(finished.map((item) => ({ ...item, students: graded[item.id] ?? [] })));
  assert.deepEqual(figures, perOverview);
  assert.deepEqual(figures, chartBefore);
  assert.deepEqual(calls, [['/api/assessments/performance', signal]]);
  assert.equal(query.refetchInterval, undefined);
  assert.equal(query.refetchIntervalInBackground, undefined);
  assert.equal(query.refetchOnWindowFocus, false);
});

test('the summary alone makes the chart: its dates count, and absent or pending rows add nothing', async () => {
  api.get = async () => ({
    data: {
      assessments: [
        { id: 'a', createdAt: '2026-11-01T09:00:00+00:00', students: [] },
        {
          id: 'b',
          createdAt: '2026-11-02T09:00:00+00:00',
          students: [
            row('s1', 'TEACHER_GRADED', 8, 10),
            { entityId: 's2', status: 'ABSENT', isAbsent: true, totalScore: null, maxTotalScore: 10 },
            { entityId: 's3', status: 'PENDING_REVIEW', isAbsent: false, totalScore: null, maxTotalScore: 10 },
          ],
        },
      ],
    },
  });
  const latest = { id: 'b', average: 80, graded: 1, label: '' };
  assert.deepEqual(await queryFor(null).queryFn({ signal }), { latest, items: [{ ...latest, date: '2026-11-02' }] });
});

test("the chart's call starts before the list arrives, under a key without the list", async () => {
  const query = queryFor(null);
  assert.equal(query.enabled, true);
  assert.deepEqual(query.queryKey, ['teacher', 0, 'teacher-1', 'performance']);
  api.get = async () => ({ data: { assessments: [] } });
  assert.deepEqual(await query.queryFn({ signal }), { latest: null, items: [] });
});

test("only a real change in the list reloads the chart, never the list's first arrival", () => {
  refs.current = '';
  invalidated.length = 0;
  queryFor(null); // the list hasn't arrived yet
  queryFor(list); // its first arrival
  queryFor(list); // a poll with nothing changed
  assert.equal(invalidated.length, 0);
  const changed = list.map((item) => (item.id === 'job_8016ece1d94947e7' ? { ...item, status: 'Completed' } : item));
  queryFor(changed);
  assert.deepEqual(invalidated, [{ queryKey: ['teacher', 0, 'teacher-1', 'performance'] }]);
  queryFor(null); // a list reload in between keeps the last list
  queryFor(changed);
  queryFor(changed.filter((item) => item.status !== 'Failed')); // only unfinished assessments differ
  assert.equal(invalidated.length, 1);
});
