// Wraps the assessment analytics endpoints: the analytics data, and the downloadable report in a chosen format.
// Area: analytics

import api from './api';
export const getAssessmentAnalytics = async (id) =>
  (await api.get(`/api/assessments/${encodeURIComponent(id)}/analytics`)).data;
export async function downloadAssessmentAnalytics(id, format) {
  const response = await api.get(`/api/assessments/${encodeURIComponent(id)}/analytics/report`, {
    params: { format },
    responseType: 'blob',
    timeout: 120000,
  });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = `assessment-analytics.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
