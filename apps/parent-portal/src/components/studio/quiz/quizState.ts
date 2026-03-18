import type { QuizJob } from '../../../lib/api/studio/quizzes';

export function upsertQuizJob(jobs: QuizJob[], nextJob: QuizJob): QuizJob[] {
  return [nextJob, ...jobs.filter((job) => job.id !== nextJob.id)];
}

export function isQuizJobReady(job: QuizJob): boolean {
  return job.status === 'ready' && Array.isArray(job.questions) && job.questions.length > 0;
}

export function isQuizJobErrored(job: QuizJob): boolean {
  return job.status === 'error';
}

export function getQuizJobErrorMessage(job: QuizJob): string {
  return job.error || 'Quiz generation failed before any questions were returned.';
}
