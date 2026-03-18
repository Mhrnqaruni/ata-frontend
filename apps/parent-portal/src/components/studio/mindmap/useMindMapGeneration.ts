/**
 * useMindMapGeneration Hook
 * Educational Note: Manages mind map generation from sources.
 * Creates hierarchical node structures for visualization.
 */

import { useState, useRef } from 'react';
import { mindMapsAPI, type MindMapJob } from '@/lib/api/studio';
import type { StudioSignal } from '../types';
import { useToast } from '../../ui/toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('mind-map-generation');

export const useMindMapGeneration = (projectId: string) => {
  const { success: showSuccess, error: showError } = useToast();

  const [savedMindMapJobs, setSavedMindMapJobs] = useState<MindMapJob[]>([]);
  const [currentMindMapJob, setCurrentMindMapJob] = useState<MindMapJob | null>(null);
  const [isGeneratingMindMap, setIsGeneratingMindMap] = useState(false);
  const pollingRef = useRef(false);
  const [viewingMindMapJob, setViewingMindMapJob] = useState<MindMapJob | null>(null);

  const loadSavedJobs = async () => {
    try {
      const mindMapResponse = await mindMapsAPI.listJobs(projectId);
      if (mindMapResponse.success && mindMapResponse.jobs) {
        const finishedJobs = mindMapResponse.jobs.filter(
          (job) => job.status === 'ready' || job.status === 'error'
        );
        setSavedMindMapJobs(finishedJobs);

        // Resume polling for in-progress jobs (survives refresh/navigation)
        if (!isGeneratingMindMap && !pollingRef.current) {
          const inProgressJob = mindMapResponse.jobs.find(
            (job) => job.status === 'pending' || job.status === 'processing'
          );
          if (inProgressJob) {
            pollingRef.current = true;
            setIsGeneratingMindMap(true);
            setCurrentMindMapJob(inProgressJob);
            try {
              const finalJob = await mindMapsAPI.pollJobStatus(
                projectId,
                inProgressJob.id,
                (job) => setCurrentMindMapJob(job)
              );
              if (finalJob.status === 'ready' || finalJob.status === 'error') {
                setSavedMindMapJobs((prev) => [finalJob, ...prev]);
              }
            } catch {
              // Polling failed — job stays visible via next load
            } finally {
              pollingRef.current = false;
              setIsGeneratingMindMap(false);
              setCurrentMindMapJob(null);
            }
          }
        }
      }
    } catch (error) {
      log.error({ err: error }, 'failed to load saved mind map jobs');
    }
  };

  const handleMindMapGeneration = async (signal: StudioSignal) => {
    const sourceId = signal.sources[0]?.source_id;
    if (!sourceId) {
      showError('No source specified for mind map generation.');
      return;
    }

    setIsGeneratingMindMap(true);
    setCurrentMindMapJob(null);

    try {
      const startResponse = await mindMapsAPI.startGeneration(
        projectId,
        sourceId,
        signal.direction
      );

      if (!startResponse.success || !startResponse.job_id) {
        showError(startResponse.error || 'Failed to start mind map generation.');
        setIsGeneratingMindMap(false);
        return;
      }

      showSuccess(`Generating mind map for ${startResponse.source_name}...`);

      const finalJob = await mindMapsAPI.pollJobStatus(
        projectId,
        startResponse.job_id,
        (job) => setCurrentMindMapJob(job)
      );

      setCurrentMindMapJob(finalJob);

      if (finalJob.status === 'ready') {
        showSuccess(`Generated mind map with ${finalJob.node_count} nodes!`);
        setSavedMindMapJobs((prev) => [finalJob, ...prev]);
        setViewingMindMapJob(finalJob); // Open modal to view
      } else if (finalJob.status === 'error') {
        showError(finalJob.error || 'Mind map generation failed.');
      }
    } catch (error) {
      log.error({ err: error }, 'LMind map generationE failed');
      showError(error instanceof Error ? error.message : 'Mind map generation failed.');
    } finally {
      setIsGeneratingMindMap(false);
      setCurrentMindMapJob(null);
    }
  };

  return {
    savedMindMapJobs,
    currentMindMapJob,
    isGeneratingMindMap,
    viewingMindMapJob,
    setViewingMindMapJob,
    loadSavedJobs,
    handleMindMapGeneration,
  };
};
