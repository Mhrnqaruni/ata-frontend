// Starting a quiz from the Start window (Phase 1.46 S5.3; SOT-6, SOT-9, SOT-10; QA P2-2, P3-12): a live run with the
// pace chosen, or homework made and then started, the start tried twice and then left for "Try again" on the same run.
// Area: quizzes

const sameIds = (a = [], b = []) => a.length === b.length && [...a].sort().every((id, i) => id === [...b].sort()[i]);

// The classes chosen at launch, or null for the quiz's own: only a real change is sent, so a pre or post quiz, which
// must keep its classes, and an older quiz with only a class, start exactly as before.
export function launchAudience(chosen, own) {
  const empty = (spec) => !spec?.class_ids?.length && !spec?.tag_ids?.length;
  if (empty(chosen)) return null;
  const same =
    !empty(own) &&
    sameIds(chosen.class_ids, own.class_ids) &&
    sameIds(chosen.tag_ids, own.tag_ids) &&
    (chosen.mode ?? 'union') === (own.mode ?? 'union');
  return same ? null : chosen;
}

// A new run moves on by itself only when the quiz saved that (SOT-9); the pace is sent only when it differs.
export const quizMovesOn = (settings) => settings?.auto_advance_enabled === true;

// Tomorrow at 17:00 on the device's clock: the Send window's due date to start from (design.md §3.6).
export function tomorrowAtFive(now = new Date()) {
  const due = new Date(now);
  due.setDate(due.getDate() + 1);
  due.setHours(17, 0, 0, 0);
  return due;
}

// A live run, then its pace through the lobby's own call with the quiz's cooldown (QA P3-1). A pace that doesn't set
// isn't a failed start: the lobby can still change it.
export async function startLive(api, { quizId, audience, movesOn, settings }) {
  const run = await api.createLiveRun(quizId, audience);
  if (movesOn !== quizMovesOn(settings)) {
    try {
      await api.setPace(run.id, movesOn, settings?.cooldown_seconds ?? 10);
    } catch {
      /* the lobby shows the pace and can change it */
    }
  }
  return run;
}

// Homework: made as a draft run (unless runId is the one already made), then started; a start that fails is tried once
// more. Resolves to { id, started } and, when it didn't start, the error, so "Try again" starts the same run.
export async function sendHomework(api, body, runId = null) {
  const id = runId ?? (await api.createHomework(body)).id;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await api.startHomework(id);
      return { id, started: true };
    } catch (error) {
      if (attempt === 1) return { id, started: false, error };
    }
  }
  return { id, started: false };
}

// The homework run's settings from the quiz's two homework tiles, with the due date (SOT-10, SOT-10a).
export function homeworkBody({ quizId, settings, due, audience }) {
  return {
    quiz_id: quizId,
    deadline: due.toISOString(),
    ...(audience ? { audience } : {}),
    allow_navigation: true,
    allow_review_before_submit: true,
    require_all_answers: false,
    show_timer: true,
    show_results_immediately: false,
    show_final_score_to_students: settings?.show_final_score_to_students ?? true,
    show_answer_feedback: settings?.show_answer_feedback ?? true,
  };
}
