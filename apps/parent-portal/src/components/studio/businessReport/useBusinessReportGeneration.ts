/**
 * useBusinessReportGeneration Hook
 * Educational Note: Manages business report generation with data analysis.
 * Business reports combine written analysis with charts from CSV data.
 */

import { useState, useRef } from 'react';
import { businessReportsAPI, type BusinessReportJob, type BusinessReportType } from '@/lib/api/studio';
import { getAuthUrl } from '@/lib/api/client';
import type { StudioSignal } from '../types';
import { useToast } from '../../ui/toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('business-report-generation');

// Extend StudioSignal for business_report-specific fields
interface BusinessReportSignal extends StudioSignal {
  report_type?: BusinessReportType;
  csv_source_ids?: string[];
  context_source_ids?: string[];
  focus_areas?: string[];
}

export const useBusinessReportGeneration = (projectId: string) => {
  const { success: showSuccess, error: showError } = useToast();

  const [savedBusinessReportJobs, setSavedBusinessReportJobs] = useState<BusinessReportJob[]>([]);
  const [currentBusinessReportJob, setCurrentBusinessReportJob] = useState<BusinessReportJob | null>(null);
  const [isGeneratingBusinessReport, setIsGeneratingBusinessReport] = useState(false);
  const pollingRef = useRef(false);
  const [viewingBusinessReportJob, setViewingBusinessReportJob] = useState<BusinessReportJob | null>(null);
  const [pendingEdit, setPendingEdit] = useState<{ jobId: string; input: string } | null>(null);

  const loadSavedJobs = async () => {
    try {
      const response = await businessReportsAPI.listJobs(projectId);
      if (response.success && response.jobs) {
        const finishedJobs = response.jobs.filter(
          (job) => job.status === 'ready' || job.status === 'error'
        );
        setSavedBusinessReportJobs(finishedJobs);

        // Resume polling for in-progress jobs (survives refresh/navigation)
        if (!isGeneratingBusinessReport && !pollingRef.current) {
          const inProgressJob = response.jobs.find(
            (job) => job.status === 'pending' || job.status === 'processing'
          );
          if (inProgressJob) {
            pollingRef.current = true;
            setIsGeneratingBusinessReport(true);
            setCurrentBusinessReportJob(inProgressJob);
            try {
              const finalJob = await businessReportsAPI.pollJobStatus(
                projectId,
                inProgressJob.id,
                (job) => setCurrentBusinessReportJob(job)
              );
              if (finalJob.status === 'ready' || finalJob.status === 'error') {
                if (finalJob.status === 'ready' && finalJob.parent_job_id) {
                  // Edit completed after refresh — keep parent so user can view previous versions
                  setSavedBusinessReportJobs((prev) => [finalJob, ...prev]);
                } else if (finalJob.status === 'error' && finalJob.parent_job_id) {
                  // Edit failed after refresh — delete orphaned error job, parent stays
                  businessReportsAPI.deleteJob(projectId, finalJob.id).catch((err) => {
                    console.warn('[Studio] Failed to delete failed edit job', err);
                  });
                } else {
                  setSavedBusinessReportJobs((prev) => [finalJob, ...prev]);
                }
              }
            } catch {
              // Polling failed — job stays visible via next load
            } finally {
              pollingRef.current = false;
              setIsGeneratingBusinessReport(false);
              setCurrentBusinessReportJob(null);
            }
          }
        }
      }
    } catch (error) {
      log.error({ err: error }, 'failed to load saved business report jobs');
    }
  };

  const handleBusinessReportGeneration = async (signal: BusinessReportSignal) => {
    const sourceId = signal.sources[0]?.source_id;
    if (!sourceId) {
      showError('No source specified for business report generation.');
      return;
    }

    setIsGeneratingBusinessReport(true);
    setCurrentBusinessReportJob(null);

    try {
      // Extract business_report-specific fields from signal
      const reportType = signal.report_type || 'executive_summary';
      const csvSourceIds = signal.csv_source_ids || [];
      const contextSourceIds = signal.context_source_ids || [];
      const focusAreas = signal.focus_areas || [];

      const startResponse = await businessReportsAPI.startGeneration(
        projectId,
        sourceId,
        signal.direction,
        reportType,
        csvSourceIds,
        contextSourceIds,
        focusAreas
      );

      if (!startResponse.success || !startResponse.job_id) {
        showError(startResponse.error || 'Failed to start business report generation.');
        setIsGeneratingBusinessReport(false);
        return;
      }

      showSuccess('Generating business report...');

      const finalJob = await businessReportsAPI.pollJobStatus(
        projectId,
        startResponse.job_id,
        (job) => setCurrentBusinessReportJob(job)
      );

      setCurrentBusinessReportJob(finalJob);

      if (finalJob.status === 'ready') {
        showSuccess(`Business report generated: ${finalJob.title || 'Business Report'}`);
        setSavedBusinessReportJobs((prev) => [finalJob, ...prev]);
        setViewingBusinessReportJob(finalJob); // Open modal to view
      } else if (finalJob.status === 'error') {
        showError(finalJob.error_message || 'Business report generation failed.');
      }
    } catch (error) {
      log.error({ err: error }, 'Business report generation failed');
      showError(error instanceof Error ? error.message : 'Business report generation failed.');
    } finally {
      setIsGeneratingBusinessReport(false);
      setCurrentBusinessReportJob(null);
    }
  };

  /**
   * Handle business report edit - regenerate report with edit instructions
   * Educational Note: For business reports, editing means passing the previous
   * markdown as context so the agent can refine it based on edit instructions.
   */
  const handleBusinessReportEdit = async (parentJob: BusinessReportJob, editInstructions: string) => {
    if (isGeneratingBusinessReport) return;
    setIsGeneratingBusinessReport(true);
    setPendingEdit({ jobId: parentJob.id, input: editInstructions });

    try {
      const startResponse = await businessReportsAPI.startGeneration(
        projectId,
        parentJob.source_id,
        parentJob.direction,
        parentJob.report_type,
        parentJob.csv_source_ids,
        parentJob.context_source_ids,
        parentJob.focus_areas,
        parentJob.id,        // parentJobId
        editInstructions     // editInstructions
      );

      if (!startResponse.success || !startResponse.job_id) {
        showError(startResponse.error || 'Failed to start business report edit.');
        return;
      }

      // Close modal once generation started
      setCurrentBusinessReportJob(null);
      setViewingBusinessReportJob(null);

      showSuccess('Editing business report...');

      const finalJob = await businessReportsAPI.pollJobStatus(
        projectId,
        startResponse.job_id,
        (job) => setCurrentBusinessReportJob(job)
      );

      if (finalJob.status === 'ready') {
        setPendingEdit(null);
        showSuccess(`Business report edited: ${finalJob.title || 'Business Report'}`);
        setSavedBusinessReportJobs((prev) => [finalJob, ...prev]);
        setViewingBusinessReportJob(finalJob); // Reopen modal with new job
      } else if (finalJob.status === 'error') {
        showError(finalJob.error_message || 'Business report edit failed.');
        setViewingBusinessReportJob(parentJob); // Restore parent modal for retry
        // Delete the failed edit job
        businessReportsAPI.deleteJob(projectId, finalJob.id).catch((err) => {
          console.warn('[Studio] Failed to delete failed edit job', err);
        });
      }
    } catch (error) {
      log.error({ err: error }, 'Business report edit failed');
      showError(error instanceof Error ? error.message : 'Business report edit failed.');
      setViewingBusinessReportJob(parentJob); // Restore parent modal for retry
    } finally {
      setIsGeneratingBusinessReport(false);
      setCurrentBusinessReportJob(null);
      // pendingEdit intentionally NOT cleared — preserved for retry on failure
    }
  };

  const downloadBusinessReport = (jobId: string) => {
    const url = businessReportsAPI.getDownloadUrl(projectId, jobId);
    window.open(getAuthUrl(url), '_blank');
  };

  return {
    savedBusinessReportJobs,
    currentBusinessReportJob,
    isGeneratingBusinessReport,
    viewingBusinessReportJob,
    setViewingBusinessReportJob,
    pendingEditInput: pendingEdit !== null && pendingEdit.jobId === viewingBusinessReportJob?.id ? pendingEdit.input : '',
    loadSavedJobs,
    handleBusinessReportGeneration,
    handleBusinessReportEdit,
    downloadBusinessReport,
  };
};
