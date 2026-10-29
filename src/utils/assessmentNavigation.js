export function assessmentDestination(job) {
  const id = encodeURIComponent(job.id);
  if (["Completed", "Pending Review"].includes(job.status))
    return `/assessments/${id}/results`;
  if (job.status === "Failed") return `/assessments/new?retryJobId=${id}`;
  return `/assessments?focus=${id}`;
}
