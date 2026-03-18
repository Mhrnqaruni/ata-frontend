import test from 'node:test';
import assert from 'node:assert/strict';

import type { QuizJob } from '../../../lib/api/studio/quizzes';
import {
  getQuizJobErrorMessage,
  isQuizJobErrored,
  isQuizJobReady,
  upsertQuizJob,
} from './quizState';

const makeQuizJob = (overrides: Partial<QuizJob> = {}): QuizJob => ({
  id: 'quiz-1',
  source_id: 'source-1',
  source_name: 'Source One',
  direction: 'Create a quiz',
  status: 'ready',
  progress: 'Complete',
  error: null,
  questions: [
    {
      id: 'q1',
      question: 'Question?',
      options: [
        { id: 'a', text: 'A' },
        { id: 'b', text: 'B' },
      ],
      correct_answers: ['a'],
      is_multi_select: false,
      hint: '',
      explanation: 'Because.',
    },
  ],
  topic_summary: 'Summary',
  question_count: 1,
  generation_time_seconds: 1,
  created_at: '2026-03-15T00:00:00Z',
  started_at: '2026-03-15T00:00:01Z',
  completed_at: '2026-03-15T00:00:02Z',
  ...overrides,
});

test('upsertQuizJob replaces an existing quiz job by id', () => {
  const existing = makeQuizJob();
  const updated = makeQuizJob({
    question_count: 4,
    progress: 'Failed',
    status: 'error',
    error: 'boom',
    questions: [],
  });

  const jobs = upsertQuizJob([existing], updated);

  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].id, 'quiz-1');
  assert.equal(jobs[0].status, 'error');
  assert.equal(jobs[0].error, 'boom');
});

test('quiz state helpers identify ready and errored jobs correctly', () => {
  const readyJob = makeQuizJob();
  const erroredJob = makeQuizJob({
    id: 'quiz-2',
    status: 'error',
    error: 'Failed to generate quiz',
    questions: [],
    question_count: 0,
  });

  assert.equal(isQuizJobReady(readyJob), true);
  assert.equal(isQuizJobErrored(readyJob), false);
  assert.equal(isQuizJobReady(erroredJob), false);
  assert.equal(isQuizJobErrored(erroredJob), true);
  assert.equal(getQuizJobErrorMessage(erroredJob), 'Failed to generate quiz');
});
