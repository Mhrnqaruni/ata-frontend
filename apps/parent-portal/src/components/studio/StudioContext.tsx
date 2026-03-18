/* eslint-disable react-refresh/only-export-components */
/**
 * StudioContext
 * Educational Note: Provides shared state for Studio panel.
 * Only contains data needed by multiple sections - each section owns its own job state.
 * This eliminates prop drilling while keeping sections isolated.
 */

import React, { createContext, useContext, useMemo, useCallback, useState } from 'react';
import type { StudioSignal, StudioItemId, ParentWorkspaceToolKey } from './types';
import { generationOptions, getAllowedStudioItemIds } from './types';
import { createLogger } from '@/lib/logger';
import type { Source } from '@/lib/api/sources';
import { buildParentEffectiveSignals } from './StudioContext.helpers';

const log = createLogger('studio-context');

interface StudioContextValue {
  // Core shared state
  projectId: string;
  signals: StudioSignal[];
  allowedItemIds: StudioItemId[];
  isParentWorkspace: boolean;

  // Memoized Set for O(1) source filtering - replaces O(n^2) nested .some() calls
  validSourceIds: Set<string>;

  // Signal picker state (shared because it's triggered from StudioToolsList)
  pickerOpen: boolean;
  setPickerOpen: (open: boolean) => void;
  selectedItem: StudioItemId | null;
  selectedSignals: StudioSignal[];

  // Generation trigger - called by signal picker after selection
  triggerGeneration: (optionId: StudioItemId, signal: StudioSignal) => void;

  // Register generation handler from sections
  registerGenerationHandler: (itemId: StudioItemId, handler: (signal: StudioSignal) => Promise<void>) => void;

  // Handle generate request from tools list
  handleGenerate: (optionId: StudioItemId, itemSignals: StudioSignal[]) => void;

  // Utility functions
  getItemTitle: (itemId: StudioItemId) => string;
  getItemIcon: (itemId: StudioItemId) => React.ComponentType<{ size?: number; className?: string }> | undefined;
}

const StudioContext = createContext<StudioContextValue | null>(null);

interface StudioProviderProps {
  projectId: string;
  signals: StudioSignal[];
  isParentWorkspace?: boolean;
  allowedToolKeys?: ParentWorkspaceToolKey[];
  availableSources?: Source[];
  selectedSourceIds?: string[];
  children: React.ReactNode;
}

const FALLBACK_DIRECTIONS: Record<StudioItemId, string> = {
  quiz: 'Create quiz questions covering the key concepts from this source.',
  flash_cards: 'Create flash cards covering the key concepts from this source.',
  audio_overview: 'Create an audio overview summarizing this source.',
  mind_map: 'Create a mind map covering the key concepts and their relationships from this source.',
  business_report: 'Create a business report from this source.',
  marketing_strategy: 'Create a marketing strategy from this source.',
  ads_creative: 'Create ad creative ideas from this source.',
  email_templates: 'Create email templates from this source.',
  social: 'Create social content from this source.',
  blog: 'Create a blog post from this source.',
  website: 'Create website copy from this source.',
  components: 'Create UI component ideas from this source.',
  infographics: 'Create an infographic plan from this source.',
  flow_diagram: 'Create a flow diagram from this source.',
  wireframes: 'Create wireframes from this source.',
  prd: 'Create a PRD from this source.',
  presentation: 'Create a presentation from this source.',
  video: 'Create a video plan from this source.',
};

export const StudioProvider: React.FC<StudioProviderProps> = ({
  projectId,
  signals,
  isParentWorkspace = false,
  allowedToolKeys = [],
  availableSources = [],
  selectedSourceIds = [],
  children,
}) => {
  // Signal picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StudioItemId | null>(null);
  const [selectedSignals, setSelectedSignals] = useState<StudioSignal[]>([]);

  // Registry of generation handlers from sections
  const [generationHandlers] = useState<Map<StudioItemId, (signal: StudioSignal) => Promise<void>>>(
    () => new Map()
  );

  const allowedItemIds = useMemo(
    () => getAllowedStudioItemIds(allowedToolKeys, isParentWorkspace),
    [allowedToolKeys, isParentWorkspace],
  );

  const readySources = useMemo(
    () => availableSources.filter((source) => source.status === 'ready'),
    [availableSources],
  );

  const fallbackSources = useMemo(() => {
    if (!isParentWorkspace || readySources.length === 0) {
      return [];
    }

    const selectedReadySources = selectedSourceIds.length === 0
      ? readySources
      : readySources.filter((source) => selectedSourceIds.includes(source.id));

    return selectedReadySources.length > 0 ? selectedReadySources : readySources;
  }, [isParentWorkspace, readySources, selectedSourceIds]);

  const effectiveSignals = useMemo(() => {
    if (!isParentWorkspace || fallbackSources.length === 0 || allowedItemIds.length === 0) {
      return signals;
    }

    return buildParentEffectiveSignals({
      signals,
      allowedItemIds,
      fallbackSources,
      fallbackDirections: FALLBACK_DIRECTIONS,
    });
  }, [allowedItemIds, fallbackSources, isParentWorkspace, signals]);

  // Memoized Set of valid source IDs for O(1) filtering
  // This replaces the O(n^2) pattern: signals.some(s => s.sources.some(src => src.source_id === job.source_id))
  const validSourceIds = useMemo(() => {
    if (isParentWorkspace && fallbackSources.length > 0) {
      return new Set(fallbackSources.map((source) => source.id));
    }

    const ids = new Set<string>();
    effectiveSignals.forEach((signal) => {
      const signalSources = signal.sources || [];
      signalSources.forEach((source) => {
        if (source?.source_id) {
          ids.add(source.source_id);
        }
      });
    });
    return ids;
  }, [effectiveSignals, fallbackSources, isParentWorkspace]);

  // Register a generation handler from a section
  const registerGenerationHandler = useCallback((
    itemId: StudioItemId,
    handler: (signal: StudioSignal) => Promise<void>
  ) => {
    generationHandlers.set(itemId, handler);
  }, [generationHandlers]);

  // Get display name for a studio item
  const getItemTitle = useCallback((itemId: StudioItemId): string => {
    const option = generationOptions.find((opt) => opt.id === itemId);
    return option?.title || itemId;
  }, []);

  // Get icon for a studio item
  const getItemIcon = useCallback((itemId: StudioItemId) => {
    const option = generationOptions.find((opt) => opt.id === itemId);
    return option?.icon;
  }, []);

  // Trigger the actual generation workflow
  const triggerGeneration = useCallback(async (optionId: StudioItemId, signal: StudioSignal) => {
    setPickerOpen(false);

    const handler = generationHandlers.get(optionId);
    if (handler) {
      log.debug('calling handler for: %s signal: %o', optionId, signal);
      try {
        await handler(signal);
      } catch (error) {
        log.error({ err: error }, 'generation handler threw error for: %s', optionId);
      }
    } else {
      log.warn('no handler registered for: %s, registered: %o', optionId, [...generationHandlers.keys()]);
    }
  }, [generationHandlers]);

  // Handle generation request from tools list
  // If multiple signals exist for an item, show picker. Otherwise generate directly.
  const handleGenerate = useCallback((optionId: StudioItemId, itemSignals: StudioSignal[]) => {
    if (itemSignals.length === 0) {
      log.warn('handleGenerate called with 0 signals for: %s', optionId);
      return;
    }

    log.debug('handleGenerate dispatching: %s signals: %d', optionId, itemSignals.length);
    if (itemSignals.length === 1) {
      // Single signal - generate directly
      triggerGeneration(optionId, itemSignals[0]);
    } else {
      // Multiple signals - show picker
      setSelectedItem(optionId);
      setSelectedSignals(itemSignals);
      setPickerOpen(true);
    }
  }, [triggerGeneration]);

  const value = useMemo<StudioContextValue>(() => ({
    projectId,
    signals: effectiveSignals,
    allowedItemIds,
    isParentWorkspace,
    validSourceIds,
    pickerOpen,
    setPickerOpen,
    selectedItem,
    selectedSignals,
    triggerGeneration,
    registerGenerationHandler,
    handleGenerate,
    getItemTitle,
    getItemIcon,
  }), [
    projectId,
    effectiveSignals,
    allowedItemIds,
    isParentWorkspace,
    validSourceIds,
    pickerOpen,
    selectedItem,
    selectedSignals,
    triggerGeneration,
    registerGenerationHandler,
    handleGenerate,
    getItemTitle,
    getItemIcon,
  ]);

  return (
    <StudioContext.Provider value={value}>
      {children}
    </StudioContext.Provider>
  );
};

/**
 * Hook to access studio context
 * Throws if used outside StudioProvider
 */
export const useStudioContext = (): StudioContextValue => {
  const context = useContext(StudioContext);
  if (!context) {
    throw new Error('useStudioContext must be used within a StudioProvider');
  }
  return context;
};

/**
 * Hook to filter jobs by valid source IDs
 * Uses the memoized Set for O(1) lookups instead of O(n^2) nested .some() calls
 */
export const useFilteredJobs = <T extends { source_id: string | null }>(jobs: T[]): T[] => {
  const { validSourceIds } = useStudioContext();

  return useMemo(() => {
    // Jobs without a source_id (generated from direction alone) are always shown
    return jobs.filter(job => !job.source_id || validSourceIds.has(job.source_id));
  }, [jobs, validSourceIds]);
};
