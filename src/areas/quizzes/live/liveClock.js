// The live quiz's countdown, from the server's own time left (remaining_ms), so a device clock that is behind or
// ahead never changes it; and what a pupil's answer send came to (SOT-1.1). The teacher's and the pupils' pages use it.
// Area: quizzes

// When the question ends on this device's clock: now plus the server's time left, never more than the question's
// limit. A server from before remaining_ms gives only expires_at, which is capped the same way.
export function questionEndsAt(message, now = Date.now()) {
  const limitMs = (message?.question?.time_limit_seconds || 0) * 1000;
  let left = Number.isFinite(message?.remaining_ms) ? message.remaining_ms : Date.parse(message?.expires_at) - now;
  if (!Number.isFinite(left)) left = limitMs;
  return now + Math.max(0, limitMs ? Math.min(left, limitMs) : left);
}

// Whole seconds left, as the countdown shows them.
export const secondsLeft = (endsAt, now = Date.now()) => Math.max(0, Math.ceil((endsAt - now) / 1000));

// The time an answer carries, in whole ms between 0 and the question's limit. The server only shows it: it times
// each answer itself.
export function answerTimeMs(limitSeconds, secondsRemaining) {
  const limitMs = (limitSeconds || 0) * 1000;
  return Math.round(Math.min(limitMs, Math.max(0, limitMs - (secondsRemaining || 0) * 1000)));
}

// The server's words for an answer that came after its question closed.
const LATE = ['Time limit exceeded', 'Session is not accepting answers', 'Answer submitted for a non-current question'];

// What a refused send means: the server already has this answer ('sent', as when a reply was lost), the question
// had closed ('late'), or anything else, such as no connection ('failed'), which one tap sends again.
export function sendOutcome(errorMessage) {
  if (errorMessage === 'Question already answered') return 'sent';
  return LATE.includes(errorMessage) ? 'late' : 'failed';
}
