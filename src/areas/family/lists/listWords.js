// The words and icons of parent mode's list pages (design §1.5–1.7, §5.3, §6.2): each page's sentence under its
// title, each list section's empty state, and each kind's Outlined icon, as the side panel shows it.
// Area: family

import AccountTreeOutlined from '@mui/icons-material/AccountTreeOutlined';
import AssignmentTurnedInOutlined from '@mui/icons-material/AssignmentTurnedInOutlined';
import AutoStoriesOutlined from '@mui/icons-material/AutoStoriesOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import QuizOutlined from '@mui/icons-material/QuizOutlined';
import StyleOutlined from '@mui/icons-material/StyleOutlined';

/** Each activity kind's icon (design §1.3): its kind tile's, and its section's empty state's. */
export const KIND_ICONS = {
  check: AssignmentTurnedInOutlined,
  quiz: QuizOutlined,
  flashcards: StyleOutlined,
  mindmap: AccountTreeOutlined,
  story: AutoStoriesOutlined,
  learn: MenuBookOutlined,
};

/**
 * Each list page's words, by its section's id in sections.js, given the child's name: the sentence under the title
 * (design §1.5) and, for a list section, its empty state's title and line (§1.7). The empty state has no button,
 * because the title row already holds the page's main action, and its line doesn't repeat the sentence.
 */
export const PAGE_WORDS = {
  activities: { subtitle: (name) => `Things to make for ${name} to practise with.` },
  homework: {
    subtitle: (name) =>
      `Take a photo of ${name}’s finished homework. AI marks it in about a minute and explains any mistakes.`,
    emptyTitle: 'No homework checked yet',
    empty: (name) => `Each check will show here, with ${name}’s score and what to look at together.`,
  },
  // Each activity list says who makes its items (design §6.2, round 3): six testers asked "who made this?".
  quizzes: {
    subtitle: (name) => `Quizzes AI writes when you ask. ${name} answers them here and is marked straight away.`,
    emptyTitle: 'No quizzes yet',
    empty: (name) => `${name}’s quizzes will show here, with each score.`,
  },
  flashcards: {
    subtitle: (name) =>
      `Cards AI writes when you ask, to flip with ${name}: a question on the front, the answer on the back.`,
    emptyTitle: 'No flashcards yet',
    empty: (name) => `${name}’s card sets will show here.`,
  },
  'mind-maps': {
    subtitle: (name) => `Maps AI draws when you ask: a topic as linked ideas, so ${name} sees the big picture.`,
    emptyTitle: 'No mind maps yet',
    empty: (name) => `${name}’s mind maps will show here.`,
  },
  stories: {
    subtitle: () => 'Stories AI writes when you ask: a short one that teaches a topic, to read together.',
    emptyTitle: 'No stories yet',
    empty: (name) => `${name}’s stories will show here.`,
  },
};
