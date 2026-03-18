/**
 * useVideoGeneration Hook
 * Educational Note: Custom hook for video generation logic using Google Veo 2.0.
 * Handles state management, API calls, and polling for video generation jobs.
 * Videos are generated in two steps: Claude creates optimized prompt -> Google Veo generates video.
 */

import { useState, useRef } from 'react';
import { videosAPI, type VideoJob } from '@/lib/api/studio';
import { getAuthUrl } from '@/lib/api/client';
import { useToast } from '../../ui/toast';
import type { StudioSignal } from '../types';
import { createLogger } from '@/lib/logger';

const log = createLogger('video-generation');

export const useVideoGeneration = (projectId: string) => {
  const { success: showSuccess, error: showError } = useToast();

  // State
  const [savedVideoJobs, setSavedVideoJobs] = useState<VideoJob[]>([]);
  const [currentVideoJob, setCurrentVideoJob] = useState<VideoJob | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const pollingRef = useRef(false);
  const [viewingVideoJob, setViewingVideoJob] = useState<VideoJob | null>(null);
  const [pendingEdit, setPendingEdit] = useState<{ jobId: string; input: string } | null>(null);

  /**
   * Load saved video jobs from backend
   */
  const loadSavedJobs = async () => {
    try {
      const videoResponse = await videosAPI.listJobs(projectId);
      if (videoResponse.success && videoResponse.jobs) {
        const finishedJobs = videoResponse.jobs.filter(
          (job) => job.status === 'ready' || job.status === 'error'
        );
        setSavedVideoJobs(finishedJobs);

        // Resume polling for in-progress jobs (survives refresh/navigation)
        if (!isGeneratingVideo && !pollingRef.current) {
          const inProgressJob = videoResponse.jobs.find(
            (job) => job.status === 'pending' || job.status === 'processing'
          );
          if (inProgressJob) {
            pollingRef.current = true;
            setIsGeneratingVideo(true);
            setCurrentVideoJob(inProgressJob);
            try {
              const finalJob = await videosAPI.pollJobStatus(
                projectId,
                inProgressJob.id,
                (job) => setCurrentVideoJob(job)
              );
              if (finalJob.status === 'ready' || finalJob.status === 'error') {
                if (finalJob.status === 'ready' && finalJob.parent_job_id) {
                  // Edit completed after refresh — keep parent so user can view previous versions
                  setSavedVideoJobs((prev) => [finalJob, ...prev]);
                } else if (finalJob.status === 'error' && finalJob.parent_job_id) {
                  // Edit failed after refresh — delete orphaned error job, parent stays
                  videosAPI.deleteJob(projectId, finalJob.id).catch((err) => {
                    console.warn('[Studio] Failed to delete failed edit job', err);
                  });
                } else {
                  setSavedVideoJobs((prev) => [finalJob, ...prev]);
                }
              }
            } catch {
              // Polling failed — job stays visible via next load
            } finally {
              pollingRef.current = false;
              setIsGeneratingVideo(false);
              setCurrentVideoJob(null);
            }
          }
        }
      }
    } catch (error) {
      log.error({ err: error }, 'failed to load saved video jobs');
    }
  };

  /**
   * Handle video generation
   * Educational Note: Videos can take 10-20 minutes to generate with Google Veo
   * Default parameters: 16:9 aspect ratio, 8 seconds duration, 1 video
   */
  const handleVideoGeneration = async (
    signal: StudioSignal,
    aspectRatio: '16:9' | '16:10' = '16:9',
    durationSeconds: number = 8,
    numberOfVideos: number = 1
  ) => {
    setIsGeneratingVideo(true);
    setCurrentVideoJob(null);

    try {
      const sourceId = signal.sources[0]?.source_id;
      if (!sourceId) {
        showError('No source selected');
        return;
      }

      // Start video generation
      const startResponse = await videosAPI.startGeneration(
        projectId,
        sourceId,
        signal.direction,
        aspectRatio,
        durationSeconds,
        numberOfVideos
      );

      if (!startResponse.success || !startResponse.job_id) {
        showError(startResponse.error || 'Failed to start video generation');
        return;
      }

      // Poll for completion (can take 10-20 minutes)
      const finalJob = await videosAPI.pollJobStatus(
        projectId,
        startResponse.job_id,
        (job) => setCurrentVideoJob(job)
      );

      if (finalJob.status === 'ready') {
        setSavedVideoJobs((prev) => [finalJob, ...prev]);
        // Open video in modal viewer automatically
        setViewingVideoJob(finalJob);
        showSuccess(`Generated ${finalJob.videos.length} video(s) successfully!`);
      } else if (finalJob.status === 'error') {
        showError(finalJob.error_message || 'Video generation failed');
      }
    } catch (error) {
      log.error({ err: error }, 'Video generation failed');
      showError('Video generation failed');
    } finally {
      setIsGeneratingVideo(false);
      setCurrentVideoJob(null);
    }
  };

  /**
   * Handle video edit - regenerate video with refined prompt
   * Educational Note: For videos, "editing" means refining the generated prompt
   * and regenerating the video with Google Veo. The previous prompt is passed
   * as context so Claude can modify it based on edit instructions.
   */
  const handleVideoEdit = async (parentJob: VideoJob, editInstructions: string) => {
    if (isGeneratingVideo) return;
    setIsGeneratingVideo(true);
    setPendingEdit({ jobId: parentJob.id, input: editInstructions });

    try {
      const startResponse = await videosAPI.startGeneration(
        projectId,
        parentJob.source_id,
        parentJob.direction,
        parentJob.aspect_ratio,
        parentJob.duration_seconds,
        parentJob.number_of_videos,
        parentJob.id,        // parentJobId
        editInstructions     // editInstructions
      );

      if (!startResponse.success || !startResponse.job_id) {
        showError(startResponse.error || 'Failed to start video edit.');
        return;
      }

      // Close modal once generation started
      setCurrentVideoJob(null);
      setViewingVideoJob(null);

      showSuccess('Editing video...');

      const finalJob = await videosAPI.pollJobStatus(
        projectId,
        startResponse.job_id,
        (job) => setCurrentVideoJob(job)
      );

      if (finalJob.status === 'ready') {
        setPendingEdit(null);
        showSuccess(`Video edited successfully!`);
        setSavedVideoJobs((prev) => [finalJob, ...prev]);
        setViewingVideoJob(finalJob);
      } else if (finalJob.status === 'error') {
        showError(finalJob.error_message || 'Video edit failed.');
        setViewingVideoJob(parentJob); // Restore parent modal for retry
        // Delete the failed edit job
        videosAPI.deleteJob(projectId, finalJob.id).catch((err) => {
          console.warn('[Studio] Failed to delete failed edit job', err);
        });
      }
    } catch (error) {
      log.error({ err: error }, 'Video edit failed');
      showError(error instanceof Error ? error.message : 'Video edit failed.');
      setViewingVideoJob(parentJob); // Restore parent modal for retry
    } finally {
      setIsGeneratingVideo(false);
      setCurrentVideoJob(null);
      // pendingEdit intentionally NOT cleared — preserved for retry on failure
    }
  };

  /**
   * Open video in modal viewer
   */
  const openVideo = (jobId: string) => {
    const job = savedVideoJobs.find((j) => j.id === jobId);
    if (job) {
      setViewingVideoJob(job);
    }
  };

  /**
   * Download video file
   */
  const downloadVideo = (jobId: string, filename: string) => {
    const downloadUrl = videosAPI.getDownloadUrl(projectId, jobId, filename);
    const link = document.createElement('a');
    link.href = getAuthUrl(downloadUrl);
    link.download = filename;
    link.click();
  };

  return {
    savedVideoJobs,
    currentVideoJob,
    isGeneratingVideo,
    viewingVideoJob,
    setViewingVideoJob,
    pendingEditInput: pendingEdit !== null && pendingEdit.jobId === viewingVideoJob?.id ? pendingEdit.input : '',
    loadSavedJobs,
    handleVideoGeneration,
    handleVideoEdit,
    openVideo,
    downloadVideo,
  };
};
