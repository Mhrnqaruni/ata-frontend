// The address of one pupil's review in one run (Phase 1.47 S4.2): the results page's Review button and the review
// page's ‹ › link here. pupilId is the attempt's id (C3): the summary rows' attempt_id.
// Area: quizzes

const part = (id) => encodeURIComponent(String(id));

export const reviewLink = (quizId, runId, pupilId) =>
  `/quizzes/${part(quizId)}/runs/${part(runId)}/pupils/${part(pupilId)}`;
