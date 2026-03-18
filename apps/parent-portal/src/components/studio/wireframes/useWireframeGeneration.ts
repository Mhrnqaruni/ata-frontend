/**
 * useWireframeGeneration Hook
 * Educational Note: Manages Excalidraw wireframe generation from sources.
 * Creates UI/UX wireframes for visual prototyping.
 */

import { useState, useRef } from 'react';
import { wireframesAPI, type WireframeJob } from '@/lib/api/studio/wireframes';
import type { StudioSignal } from '../types';
import { useToast } from '../../ui/toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('wireframe-generation');

export const useWireframeGeneration = (projectId: string) => {
  const { success: showSuccess, error: showError } = useToast();

  const [savedWireframeJobs, setSavedWireframeJobs] = useState<WireframeJob[]>([]);
  const [currentWireframeJob, setCurrentWireframeJob] = useState<WireframeJob | null>(null);
  const [isGeneratingWireframe, setIsGeneratingWireframe] = useState(false);
  const pollingRef = useRef(false);
  const [viewingWireframeJob, setViewingWireframeJob] = useState<WireframeJob | null>(null);

  const loadSavedJobs = async () => {
    try {
      const response = await wireframesAPI.listJobs(projectId);
      if (response.success && response.jobs) {
        const finishedJobs = response.jobs.filter(
          (job) => job.status === 'ready' || job.status === 'error'
        );
        setSavedWireframeJobs(finishedJobs);

        // Resume polling for in-progress jobs (survives refresh/navigation)
        if (!isGeneratingWireframe && !pollingRef.current) {
          const inProgressJob = response.jobs.find(
            (job) => job.status === 'pending' || job.status === 'processing'
          );
          if (inProgressJob) {
            pollingRef.current = true;
            setIsGeneratingWireframe(true);
            setCurrentWireframeJob(inProgressJob);
            try {
              const finalJob = await wireframesAPI.pollJobStatus(
                projectId,
                inProgressJob.id,
                (job) => setCurrentWireframeJob(job)
              );
              if (finalJob.status === 'ready' || finalJob.status === 'error') {
                setSavedWireframeJobs((prev) => [finalJob, ...prev]);
              }
            } catch {
              // Polling failed — job stays visible via next load
            } finally {
              pollingRef.current = false;
              setIsGeneratingWireframe(false);
              setCurrentWireframeJob(null);
            }
          }
        }
      }
    } catch (error) {
      log.error({ err: error }, 'failed to load saved wireframe jobs');
    }
  };

  const handleWireframeGeneration = async (signal: StudioSignal) => {
    const sourceId = signal.sources[0]?.source_id;

    setIsGeneratingWireframe(true);
    setCurrentWireframeJob(null);

    try {
      const startResponse = await wireframesAPI.startGeneration(
        projectId,
        sourceId,
        signal.direction
      );

      if (!startResponse.success || !startResponse.job_id) {
        showError(startResponse.error || 'Failed to start wireframe generation.');
        setIsGeneratingWireframe(false);
        return;
      }

      showSuccess(`Generating wireframe for ${startResponse.source_name}...`);

      const finalJob = await wireframesAPI.pollJobStatus(
        projectId,
        startResponse.job_id,
        (job) => setCurrentWireframeJob(job)
      );

      setCurrentWireframeJob(finalJob);

      if (finalJob.status === 'ready') {
        showSuccess(`Generated wireframe: ${finalJob.title} (${finalJob.element_count} elements)`);
        setSavedWireframeJobs((prev) => [finalJob, ...prev]);
        setViewingWireframeJob(finalJob); // Open modal to view
      } else if (finalJob.status === 'error') {
        showError(finalJob.error || 'Wireframe generation failed.');
      }
    } catch (error) {
      log.error({ err: error }, 'LWireframe generationE failed');
      showError(error instanceof Error ? error.message : 'Wireframe generation failed.');
    } finally {
      setIsGeneratingWireframe(false);
      setCurrentWireframeJob(null);
    }
  };

  return {
    savedWireframeJobs,
    currentWireframeJob,
    isGeneratingWireframe,
    viewingWireframeJob,
    setViewingWireframeJob,
    loadSavedJobs,
    handleWireframeGeneration,
  };
};
