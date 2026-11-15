// The built-in example quiz (Phase 1.46, L14, DR-9; design.md §3.13; SOT-11): "Example quiz: general knowledge", 8
// questions of every kind, each with a one-line explanation, made as a draft through the existing POST /api/quizzes.
// Area: quizzes

// 10 points and 20 s a question, 30 s for typed answers; a poll has no right answer and no points.
const choice = (text, options, right, explanation) => ({
  question_type: 'multiple_choice',
  question_text: text,
  options,
  correct_answer: [right], // the right answer's position, as the editor stores it
  points: 10,
  time_limit_seconds: 20,
  explanation,
});
const trueOrFalse = (text, right, explanation) => ({
  question_type: 'true_false',
  question_text: text,
  options: [],
  correct_answer: [right],
  points: 10,
  time_limit_seconds: 20,
  explanation,
});
const shortAnswer = (text, accepted, explanation) => ({
  question_type: 'short_answer',
  question_text: text,
  options: [],
  correct_answer: accepted, // marked by AI against these (SOT-12)
  match_level: 'close', // a new question's level (Phase 1.47 C1): spelling slips and plurals pass, other answers don't
  points: 10,
  time_limit_seconds: 30,
  explanation,
});
const poll = (text, options, explanation) => ({
  question_type: 'poll',
  question_text: text,
  options,
  correct_answer: [],
  points: 0,
  time_limit_seconds: 20,
  explanation,
});

export const EXAMPLE_QUESTIONS = [
  choice(
    'Which planet is closest to the Sun?',
    ['Mercury', 'Venus', 'Earth', 'Mars'],
    0,
    'Mercury orbits closest, at about 58 million km.'
  ),
  choice('How many sides does a hexagon have?', ['5', '6', '7', '8'], 1, "'Hex' means six."),
  choice(
    'Which of these is a mammal?',
    ['Shark', 'Dolphin', 'Trout', 'Octopus'],
    1,
    'Dolphins breathe air and feed their young milk.'
  ),
  trueOrFalse(
    'Water boils at 100 °C at sea level.',
    true,
    'At sea level, yes. Higher up it boils at a lower temperature.'
  ),
  trueOrFalse('Spiders are insects.', false, 'Spiders are arachnids: they have eight legs, and insects have six.'),
  shortAnswer(
    'Which gas do plants take in to make their food?',
    ['carbon dioxide', 'CO2'],
    'Plants use carbon dioxide, water and light in photosynthesis.'
  ),
  shortAnswer('What is 7 × 8?', ['56'], '7 × 8 = 56.'),
  poll(
    'Which subject should our next quiz be about?',
    ['Science', 'History', 'Maths', 'Geography'],
    'A poll has no right answer.'
  ),
].map((question, index) => ({ ...question, order_index: index }));

// A live quiz with the editor's own settings, and the leaderboard off, as every new quiz starts (Q5).
export const EXAMPLE_QUIZ = {
  title: 'Example quiz: general knowledge',
  settings: {
    mode: 'live',
    shuffle_questions: false,
    shuffle_options: false,
    show_correct_answers: true,
    allow_review: true,
    show_correct_answer_during_cooldown: true,
    show_final_score_to_students: true,
    show_result_feedback_to_students: true,
    show_leaderboard_to_students: false,
    leaderboard: false,
  },
  questions: EXAMPLE_QUESTIONS,
};
