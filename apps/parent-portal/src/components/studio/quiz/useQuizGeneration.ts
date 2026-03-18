/**
 * useQuizGeneration Hook
 * Educational Note: Manages quiz generation from sources.
 * Creates interactive quiz questions with multiple choice answers.
 */

import { useState, useRef } from 'react';
import { quizzesAPI, type QuizJob } from '@/lib/api/studio';
import type { StudioSignal } from '../types';
import { useToast } from '../../ui/toast';
import { createLogger } from '@/lib/logger';
import { upsertQuizJob } from './quizState';

const log = createLogger('quiz-generation');

export const useQuizGeneration = (projectId: string) => {
  const { success: showSuccess, error: showError } = useToast();

  const [savedQuizJobs, setSavedQuizJobs] = useState<QuizJob[]>([]);
  const [currentQuizJob, setCurrentQuizJob] = useState<QuizJob | null>(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const pollingRef = useRef(false);
  const [viewingQuizJob, setViewingQuizJob] = useState<QuizJob | null>(null);

  const persistQuizJob = (job: QuizJob) => {
    setSavedQuizJobs((prev) => upsertQuizJob(prev, job));
  };

  const loadSavedJobs = async () => {
    try {
      const quizResponse = await quizzesAPI.listJobs(projectId);
      if (quizResponse.success && quizResponse.jobs) {
        const finishedJobs = quizResponse.jobs.filter(
          (job) => job.status === 'ready' || job.status === 'error'
        );
        setSavedQuizJobs(finishedJobs);

        // Resume polling for in-progress jobs (survives refresh/navigation)
        if (!isGeneratingQuiz && !pollingRef.current) {
          const inProgressJob = quizResponse.jobs.find(
            (job) => job.status === 'pending' || job.status === 'processing'
          );
          if (inProgressJob) {
            pollingRef.current = true;
            setIsGeneratingQuiz(true);
            setCurrentQuizJob(inProgressJob);
            try {
              const finalJob = await quizzesAPI.pollJobStatus(
                projectId,
                inProgressJob.id,
                (job) => setCurrentQuizJob(job)
              );
              if (finalJob.status === 'ready' || finalJob.status === 'error') {
                persistQuizJob(finalJob);
              }
            } catch {
              // Polling failed — job stays visible via next load
            } finally {
              pollingRef.current = false;
              setIsGeneratingQuiz(false);
              setCurrentQuizJob(null);
            }
          }
        }
      }
    } catch (error) {
      log.error({ err: error }, 'failed to load saved quiz jobs');
    }
  };

  const handleQuizGeneration = async (signal: StudioSignal) => {
    const sourceId = signal.sources[0]?.source_id;
    if (!sourceId) {
      showError('No source specified for quiz generation.');
      return;
    }

    setIsGeneratingQuiz(true);
    setCurrentQuizJob(null);

    try {
      const startResponse = await quizzesAPI.startGeneration(
        projectId,
        sourceId,
        signal.direction
      );

      if (!startResponse.success || !startResponse.job_id) {
        showError(startResponse.error || 'Failed to start quiz generation.');
        setIsGeneratingQuiz(false);
        return;
      }

      showSuccess(`Generating quiz for ${startResponse.source_name}...`);

      const finalJob = await quizzesAPI.pollJobStatus(
        projectId,
        startResponse.job_id,
        (job) => setCurrentQuizJob(job)
      );

      setCurrentQuizJob(finalJob);

      if (finalJob.status === 'ready') {
        showSuccess(`Generated ${finalJob.question_count} quiz questions!`);
        persistQuizJob(finalJob);
        setViewingQuizJob(finalJob); // Open modal to view
      } else if (finalJob.status === 'error') {
        persistQuizJob(finalJob);
        showError(finalJob.error || 'Quiz generation failed.');
      }
    } catch (error) {
      log.error({ err: error }, 'LQuiz generationE failed');
      showError(error instanceof Error ? error.message : 'Quiz generation failed.');
    } finally {
      setIsGeneratingQuiz(false);
      setCurrentQuizJob(null);
    }
  };

  return {
    savedQuizJobs,
    currentQuizJob,
    isGeneratingQuiz,
    viewingQuizJob,
    setViewingQuizJob,
    loadSavedJobs,
    handleQuizGeneration,
  };
};
