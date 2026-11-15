// The teacher's live page logic (Phase 1.46 S6.1; SOT-9, SOT-1.1; design.md §3.7): the clock from remaining_ms, the
// room the socket builds, the one main button, who is still to answer (also after a reload), who's here, the hidden
// right answer and its counts, and the page's words.
// Area: quizzes
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  stdin: {
    contents: `export * from './src/areas/quizzes/live/liveClock.js';
export * from './src/areas/quizzes/live/roomState.js';
export * from './src/areas/quizzes/live/people.js';
export * from './src/areas/quizzes/live/answers.js';
export * from './src/areas/quizzes/live/words.js';
export { START } from './src/areas/quizzes/editor/words.js';
export { neverShownIn } from './src/areas/quizzes/words.js';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'error',
});
const live = await import(`data:text/javascript,${encodeURIComponent(bundle.outputFiles[0].text)}`);
const { questionEndsAt, secondsLeft, answerTimeMs, sendOutcome, initialRoom, roomReducer, mainAction } = live;
const { roomPeople, answeredSplit, answerRows, LIVE, finishLine, actionError, ordinal, neverShownIn, START } = live;
const { everyoneAnswered, timedChoice, rightLine } = live;

const SERVER_NOW = Date.parse('2026-11-14T16:00:00.000Z');
const question = (id, index, extra = {}) => ({
  type: 'question_started',
  question: {
    id,
    text: `Q${index + 1}`,
    type: 'multiple_choice',
    options: ['A1', 'B1', 'C1', 'D1'],
    order_index: index,
    time_limit_seconds: 30,
  },
  expires_at: '2026-11-14T16:00:30Z',
  remaining_ms: 29950,
  ...extra,
});
const apply = (room, messages, now = SERVER_NOW) =>
  messages.reduce((r, message) => roomReducer(r, { message, now }), room);

test('X9 kept: a device 12 s behind counts down from 30 s, and an early answer carries 2000 ms', () => {
  const device = SERVER_NOW - 12000;
  const endsAt = questionEndsAt(question('q1', 0), device);
  assert.equal(secondsLeft(endsAt, device), 30);
  assert.equal(answerTimeMs(30, secondsLeft(endsAt, device + 2500)), 2000);
  assert.equal(secondsLeft(questionEndsAt(question('q1', 0, { remaining_ms: 45000 }), device), device), 30);
  assert.equal(sendOutcome('Question already answered'), 'sent');
  assert.equal(sendOutcome('Session is not accepting answers'), 'late');
  assert.equal(sendOutcome('Network Error'), 'failed');
});

test('a run from the lobby to its last question: Start quiz, Show answers, Next question, Finish and see results', () => {
  const run = { status: 'waiting', config_snapshot: { auto_advance_enabled: false, cooldown_seconds: 15 } };
  let room = initialRoom(run);
  assert.equal(mainAction(room, 2), 'start');
  room = apply(room, [{ type: 'session_started' }]);
  assert.equal(mainAction(room, 2), 'starting');
  room = apply(room, [question('q1', 0)]);
  assert.equal(mainAction(room, 2), 'reveal');
  assert.equal(room.closed, false);
  room = apply(room, [
    { type: 'question_ended', question_index: 0, cooldown_seconds: 15, auto_advance_enabled: false },
  ]);
  assert.equal(mainAction(room, 2), 'next');
  assert.equal(room.movesOnAt, null, "I'll press Next: nothing moves on by itself");
  room = apply(room, [question('q2', 1)]);
  assert.equal(mainAction(room, 2), 'reveal', 'Show answers on the last question too (Q13)');
  assert.equal(
    mainAction(room, 2, { lastClosed: true }),
    'finish',
    'Show answers answered 422 there: it had already closed, so Finish'
  );
  room = apply(room, [{ type: 'cooldown_started', cooldown_seconds: 10, auto_advance_enabled: false }]);
  assert.equal(mainAction(room, 2), 'finish');
  room = apply(room, [{ type: 'session_ended', final_status: 'completed' }]);
  assert.equal(mainAction(room, 2), null);
  assert.equal(room.status, 'completed');
});

test('who answered: ticks by name, a reconnect keeps them, and the count stops when answering closes', () => {
  let room = apply(initialRoom({ status: 'active' }), [question('q1', 0)]);
  room = apply(room, [
    { type: 'participant_answered', participant_id: 'p1', question_id: 'q1' },
    { type: 'participant_answered', participant_id: 'p1', question_id: 'q1' },
    { type: 'participant_answered', participant_id: 'p2', question_id: 'q0' },
    { type: 'stats_update', answers_received: 1, total_participants: 3 },
  ]);
  assert.deepEqual(room.answered, { count: 1, ids: ['p1'], total: 3 });
  room = apply(room, [question('q1', 0, { remaining_ms: 12000 })], SERVER_NOW + 18000);
  assert.deepEqual(room.answered.ids, ['p1'], 'the same question again keeps who answered');
  assert.equal(secondsLeft(room.endsAt, SERVER_NOW + 18000), 12, 'and refreshes the clock');
  room = apply(room, [{ type: 'question_ended', question_index: 0, cooldown_seconds: 8, auto_advance_enabled: true }]);
  assert.equal(secondsLeft(room.movesOnAt, SERVER_NOW), 8, 'moving on by itself: "Moves on in 8 s"');
  room = apply(room, [{ type: 'stats_update', answers_received: 3, total_participants: 3 }]);
  assert.equal(room.answered.count, 1, "the server's empty answers for those who gave none don't count");
  room = apply(room, [question('q2', 1)]);
  assert.deepEqual(room.answered, { count: 0, ids: [], total: 3 });
});

const roster = {
  entries: [
    { id: 'e1', student_name: 'Ada Lovelace', joined: true, participant_id: 'p1' },
    { id: 'e2', student_name: 'Ben Okafor', joined: true, participant_id: 'p2' },
    { id: 'e3', student_name: 'Cleo Diaz', joined: false, participant_id: null },
  ],
};
const participants = [
  { id: 'p1', display_name: 'ada', is_active: true },
  { id: 'p2', display_name: 'Ben O', is_active: true },
  { id: 'p9', display_name: 'Sam Walk', is_active: true },
];

test("who's here: the class list's names, the missing, and walk-ins kept apart and out of the counts", () => {
  const people = roomPeople({ roster, participants, walkIns: [{ participant_id: 'p9' }] });
  assert.equal(LIVE.here(people.here.length, people.expected), '2 of 3 here');
  assert.deepEqual(
    people.here.map((p) => p.name),
    ['Ada Lovelace', 'Ben Okafor']
  );
  assert.deepEqual(
    people.missing.map((p) => p.name),
    ['Cleo Diaz']
  );
  assert.deepEqual(
    people.walkIns.map((p) => p.name),
    ['Sam Walk']
  );
  const open = roomPeople({ roster: null, participants, walkIns: [] });
  assert.equal(LIVE.here(open.here.length, open.expected), '3 here');
});

test('Still to answer: every name as answers tick in; after a reload mid-question, the count until the next question', () => {
  const { inRoom } = roomPeople({ roster, participants, walkIns: [{ participant_id: 'p9' }] });
  const split = answeredSplit(inRoom, { count: 1, ids: ['p1'] });
  assert.deepEqual(
    split.waiting.map((p) => p.name),
    ['Ben Okafor', 'Sam Walk']
  );
  assert.deepEqual(
    split.done.map((p) => p.name),
    ['Ada Lovelace']
  );
  assert.equal(LIVE.answeredOf(split.count, split.total), '1 of 3 answered');
  const reloaded = answeredSplit(inRoom, { count: 2, ids: [] });
  assert.equal(reloaded.known, false, 'two answers with no names: the count shows, never a wrong list');
  assert.equal(LIVE.answeredOf(reloaded.count, reloaded.total), '2 of 3 answered');
  const newAnswer = answeredSplit(inRoom, { count: 3, ids: ['p2'] });
  assert.equal(newAnswer.known, false, 'a new answer after the reload still leaves two without names');
  assert.equal(LIVE.answeredOf(newAnswer.count, newAnswer.total), '3 of 3 answered');
  const nextQuestion = answeredSplit(inRoom, { count: 1, ids: ['p9'] });
  assert.equal(nextQuestion.known, true, 'from the next question every answer has a name again');
});

test('the right answer and the counts stay hidden until Show answers (C2-4), then show inside each answer', () => {
  const socketQuestion = question('q1', 0).question;
  const key = { id: 'q1', correct_answer: [2] };
  const counts = { total_responses: 10, correct_responses: 6, options_distribution: { 0: 1, 2: 6, 3: 3 } };
  const hidden = answerRows(socketQuestion, key, { revealed: false, counts });
  assert.ok(hidden.every((row) => !row.right && row.count === null && row.share === null));
  const shown = answerRows(socketQuestion, key, { revealed: true, counts });
  assert.deepEqual(
    shown.map((row) => [row.letter, row.right, row.count]),
    [
      ['A', false, 1],
      ['B', false, 0],
      ['C', true, 6],
      ['D', false, 3],
    ]
  );
  assert.equal(shown[2].share, 0.6);
  const tf = answerRows({ type: 'true_false', options: [] }, { correct_answer: [false] }, { revealed: true });
  assert.deepEqual(
    tf.map((row) => [row.text, row.right]),
    [
      ['True', false],
      ['False', true],
    ]
  );
  const poll = answerRows(
    { type: 'poll', options: ['Science', 'Maths'] },
    { correct_answer: [] },
    { revealed: true, counts }
  );
  assert.ok(poll.every((row) => !row.right));
});

test('the words: the finish window by moment, places that ties share, failures, and no word the screens never say', () => {
  assert.equal(finishLine({ started: false }), "No questions have been asked yet. Pupils can't join after this.");
  assert.equal(
    finishLine({ started: true, question: {}, closed: false, answered: 18, total: 28 }),
    '18 of 28 answered this question. Results so far are saved.'
  );
  assert.equal(
    finishLine({ started: true, question: {}, closed: true, last: true, answered: 25, total: 28 }),
    '25 of 28 answered the last question. Results are saved.'
  );
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal), [
    '1st',
    '2nd',
    '3rd',
    '4th',
    '11th',
    '12th',
    '13th',
    '21st',
    '22nd',
  ]);
  assert.equal(actionError({ status: 503 }), LIVE.busy);
  assert.equal(actionError({ status: 400, message: 'No more questions remaining' }), 'No more questions remaining');
  const said = Object.values(LIVE).map((word) => (typeof word === 'function' ? word(3, 28) : word));
  assert.deepEqual(neverShownIn(said.join(' ')), []);
});

test('the pace is asked once (Phase 1.47 R1): each choice has its own line, the pause is the quiz’s, the lobby says it', () => {
  assert.equal(START.byHandLine, 'You show the answers, then move to the next question.');
  assert.equal(
    START.byItselfLine(10),
    'Each question ends when its time is up, shows the answers for 10 s, then moves on.'
  );
  assert.match(START.byItselfLine(15), /the answers for 15 s,/, 'a quiz with a 15 s pause says 15 s');
  assert.equal(LIVE.paceLine(START.byHand), 'Pace: I’ll press Next');
  assert.equal(LIVE.paceLine(START.byItself), 'Pace: Move on by itself');
  const said = [START.byHand, START.byHandLine, START.byItself, START.byItselfLine(10), LIVE.change];
  assert.deepEqual(neverShownIn(said.join(' ')), []);
});

test('a timed run (Phase 1.47 R2): no big button while a question is open; "Show answers now", then "Everyone’s answered"', () => {
  const run = { status: 'active', config_snapshot: { auto_advance_enabled: true, cooldown_seconds: 10 } };
  let room = apply(initialRoom(run), [question('q1', 0)]);
  assert.equal(mainAction(room, 2), null, 'nothing big ends a timed question, so a stray press or key can’t');
  const { inRoom } = roomPeople({ roster: null, participants: participants.slice(0, 2), walkIns: [] });
  assert.equal(everyoneAnswered(room, answeredSplit(inRoom, room.answered)), false);
  assert.equal(timedChoice(room, false), 'early');
  room = apply(room, [
    { type: 'participant_answered', participant_id: 'p1', question_id: 'q1' },
    { type: 'participant_answered', participant_id: 'p2', question_id: 'q1' },
    { type: 'stats_update', answers_received: 2, total_participants: 2 },
  ]);
  assert.equal(everyoneAnswered(room, answeredSplit(inRoom, room.answered)), true);
  assert.equal(timedChoice(room, true), 'everyone');
  const third = apply(room, [{ type: 'stats_update', answers_received: 2, total_participants: 3 }]);
  assert.equal(
    everyoneAnswered(third, answeredSplit(inRoom, third.answered)),
    false,
    'a pupil the page has not listed yet: the server says not everyone'
  );
  const empty = apply(initialRoom(run), [question('q1', 0)]);
  assert.equal(everyoneAnswered(empty, answeredSplit([], empty.answered)), false, 'never in an empty room');
  room = apply(room, [{ type: 'question_ended', question_index: 0, cooldown_seconds: 8, auto_advance_enabled: true }]);
  assert.equal(mainAction(room, 2), 'next', 'the pause: the main button skips it');
  assert.equal(timedChoice(room, true), null);
  assert.equal(LIVE.nextIn(secondsLeft(room.movesOnAt, SERVER_NOW)), 'Next question in 8 s');
  const manual = apply(initialRoom({ status: 'active' }), [question('q1', 0)]);
  assert.equal(mainAction(manual, 2), 'reveal', "I'll press Next: Show answers stays the main button");
  assert.equal(timedChoice(manual, true), null);
});

test('typed answers waiting for the AI (C2): marking, the counts read again when the marks come, and C9’s words', () => {
  const typed = question('q1', 0);
  typed.question = { ...typed.question, type: 'short_answer', options: [] };
  const closed = (pending) => [
    {
      type: 'question_ended',
      question_index: 0,
      cooldown_seconds: 10,
      auto_advance_enabled: false,
      marks_pending: pending,
    },
    { type: 'cooldown_started', cooldown_seconds: 10, auto_advance_enabled: false, marks_pending: pending },
  ];
  let room = apply(initialRoom({ status: 'active' }), [typed, ...closed(true)]);
  assert.deepEqual([room.marksPending, room.marksRound], [true, 0], '"Marking typed answers…", and no count is read');
  room = apply(room, closed(false));
  assert.deepEqual([room.marksPending, room.marksRound], [false, 1], 'the marks came: the counts are read again');
  room = apply(room, closed(false));
  assert.equal(room.marksRound, 1, 'the same message again reads nothing new');
  const old = apply(initialRoom({ status: 'active' }), [typed, { type: 'question_ended', question_index: 0 }]);
  assert.equal(old.marksPending, false, 'a server without marks_pending shows the count, as before');
  room = apply(room, [question('q2', 1)]);
  assert.deepEqual([room.marksPending, room.marksRound], [false, 0], 'a new question starts clean');
  assert.equal(rightLine({ correct_responses: 2, part_points: 1, waiting: 0 }, 2), '2 of 2 right · 1 with part points');
  assert.equal(rightLine({ correct_responses: 2, part_points: 0, waiting: 0 }, 2), '2 of 2 right');
  assert.equal(rightLine({ correct_responses: 0, part_points: 0, waiting: 2 }, 2), '2 answers to mark after the quiz');
  assert.equal(rightLine({ correct_responses: 0, waiting: 1 }, 2), '1 answer to mark after the quiz');
  assert.equal(rightLine({ correct_responses: 1 }, 2), '1 of 2 right', 'a server without C9 still counts');
});

test('the live page at 390 (Phase 1.47 §3.6): who is still to answer as one line that opens', () => {
  assert.equal(LIVE.stillLine(['Lee Park', 'Sam Walker']), 'Still to answer: Lee Park, Sam Walker');
  assert.equal(
    LIVE.stillLine(['Lee', 'Sam', 'Ada', 'Ben', 'Cleo', 'Dan', 'Eve', 'Finn']),
    'Still to answer: Lee, Sam +6'
  );
  assert.equal(LIVE.stillLine(['Lee']), 'Still to answer: Lee');
});
