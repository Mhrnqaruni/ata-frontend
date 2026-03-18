/**
 * useFlowDiagramGeneration Hook
 * Educational Note: Manages Mermaid flow diagram generation from sources.
 * Creates various diagram types (flowchart, sequence, state, ER, etc.) for visualization.
 */

import { useState, useRef } from 'react';
import { flowDiagramsAPI, type FlowDiagramJob } from '@/lib/api/studio';
import type { StudioSignal } from '../types';
import { useToast } from '../../ui/toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('flow-diagram-generation');

export const useFlowDiagramGeneration = (projectId: string) => {
  const { success: showSuccess, error: showError } = useToast();

  const [savedFlowDiagramJobs, setSavedFlowDiagramJobs] = useState<FlowDiagramJob[]>([]);
  const [currentFlowDiagramJob, setCurrentFlowDiagramJob] = useState<FlowDiagramJob | null>(null);
  const [isGeneratingFlowDiagram, setIsGeneratingFlowDiagram] = useState(false);
  const pollingRef = useRef(false);
  const [viewingFlowDiagramJob, setViewingFlowDiagramJob] = useState<FlowDiagramJob | null>(null);

  const loadSavedJobs = async () => {
    try {
      const response = await flowDiagramsAPI.listJobs(projectId);
      if (response.success && response.jobs) {
        const finishedJobs = response.jobs.filter(
          (job) => job.status === 'ready' || job.status === 'error'
        );
        setSavedFlowDiagramJobs(finishedJobs);

        // Resume polling for in-progress jobs (survives refresh/navigation)
        if (!isGeneratingFlowDiagram && !pollingRef.current) {
          const inProgressJob = response.jobs.find(
            (job) => job.status === 'pending' || job.status === 'processing'
          );
          if (inProgressJob) {
            pollingRef.current = true;
            setIsGeneratingFlowDiagram(true);
            setCurrentFlowDiagramJob(inProgressJob);
            try {
              const finalJob = await flowDiagramsAPI.pollJobStatus(
                projectId,
                inProgressJob.id,
                (job) => setCurrentFlowDiagramJob(job)
              );
              if (finalJob.status === 'ready' || finalJob.status === 'error') {
                setSavedFlowDiagramJobs((prev) => [finalJob, ...prev]);
              }
            } catch {
              // Polling failed — job stays visible via next load
            } finally {
              pollingRef.current = false;
              setIsGeneratingFlowDiagram(false);
              setCurrentFlowDiagramJob(null);
            }
          }
        }
      }
    } catch (error) {
      log.error({ err: error }, 'failed to load saved flow diagram jobs');
    }
  };

  const handleFlowDiagramGeneration = async (signal: StudioSignal) => {
    const sourceId = signal.sources[0]?.source_id;

    setIsGeneratingFlowDiagram(true);
    setCurrentFlowDiagramJob(null);

    try {
      const startResponse = await flowDiagramsAPI.startGeneration(
        projectId,
        sourceId,
        signal.direction
      );

      if (!startResponse.success || !startResponse.job_id) {
        showError(startResponse.error || 'Failed to start flow diagram generation.');
        setIsGeneratingFlowDiagram(false);
        return;
      }

      showSuccess(`Generating flow diagram for ${startResponse.source_name}...`);

      const finalJob = await flowDiagramsAPI.pollJobStatus(
        projectId,
        startResponse.job_id,
        (job) => setCurrentFlowDiagramJob(job)
      );

      setCurrentFlowDiagramJob(finalJob);

      if (finalJob.status === 'ready') {
        showSuccess(`Generated ${finalJob.diagram_type} diagram: ${finalJob.title}`);
        setSavedFlowDiagramJobs((prev) => [finalJob, ...prev]);
        setViewingFlowDiagramJob(finalJob); // Open modal to view
      } else if (finalJob.status === 'error') {
        showError(finalJob.error || 'Flow diagram generation failed.');
      }
    } catch (error) {
      log.error({ err: error }, 'LFlow diagram generationE failed');
      showError(error instanceof Error ? error.message : 'Flow diagram generation failed.');
    } finally {
      setIsGeneratingFlowDiagram(false);
      setCurrentFlowDiagramJob(null);
    }
  };

  return {
    savedFlowDiagramJobs,
    currentFlowDiagramJob,
    isGeneratingFlowDiagram,
    viewingFlowDiagramJob,
    setViewingFlowDiagramJob,
    loadSavedJobs,
    handleFlowDiagramGeneration,
  };
};
