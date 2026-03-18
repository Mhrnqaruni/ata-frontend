/**
 * usePresentationGeneration Hook
 * Educational Note: Custom hook for presentation generation logic.
 * Handles state management, API calls, and polling.
 */

import { useState, useRef } from 'react';
import { presentationsAPI, type PresentationJob } from '@/lib/api/studio';
import { getAuthUrl } from '@/lib/api/client';
import { useToast } from '../../ui/toast';
import type { StudioSignal } from '../types';
import { createLogger } from '@/lib/logger';

const log = createLogger('presentation-generation');

export const usePresentationGeneration = (projectId: string) => {
  const { success: showSuccess, error: showError } = useToast();

  // State
  const [savedPresentationJobs, setSavedPresentationJobs] = useState<PresentationJob[]>([]);
  const [currentPresentationJob, setCurrentPresentationJob] = useState<PresentationJob | null>(null);
  const [isGeneratingPresentation, setIsGeneratingPresentation] = useState(false);
  const pollingRef = useRef(false);
  const [viewingPresentationJob, setViewingPresentationJob] = useState<PresentationJob | null>(null);

  /**
   * Load saved presentation jobs from backend
   */
  const loadSavedJobs = async () => {
    try {
      const response = await presentationsAPI.listJobs(projectId);
      if (response.success && response.jobs) {
        // Show fully exported presentations + error jobs
        const finishedJobs = response.jobs.filter(
          (job) =>
            (job.status === 'ready' && job.export_status === 'ready') ||
            job.status === 'error'
        );
        setSavedPresentationJobs(finishedJobs);

        // Resume polling for in-progress jobs (survives refresh/navigation)
        if (!isGeneratingPresentation && !pollingRef.current) {
          const inProgressJob = response.jobs.find(
            (job) => job.status === 'pending' || job.status === 'processing'
          );
          if (inProgressJob) {
            pollingRef.current = true;
            setIsGeneratingPresentation(true);
            setCurrentPresentationJob(inProgressJob);
            try {
              const finalJob = await presentationsAPI.pollJobStatus(
                projectId,
                inProgressJob.id,
                (job) => setCurrentPresentationJob(job)
              );
              if ((finalJob.status === 'ready' && finalJob.export_status === 'ready') || finalJob.status === 'error') {
                setSavedPresentationJobs((prev) => [finalJob, ...prev]);
              }
            } catch {
              // Polling failed — job stays visible via next load
            } finally {
              pollingRef.current = false;
              setIsGeneratingPresentation(false);
              setCurrentPresentationJob(null);
            }
          }
        }
      }
    } catch (error) {
      log.error({ err: error }, 'failed to load saved presentation jobs');
    }
  };

  /**
   * Handle presentation generation
   * Educational Note: Presentations auto-open in viewer after generation
   */
  const handlePresentationGeneration = async (signal: StudioSignal) => {
    setIsGeneratingPresentation(true);
    setCurrentPresentationJob(null);

    try {
      const sourceId = signal.sources[0]?.source_id;
      if (!sourceId) {
        showError('No source selected');
        return;
      }

      // Start presentation generation
      const startResponse = await presentationsAPI.startGeneration(
        projectId,
        sourceId,
        signal.direction
      );

      if (!startResponse.success || !startResponse.job_id) {
        showError(startResponse.error || 'Failed to start presentation generation');
        return;
      }

      // Poll for completion (including PPTX export)
      const finalJob = await presentationsAPI.pollJobStatus(
        projectId,
        startResponse.job_id,
        (job) => setCurrentPresentationJob(job)
      );

      if (finalJob.status === 'ready' && finalJob.export_status === 'ready') {
        setSavedPresentationJobs((prev) => [finalJob, ...prev]);
        // Open presentation in viewer automatically
        setViewingPresentationJob(finalJob);
        showSuccess('Presentation generated successfully!');
      } else if (finalJob.status === 'error') {
        showError(finalJob.error_message || 'Presentation generation failed');
      }
    } catch (error) {
      log.error({ err: error }, 'LPresentation generationE failed');
      showError('Presentation generation failed');
    } finally {
      setIsGeneratingPresentation(false);
      setCurrentPresentationJob(null);
    }
  };

  /**
   * Download presentation as PPTX
   */
  const downloadPresentation = (jobId: string) => {
    // API_BASE_URL already includes /api/v1 path, getAuthUrl adds JWT for browser element auth
    const downloadUrl = presentationsAPI.getDownloadUrl(projectId, jobId, 'pptx');
    const link = document.createElement('a');
    link.href = getAuthUrl(downloadUrl);
    link.click();
  };

  /**
   * Download presentation source as ZIP
   */
  const downloadPresentationSource = (jobId: string) => {
    // API_BASE_URL already includes /api/v1 path, getAuthUrl adds JWT for browser element auth
    const downloadUrl = presentationsAPI.getDownloadUrl(projectId, jobId, 'zip');
    const link = document.createElement('a');
    link.href = getAuthUrl(downloadUrl);
    link.click();
  };

  return {
    savedPresentationJobs,
    currentPresentationJob,
    isGeneratingPresentation,
    viewingPresentationJob,
    setViewingPresentationJob,
    loadSavedJobs,
    handlePresentationGeneration,
    downloadPresentation,
    downloadPresentationSource,
  };
};
