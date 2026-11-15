// The questions as a CSV file, as the builder has always exported them (⋯ More · Export CSV): one row per question,
// with up to 6 answers, the right answer, points, time and explanation.
// Area: quizzes

const HEADERS = [
  'Question #',
  'Type',
  'Question Text',
  'Option 1',
  'Option 2',
  'Option 3',
  'Option 4',
  'Option 5',
  'Option 6',
  'Correct Answer',
  'Points',
  'Time Limit (seconds)',
  'Explanation',
];

// A field in quotes when it has a comma, a quote or a new line, with its quotes doubled.
export function csvField(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const typeName = (type) =>
  String(type ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (first) => first.toUpperCase());

function rightAnswer(question) {
  const answers = Array.isArray(question.correct_answer) ? question.correct_answer : [];
  if (question.question_type === 'poll') return 'N/A (Poll)';
  if (question.question_type === 'true_false')
    return answers[0] === true ? 'True' : answers[0] === false ? 'False' : '';
  if (question.question_type === 'multiple_choice')
    return answers.map((answer) => (Number.isInteger(answer) ? `Option ${answer + 1}` : String(answer))).join('; ');
  return answers.join('; ');
}

export function questionsCsv(questions) {
  const rows = questions.map((question, index) => {
    const options = Array.isArray(question.options) ? question.options : [];
    return [
      index + 1,
      typeName(question.question_type),
      question.question_text,
      ...Array.from({ length: 6 }, (_, position) => options[position] ?? ''),
      rightAnswer(question),
      question.points ?? 10,
      question.time_limit_seconds ?? '',
      question.explanation ?? '',
    ]
      .map(csvField)
      .join(',');
  });
  return [HEADERS.join(','), ...rows].join('\n');
}

// Downloads the questions as "<title>_questions.csv".
export function downloadCsv(questions, title) {
  const blob = new Blob([questionsCsv(questions)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${(title || 'quiz').trim().replace(/\s+/g, '_')}_questions.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
