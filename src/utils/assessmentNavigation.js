// Picks where an assessment's link opens: its results, the retry form if it failed, or the list focused on it.
// Area: assessments

export function assessmentDestination(job) {
  const id = encodeURIComponent(job.id);
  if (['Completed', 'Pending Review'].includes(job.status)) return `/assessments/${id}/results`;
  if (job.status === 'Failed') return `/assessments/new?retryJobId=${id}`;
  return `/assessments?focus=${id}`;
}
