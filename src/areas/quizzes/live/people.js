// Who is in a live run (SOT-9; design.md §3.7): the class pupils here and missing, the walk-ins kept apart and out of
// the counts, and, during a question, who is still to answer. From the run's class list, participants and walk-ins.
// Area: quizzes

// A pupil's first name, for the class to read on Present.
export const firstName = (name) =>
  String(name || '')
    .trim()
    .split(/\s+/)[0] || '';

const byName = (a, b) => a.name.localeCompare(b.name, 'en-GB', { sensitivity: 'base' });

// The run's people. roster: the class list read ({ entries }), or null for a run anyone with the code can join;
// participants: everyone who joined; walkIns: the walk-in records ({ participant_id }). Each person is { id, name },
// where id is the participant's, so the socket's answers can be matched to them.
export function roomPeople({ roster, participants = [], walkIns = [] }) {
  const away = new Set(walkIns.map((record) => String(record.participant_id)));
  const joined = participants.map((person) => ({
    id: String(person.id),
    name: person.display_name || person.guest_name || '',
    active: person.is_active !== false,
  }));
  const walkInPeople = joined.filter((person) => away.has(person.id)).sort(byName);
  const entries = roster?.entries;
  if (!entries?.length) {
    const here = joined.filter((person) => !away.has(person.id)).sort(byName);
    return { hasClassList: false, expected: null, here, missing: [], walkIns: walkInPeople, inRoom: joined };
  }
  // The class list names each pupil as the teacher wrote them, in place of what they typed.
  const listed = new Map(entries.filter((entry) => entry.participant_id).map((e) => [String(e.participant_id), e]));
  const inRoom = joined.map((person) =>
    listed.has(person.id) ? { ...person, name: listed.get(person.id).student_name || person.name } : person
  );
  const named = (entry) => ({
    id: entry.participant_id ? String(entry.participant_id) : `entry-${entry.id}`,
    name: entry.student_name || '',
  });
  return {
    hasClassList: true,
    expected: entries.length,
    here: entries
      .filter((entry) => entry.joined)
      .map(named)
      .sort(byName),
    missing: entries
      .filter((entry) => !entry.joined)
      .map(named)
      .sort(byName),
    walkIns: walkInPeople,
    inRoom,
  };
}

// During a question: who is still to answer and who has, by name, from the socket's answers. known is false when some
// answers can't be put to a name: after the page reloads mid-question, no read says who answered (QA P3-14), so only
// the count shows, and the names come back with the next question.
export function answeredSplit(inRoom, answered) {
  const ids = new Set(answered.ids);
  const present = inRoom.filter((person) => person.active || ids.has(person.id));
  const done = present.filter((person) => ids.has(person.id)).sort(byName);
  const waiting = present.filter((person) => !ids.has(person.id)).sort(byName);
  const count = Math.max(answered.count, done.length);
  return { done, waiting, count, total: Math.max(present.length, count), known: done.length >= count };
}
