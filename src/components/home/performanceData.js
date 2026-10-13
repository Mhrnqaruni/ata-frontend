// Current finalized assessment scores, weighted equally per stable student entity.
// No names, display IDs, absent/pending rows or synthetic values enter this calculation.
export function buildPerformanceSeries(assessments) {
  const students = new Map();
  const byDay = new Map();
  let latest = null;
  for (const job of [...assessments].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))) {
    let added = false;
    for (const row of job.students || []) {
      if (!['AI_GRADED', 'TEACHER_GRADED'].includes(row.status) || row.isAbsent || !row.entityId) continue;
      if (row.totalScore == null || row.maxTotalScore == null) continue;
      const score = Number(row.totalScore), maximum = Number(row.maxTotalScore);
      if (!Number.isFinite(score) || !Number.isFinite(maximum) || maximum <= 0 || score < 0 || score > maximum) continue;
      const entry = students.get(row.entityId) || { sum: 0, count: 0 };
      entry.sum += score / maximum * 100;
      entry.count += 1;
      students.set(row.entityId, entry);
      added = true;
    }
    if (!added) continue;
    const average = [...students.values()].reduce((sum, item) => sum + item.sum / item.count, 0) / students.size;
    const date = new Date(job.createdAt);
    latest = { id: job.id, average, graded: students.size, label: '' };
    if (!Number.isNaN(date.getTime())) {
      const day = date.toISOString().slice(0, 10);
      byDay.set(day, { ...latest, date: day });
    }
  }
  return { latest, items: [...byDay.values()] };
}
