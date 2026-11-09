// The time on a parent-mode row (Phase 1.38 design §1.6): "Today at 10:15", "Yesterday at 18:40", or "7 Nov", with the
// year when it isn't this year.
// Area: family

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/** `iso` is a server time, and `now` is there for tests. '' when `iso` isn't a time. */
export function whenLabel(iso, now = new Date()) {
  const at = new Date(iso);
  if (!iso || Number.isNaN(at.getTime())) return '';
  // Rounded, so a day of 23 or 25 hours across a clock change still counts as one day.
  const days = Math.round((startOfDay(now) - startOfDay(at)) / 86400000);
  const clock = at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (days === 0) return `Today at ${clock}`;
  if (days === 1) return `Yesterday at ${clock}`;
  const year = at.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' };
  return at.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...year });
}
