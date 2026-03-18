import type { Source } from '@/lib/api/sources';
import type { StudioItemId, StudioSignal } from './types';

interface BuildParentEffectiveSignalsParams {
  signals: StudioSignal[];
  allowedItemIds: StudioItemId[];
  fallbackSources: Source[];
  fallbackDirections: Record<StudioItemId, string>;
}

export const getSignalSourceIds = (signal: StudioSignal): string[] => (
  (signal.sources || [])
    .map((source) => source?.source_id)
    .filter((sourceId): sourceId is string => Boolean(sourceId))
);

export const trimSignalToSourceScope = (
  signal: StudioSignal,
  fallbackSourceIds: Set<string>,
): StudioSignal | null => {
  const scopedSources = (signal.sources || []).filter((source) => (
    Boolean(source?.source_id) && fallbackSourceIds.has(source.source_id)
  ));

  if (scopedSources.length === 0) {
    return null;
  }

  return {
    ...signal,
    sources: scopedSources,
  };
};

export const buildParentEffectiveSignals = ({
  signals,
  allowedItemIds,
  fallbackSources,
  fallbackDirections,
}: BuildParentEffectiveSignalsParams): StudioSignal[] => {
  if (fallbackSources.length === 0 || allowedItemIds.length === 0) {
    return signals;
  }

  const fallbackSourceIds = new Set(fallbackSources.map((source) => source.id));
  const parentSignals = allowedItemIds.flatMap((itemId) => {
    const existingSignals = signals.filter((signal) => signal.studio_item === itemId);
    const scopedSignals = existingSignals
      .map((signal) => trimSignalToSourceScope(signal, fallbackSourceIds))
      .filter((signal): signal is StudioSignal => signal !== null);

    if (scopedSignals.length > 0) {
      return scopedSignals;
    }

    return fallbackSources.map((source) => ({
      id: `fallback-${itemId}-${source.id}`,
      studio_item: itemId,
      direction: fallbackDirections[itemId],
      label: source.name || 'Ready source',
      is_fallback: true,
      sources: [{ source_id: source.id, source_name: source.name || undefined }],
      created_at: source.updated_at || source.created_at,
    }));
  });

  return parentSignals.length > 0 ? parentSignals : signals;
};
