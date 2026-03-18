/**
 * useSocialPostGeneration Hook
 * Educational Note: Custom hook for social post generation logic.
 * Handles state management, API calls, and polling.
 */

import { useState, useRef } from 'react';
import { socialPostsAPI, checkGeminiStatus, type SocialPostJob } from '@/lib/api/studio';
import { useToast } from '../../ui/toast';
import type { StudioSignal } from '../types';
import { createLogger } from '@/lib/logger';

const log = createLogger('social-post-generation');

export const useSocialPostGeneration = (projectId: string) => {
  const { success: showSuccess, error: showError } = useToast();

  // State
  const [savedSocialPostJobs, setSavedSocialPostJobs] = useState<SocialPostJob[]>([]);
  const [currentSocialPostJob, setCurrentSocialPostJob] = useState<SocialPostJob | null>(null);
  const [isGeneratingSocialPosts, setIsGeneratingSocialPosts] = useState(false);
  const pollingRef = useRef(false);
  const [viewingSocialPostJob, setViewingSocialPostJob] = useState<SocialPostJob | null>(null);
  const [pendingEdit, setPendingEdit] = useState<{ jobId: string; input: string } | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const configErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Load saved social post jobs from backend
   */
  const loadSavedJobs = async () => {
    try {
      const socialPostResponse = await socialPostsAPI.listJobs(projectId);
      if (socialPostResponse.success && socialPostResponse.jobs) {
        const finishedJobs = socialPostResponse.jobs.filter(
          (job) => job.status === 'ready' || job.status === 'error'
        );
        setSavedSocialPostJobs(finishedJobs);

        // Resume polling for in-progress jobs (survives refresh/navigation)
        if (!isGeneratingSocialPosts && !pollingRef.current) {
          const inProgressJob = socialPostResponse.jobs.find(
            (job) => job.status === 'pending' || job.status === 'processing'
          );
          if (inProgressJob) {
            pollingRef.current = true;
            setIsGeneratingSocialPosts(true);
            setCurrentSocialPostJob(inProgressJob);
            try {
              const finalJob = await socialPostsAPI.pollJobStatus(
                projectId,
                inProgressJob.id,
                (job) => setCurrentSocialPostJob(job)
              );
              if (finalJob.status === 'ready') {
                setSavedSocialPostJobs((prev) => [finalJob, ...prev]);
              } else if (finalJob.status === 'error' && finalJob.parent_job_id) {
                // Edit failed after refresh — delete orphaned error job
                socialPostsAPI.deleteJob(projectId, finalJob.id).catch((err) => {
                  log.warn({ err }, 'Failed to delete failed edit job');
                });
              } else if (finalJob.status === 'error') {
                setSavedSocialPostJobs((prev) => [finalJob, ...prev]);
              }
            } catch {
              // Polling failed — job stays visible via next load
            } finally {
              pollingRef.current = false;
              setIsGeneratingSocialPosts(false);
              setCurrentSocialPostJob(null);
            }
          }
        }
      }
    } catch (error) {
      log.error({ err: error }, 'failed to load saved social post jobs');
    }
  };

  /**
   * Handle social post generation
   */
  const handleSocialPostGeneration = async (signal: StudioSignal) => {
    // Extract topic from direction
    const topic = signal.direction || 'Topic';

    setIsGeneratingSocialPosts(true);
    setCurrentSocialPostJob(null);

    try {
      const geminiStatus = await checkGeminiStatus();
      if (!geminiStatus.configured) {
        // Show inline banner so the user clearly sees what's missing
        if (configErrorTimer.current) clearTimeout(configErrorTimer.current);
        setConfigError('Add your Gemini API key in Admin Settings to generate social posts with images.');
        configErrorTimer.current = setTimeout(() => setConfigError(null), 10000);
        setIsGeneratingSocialPosts(false);
        return;
      }

      // Logo source defaults to 'auto' — backend auto-detects brand icon/logo.
      // Signal sources don't carry type metadata, so source-based logos
      // would need explicit UI selection (future enhancement).
      const startResponse = await socialPostsAPI.startGeneration(
        projectId,
        topic,
        signal.direction,
        ['linkedin', 'instagram', 'twitter'],
        'auto'
      );

      if (!startResponse.success || !startResponse.job_id) {
        showError(startResponse.error || 'Failed to start social post generation.');
        setIsGeneratingSocialPosts(false);
        return;
      }

      showSuccess(`Generating social posts...`);

      const finalJob = await socialPostsAPI.pollJobStatus(
        projectId,
        startResponse.job_id,
        (job) => setCurrentSocialPostJob(job)
      );

      setCurrentSocialPostJob(finalJob);

      if (finalJob.status === 'ready') {
        showSuccess(`Generated ${finalJob.post_count} social posts!`);
        setSavedSocialPostJobs((prev) => [finalJob, ...prev]);
        setViewingSocialPostJob(finalJob); // Open modal to view
      } else if (finalJob.status === 'error') {
        showError(finalJob.error || 'Social post generation failed.');
      }
    } catch (error) {
      log.error({ err: error }, 'Social post generation failed');
      showError(error instanceof Error ? error.message : 'Social post generation failed.');
    } finally {
      setIsGeneratingSocialPosts(false);
      setCurrentSocialPostJob(null);
    }
  };

  /**
   * Handle iterative editing of existing social posts
   * Educational Note: Follows the same pattern as video editing —
   * previous posts array is passed to Claude for refinement.
   */
  const handleSocialPostEdit = async (parentJob: SocialPostJob, editInstructions: string) => {
    if (isGeneratingSocialPosts) return;
    setIsGeneratingSocialPosts(true);
    setPendingEdit({ jobId: parentJob.id, input: editInstructions });

    try {
      const startResponse = await socialPostsAPI.startGeneration(
        projectId,
        parentJob.topic,
        parentJob.direction,
        parentJob.platforms,
        'auto',
        undefined,
        parentJob.id,
        editInstructions
      );

      if (!startResponse.success || !startResponse.job_id) {
        showError(startResponse.error || 'Failed to start social post edit.');
        return;
      }

      // Close modal once generation started
      setCurrentSocialPostJob(null);
      setViewingSocialPostJob(null);

      const finalJob = await socialPostsAPI.pollJobStatus(
        projectId,
        startResponse.job_id,
        (job) => setCurrentSocialPostJob(job)
      );

      if (finalJob.status === 'ready') {
        setPendingEdit(null);
        setSavedSocialPostJobs((prev) => [finalJob, ...prev]);
        setViewingSocialPostJob(finalJob);
      } else if (finalJob.status === 'error') {
        showError(finalJob.error || 'Social post edit failed.');
        setViewingSocialPostJob(parentJob);
        // Delete the failed edit job
        socialPostsAPI.deleteJob(projectId, finalJob.id).catch((err) => {
          log.warn({ err }, 'Failed to delete failed edit job');
        });
      }
    } catch (error) {
      log.error({ err: error }, 'Social post edit failed');
      showError(error instanceof Error ? error.message : 'Social post edit failed.');
    } finally {
      setIsGeneratingSocialPosts(false);
      setCurrentSocialPostJob(null);
      // pendingEdit intentionally NOT cleared — preserved for retry on failure
    }
  };

  return {
    savedSocialPostJobs,
    currentSocialPostJob,
    isGeneratingSocialPosts,
    viewingSocialPostJob,
    setViewingSocialPostJob,
    pendingEditInput: pendingEdit !== null && pendingEdit.jobId === viewingSocialPostJob?.id ? pendingEdit.input : '',
    configError,
    loadSavedJobs,
    handleSocialPostGeneration,
    handleSocialPostEdit,
  };
};
