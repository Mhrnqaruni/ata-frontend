import test from 'node:test';
import assert from 'node:assert/strict';
import type { Source } from '../../lib/api/sources';
import type { StudioItemId, StudioSignal } from './types';
import { buildParentEffectiveSignals } from './StudioContext.helpers';

const QUIZ_DIRECTIONS = {
  quiz: 'Create quiz questions covering the key concepts from this source.',
} as unknown as Record<StudioItemId, string>;

const makeSource = (id: string, name = `${id}.pdf`): Source => ({
  id,
  project_id: 'project-1',
  name,
  description: '',
  file_size: 128,
  status: 'ready',
  active: true,
  processing_info: null,
  embedding_info: null,
  summary_info: null,
  raw_file_path: null,
  processed_file_path: null,
  error_message: null,
  url: null,
  created_at: '2026-03-15T00:00:00Z',
  updated_at: '2026-03-15T00:00:00Z',
});

const makeSignal = (id: string, sourceId: string, sourceName = `${sourceId}.pdf`): StudioSignal => ({
  id,
  studio_item: 'quiz',
  direction: 'Chat-created quiz direction',
  label: sourceName,
  sources: [{ source_id: sourceId, source_name: sourceName }],
  created_at: '2026-03-15T00:00:00Z',
});

const makeMultiSourceSignal = (id: string, sourceIds: string[]): StudioSignal => ({
  id,
  studio_item: 'quiz',
  direction: 'Chat-created quiz direction',
  label: 'Multi-source signal',
  sources: sourceIds.map((sourceId) => ({
    source_id: sourceId,
    source_name: `${sourceId}.pdf`,
  })),
  created_at: '2026-03-15T00:00:00Z',
});

test('parent effective signals synthesize from the current selected source when only stale chat signals exist', () => {
  const effectiveSignals = buildParentEffectiveSignals({
    signals: [makeSignal('signal-a', 'source-a')],
    allowedItemIds: ['quiz'],
    fallbackSources: [makeSource('source-b')],
    fallbackDirections: QUIZ_DIRECTIONS,
  });

  assert.equal(effectiveSignals.length, 1);
  assert.equal(effectiveSignals[0].id, 'fallback-quiz-source-b');
  assert.equal(effectiveSignals[0].sources[0]?.source_id, 'source-b');
  assert.equal(effectiveSignals[0].is_fallback, true);
});

test('parent effective signals keep only in-scope real signals when multiple chat signals exist', () => {
  const effectiveSignals = buildParentEffectiveSignals({
    signals: [
      makeSignal('signal-a', 'source-a'),
      makeSignal('signal-b', 'source-b'),
    ],
    allowedItemIds: ['quiz'],
    fallbackSources: [makeSource('source-b')],
    fallbackDirections: QUIZ_DIRECTIONS,
  });

  assert.equal(effectiveSignals.length, 1);
  assert.equal(effectiveSignals[0].id, 'signal-b');
  assert.equal(effectiveSignals[0].sources[0]?.source_id, 'source-b');
  assert.equal(effectiveSignals[0].is_fallback, undefined);
});

test('parent effective signals trim multi-source real signals down to the current source scope', () => {
  const effectiveSignals = buildParentEffectiveSignals({
    signals: [makeMultiSourceSignal('signal-ab', ['source-a', 'source-b'])],
    allowedItemIds: ['quiz'],
    fallbackSources: [makeSource('source-b')],
    fallbackDirections: QUIZ_DIRECTIONS,
  });

  assert.equal(effectiveSignals.length, 1);
  assert.equal(effectiveSignals[0].id, 'signal-ab');
  assert.equal(effectiveSignals[0].is_fallback, undefined);
  assert.deepEqual(
    effectiveSignals[0].sources.map((source) => source.source_id),
    ['source-b'],
  );
});
