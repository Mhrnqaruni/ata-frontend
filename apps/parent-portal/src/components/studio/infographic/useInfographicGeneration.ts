/**
 * useInfographicGeneration Hook
 * Educational Note: Custom hook for infographic generation logic.
 * Handles state management, API calls, and polling.
 */

import { useState, useRef } from 'react';
import { infographicsAPI, checkGeminiStatus, type InfographicJob } from '@/lib/api/studio';
import { useToast } from '../../ui/toast';
import type { StudioSignal } from '../types';
import { createLogger } from '@/lib/logger';

const log = createLogger('infographic-generation');

export const useInfographicGeneration = (projectId: string) => {
  const { success: showSuccess, error: showError } = useToast();

  // State
  const [savedInfographicJobs, setSavedInfographicJobs] = useState<InfographicJob[]>([]);
  const [currentInfographicJob, setCurrentInfographicJob] = useState<InfographicJob | null>(null);
  const [isGeneratingInfographic, setIsGeneratingInfographic] = useState(false);
  const pollingRef = useRef(false);
  const [viewingInfographicJob, setViewingInfographicJob] = useState<InfographicJob | null>(null);
  const [pendingEdit, setPendingEdit] = useState<{ jobId: string; input: string } | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const configErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Load saved infographic jobs from backend
   */
  const loadSavedJobs = async () => {
    try {
      const infographicResponse = await infographicsAPI.listJobs(projectId);
      if (infographicResponse.success && infographicResponse.jobs) {
        const finishedJobs = infographicResponse.jobs.filter(
          (job) => job.status === 'ready' || job.status === 'error'
        );
        setSavedInfographicJobs(finishedJobs);

        // Resume polling for in-progress jobs (survives refresh/navigation)
        if (!isGeneratingInfographic && !pollingRef.current) {
          const inProgressJob = infographicResponse.jobs.find(
            (job) => job.status === 'pending' || job.status === 'processing'
          );
          if (inProgressJob) {
            pollingRef.current = true;
            setIsGeneratingInfographic(true);
            setCurrentInfographicJob(inProgressJob);
            try {
              const finalJob = await infographicsAPI.pollJobStatus(
                projectId,
                inProgressJob.id,
                (job) => setCurrentInfographicJob(job)
              );
              if (finalJob.status === 'ready') {
                setSavedInfographicJobs((prev) => [finalJob, ...prev]);
              } else if (finalJob.status === 'error' && finalJob.parent_job_id) {
                // Edit failed after refresh — delete orphaned error job
                infographicsAPI.deleteJob(projectId, finalJob.id).catch((err) => {
                  log.warn({ err }, 'Failed to delete failed edit job');
                });
              } else if (finalJob.status === 'error') {
                setSavedInfographicJobs((prev) => [finalJob, ...prev]);
              }
            } catch {
              // Polling failed — job stays visible via next load
            } finally {
              pollingRef.current = false;
              setIsGeneratingInfographic(false);
              setCurrentInfographicJob(null);
            }
          }
        }
      }
    } catch (error) {
      log.error({ err: error }, 'failed to load saved infographic jobs');
    }
  };

  /**
   * Handle infographic generation
   */
  const handleInfographicGeneration = async (signal: StudioSignal) => {
    const sourceId = signal.sources[0]?.source_id || '';

    setIsGeneratingInfographic(true);
    setCurrentInfographicJob(null);

    try {
      const geminiStatus = await checkGeminiStatus();
      if (!geminiStatus.configured) {
        if (configErrorTimer.current) clearTimeout(configErrorTimer.current);
        setConfigError('Add your Gemini API key in Admin Settings to generate infographics with images.');
        configErrorTimer.current = setTimeout(() => setConfigError(null), 10000);
        setIsGeneratingInfographic(false);
        return;
      }

      const startResponse = await infographicsAPI.startGeneration(
        projectId,
        sourceId,
        signal.direction
      );

      if (!startResponse.success || !startResponse.job_id) {
        showError(startResponse.error || 'Failed to start infographic generation.');
        setIsGeneratingInfographic(false);
        return;
      }

      const toastLabel = startResponse.source_name && startResponse.source_name !== 'Chat Context'
        ? startResponse.source_name
        : 'your topic';
      showSuccess(`Generating infographic for ${toastLabel}...`);

      const finalJob = await infographicsAPI.pollJobStatus(
        projectId,
        startResponse.job_id,
        (job) => setCurrentInfographicJob(job)
      );

      setCurrentInfographicJob(finalJob);

      if (finalJob.status === 'ready') {
        showSuccess(`Generated infographic: ${finalJob.topic_title}!`);
        setSavedInfographicJobs((prev) => [finalJob, ...prev]);
        setViewingInfographicJob(finalJob); // Open modal to view
      } else if (finalJob.status === 'error') {
        showError(finalJob.error || 'Infographic generation failed.');
      }
    } catch (error) {
      log.error({ err: error }, 'Infographic generation failed');
      showError(error instanceof Error ? error.message : 'Infographic generation failed.');
    } finally {
      setIsGeneratingInfographic(false);
      setCurrentInfographicJob(null);
    }
  };

  /**
   * Handle iterative editing of an existing infographic
   * Educational Note: Follows the same pattern as video editing —
   * previous image prompt is passed to Claude for refinement.
   */
  const handleInfographicEdit = async (parentJob: InfographicJob, editInstructions: string) => {
    if (isGeneratingInfographic) return;
    setIsGeneratingInfographic(true);
    setPendingEdit({ jobId: parentJob.id, input: editInstructions });

    try {
      const startResponse = await infographicsAPI.startGeneration(
        projectId,
        parentJob.source_id,
        parentJob.direction,
        parentJob.id,
        editInstructions
      );

      if (!startResponse.success || !startResponse.job_id) {
        showError(startResponse.error || 'Failed to start infographic edit.');
        return;
      }

      // Close modal once generation started
      setCurrentInfographicJob(null);
      setViewingInfographicJob(null);

      const finalJob = await infographicsAPI.pollJobStatus(
        projectId,
        startResponse.job_id,
        (job) => setCurrentInfographicJob(job)
      );

      if (finalJob.status === 'ready') {
        setPendingEdit(null);
        setSavedInfographicJobs((prev) => [finalJob, ...prev]);
        setViewingInfographicJob(finalJob);
      } else if (finalJob.status === 'error') {
        showError(finalJob.error || 'Infographic edit failed.');
        setViewingInfographicJob(parentJob);
        // Delete the failed edit job
        infographicsAPI.deleteJob(projectId, finalJob.id).catch((err) => {
          log.warn({ err }, 'Failed to delete failed edit job');
        });
      }
    } catch (error) {
      log.error({ err: error }, 'Infographic edit failed');
      showError(error instanceof Error ? error.message : 'Infographic edit failed.');
    } finally {
      setIsGeneratingInfographic(false);
      setCurrentInfographicJob(null);
      // pendingEdit intentionally NOT cleared — preserved for retry on failure
    }
  };

  return {
    savedInfographicJobs,
    currentInfographicJob,
    isGeneratingInfographic,
    viewingInfographicJob,
    setViewingInfographicJob,
    pendingEditInput: pendingEdit !== null && pendingEdit.jobId === viewingInfographicJob?.id ? pendingEdit.input : '',
    configError,
    loadSavedJobs,
    handleInfographicGeneration,
    handleInfographicEdit,
  };
};
