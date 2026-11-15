// A pupil's place in a live quiz, kept for this tab only (#62), so a reload or a phone that slept gets straight back
// in, with the answer it sent. sessionStorage isn't shared with other tabs or kept on a shared device.
// Area: quizzes

const KEY = 'mst.quiz.place';

// The saved place for this code, or null: { roomCode, session, participant, guestToken, answer? }.
export function readPlace(code) {
  try {
    const place = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    const same = code && String(place?.roomCode).toUpperCase() === String(code).toUpperCase();
    return same && place.session?.id && place.guestToken ? place : null;
  } catch {
    return null;
  }
}

export function savePlace(place) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(place));
  } catch {
    // No storage, as in some private windows: joining still works, without getting back in.
  }
}

// Keeps the answer sent to a question with the place, so a reload marks it again.
export function rememberAnswer(code, questionId, value) {
  const place = readPlace(code);
  if (place) savePlace({ ...place, answer: { questionId: String(questionId), value } });
}

export function forgetPlace() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing was kept.
  }
}
