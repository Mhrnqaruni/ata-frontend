/**
 * useEmailGeneration Hook
 * Educational Note: Custom hook for email template generation logic.
 * Handles state management, API calls, and polling.
 */

import { useState, useRef } from 'react';
import { emailsAPI, checkGeminiStatus, type EmailJob } from '@/lib/api/studio';
import { useToast } from '../../ui/toast';
import type { StudioSignal } from '../types';
import { createLogger } from '@/lib/logger';

const log = createLogger('email-generation');

export const useEmailGeneration = (projectId: string) => {
  const { success: showSuccess, error: showError } = useToast();

  // State
  const [savedEmailJobs, setSavedEmailJobs] = useState<EmailJob[]>([]);
  const [currentEmailJob, setCurrentEmailJob] = useState<EmailJob | null>(null);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const pollingRef = useRef(false);
  const [viewingEmailJob, setViewingEmailJob] = useState<EmailJob | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const configErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Load saved email jobs from backend
   */
  const loadSavedJobs = async () => {
    try {
      const emailResponse = await emailsAPI.listJobs(projectId);
      if (emailResponse.success && emailResponse.jobs) {
        const finishedJobs = emailResponse.jobs.filter(
          (job) => job.status === 'ready' || job.status === 'error'
        );
        setSavedEmailJobs(finishedJobs);

        // Resume polling for in-progress jobs (survives refresh/navigation)
        if (!isGeneratingEmail && !pollingRef.current) {
          const inProgressJob = emailResponse.jobs.find(
            (job) => job.status === 'pending' || job.status === 'processing'
          );
          if (inProgressJob) {
            pollingRef.current = true;
            setIsGeneratingEmail(true);
            setCurrentEmailJob(inProgressJob);
            try {
              const finalJob = await emailsAPI.pollJobStatus(
                projectId,
                inProgressJob.id,
                (job) => setCurrentEmailJob(job)
              );
              if (finalJob.status === 'ready' || finalJob.status === 'error') {
                setSavedEmailJobs((prev) => [finalJob, ...prev]);
              }
            } catch {
              // Polling failed — job stays visible via next load
            } finally {
              pollingRef.current = false;
              setIsGeneratingEmail(false);
              setCurrentEmailJob(null);
            }
          }
        }
      }
    } catch (error) {
      log.error({ err: error }, 'failed to load saved email jobs');
    }
  };

  /**
   * Handle email template generation
   */
  const handleEmailGeneration = async (signal: StudioSignal) => {
    // source_id is optional — email can be generated from direction alone
    const sources = signal.sources || [];
    const sourceId = sources[0]?.source_id || '';

    setIsGeneratingEmail(true);
    setCurrentEmailJob(null);

    try {
      // Check Gemini status (email agent uses Gemini for images)
      const geminiStatus = await checkGeminiStatus();
      if (!geminiStatus.configured) {
        console.error('[Studio] Email: Gemini not configured', geminiStatus);
        if (configErrorTimer.current) clearTimeout(configErrorTimer.current);
        setConfigError('Add your Gemini API key in Admin Settings to generate email templates with images.');
        configErrorTimer.current = setTimeout(() => setConfigError(null), 10000);
        setIsGeneratingEmail(false);
        return;
      }

      const startResponse = await emailsAPI.startGeneration(
        projectId,
        sourceId,
        signal.direction
      );

      if (!startResponse.success || !startResponse.job_id) {
        console.error('[Studio] Email: API start failed', startResponse);
        if (configErrorTimer.current) clearTimeout(configErrorTimer.current);
        setConfigError(startResponse.error || 'Failed to start email template generation.');
        configErrorTimer.current = setTimeout(() => setConfigError(null), 10000);
        setIsGeneratingEmail(false);
        return;
      }

      showSuccess(`Generating email template...`);

      const finalJob = await emailsAPI.pollJobStatus(
        projectId,
        startResponse.job_id,
        (job) => setCurrentEmailJob(job)
      );

      setCurrentEmailJob(finalJob);

      if (finalJob.status === 'ready') {
        showSuccess(`Generated email template: ${finalJob.template_name}!`);
        setSavedEmailJobs((prev) => [finalJob, ...prev]);
        setViewingEmailJob(finalJob); // Open modal to view
      } else if (finalJob.status === 'error') {
        showError(finalJob.error_message || 'Email template generation failed.');
      }
    } catch (error) {
      console.error('[Studio] Email: generation failed', error);
      log.error({ err: error }, 'Email template generation failed');
      showError(error instanceof Error ? error.message : 'Email template generation failed.');
    } finally {
      setIsGeneratingEmail(false);
      setCurrentEmailJob(null);
    }
  };

  return {
    savedEmailJobs,
    currentEmailJob,
    isGeneratingEmail,
    viewingEmailJob,
    setViewingEmailJob,
    configError,
    loadSavedJobs,
    handleEmailGeneration,
  };
};
