// How close a typed answer must be (Phase 1.47 R5; SOT-1 C1, SOT-2; design.md §3.5, §3.7): the three levels, the
// level each question carries and sends, and the points line pupils see, which Preview shows too.
// Area: quizzes

import { PREVIEW } from './words';

export const LEVELS = ['exact', 'close', 'meaning'];
export const NEW_LEVEL = 'close'; // a question written now, or imported with AI (C1)
export const OLD_LEVEL = 'meaning'; // a question saved before the levels: the server reads a missing level so (C1)

// The level a question carries: its own when it's one of the three, else the fallback. A loaded question with none
// keeps "meaning" and sends it back, so a save never changes a level the teacher didn't touch.
export const levelOf = (question, fallback = OLD_LEVEL) =>
  LEVELS.includes(question?.match_level) ? question.match_level : fallback;

// The points line by type: "Up to 10 points" where the AI may give part points (a typed answer at Close or Same
// meaning), "10 points" where it's all or nothing, and none for a poll. Never "if right" on a typed answer.
export function pointsWords({ type, points, level }) {
  if (type === 'poll') return PREVIEW.poll;
  return type === 'short_answer' && level !== 'exact' ? PREVIEW.upTo(points) : PREVIEW.points(points);
}
