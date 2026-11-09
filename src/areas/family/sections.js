// The one list of parent-mode sections (C-11): label, icon, address segment and page name, in the order the side
// panel and the phone bars show them. App.jsx writes each section's route out by hand, as the page-name test reads it.
// Area: family

import HomeOutlined from '@mui/icons-material/HomeOutlined';
import ForumOutlined from '@mui/icons-material/ForumOutlined';
import AssignmentTurnedInOutlined from '@mui/icons-material/AssignmentTurnedInOutlined';
import ExtensionOutlined from '@mui/icons-material/ExtensionOutlined';
import QuizOutlined from '@mui/icons-material/QuizOutlined';
import StyleOutlined from '@mui/icons-material/StyleOutlined';
import AccountTreeOutlined from '@mui/icons-material/AccountTreeOutlined';
import AutoStoriesOutlined from '@mui/icons-material/AutoStoriesOutlined';
import { familyPath, segmentOf } from './familyPaths';

// The side panel's group labels, by group id.
export const GROUPS = { activities: 'Activities' };

// `phone` puts a section in the phone's bottom bar; `group` puts it under a group label in the side panel, and
// `panel: false` leaves it out of the panel. A list section has its activity `kind` and its `empty` line
// (design §5.4), and an activity section its `make` button's words; the Activities page shows each kind's `hint`,
// today's one-line description.
export const SECTIONS = [
  { id: 'child', label: 'Home', icon: HomeOutlined, segment: '', page: 'family.child', phone: true },
  {
    id: 'notebook',
    label: 'Assistant',
    icon: ForumOutlined,
    segment: 'notebook',
    page: 'family.notebook',
    phone: true,
  },
  {
    id: 'homework',
    label: 'Homework',
    icon: AssignmentTurnedInOutlined,
    segment: 'homework',
    page: 'family.homework',
    phone: true,
    kind: 'check',
    empty: 'No homework checked yet.',
  },
  // The phone's way into the group (design §3.3, §3.8). On computers the panel shows the group's label instead.
  {
    id: 'activities',
    label: 'Activities',
    icon: ExtensionOutlined,
    segment: 'activities',
    page: 'family.activities',
    phone: true,
    panel: false,
  },
  {
    id: 'quizzes',
    label: 'Quizzes',
    icon: QuizOutlined,
    segment: 'quizzes',
    page: 'family.quizzes',
    group: 'activities',
    kind: 'quiz',
    empty: 'No quizzes yet.',
    make: 'Make a quiz',
    hint: 'Questions to answer',
  },
  {
    id: 'flashcards',
    label: 'Flashcards',
    icon: StyleOutlined,
    segment: 'flashcards',
    page: 'family.flashcards',
    group: 'activities',
    kind: 'flashcards',
    empty: 'No flashcards yet.',
    make: 'Make flashcards',
    hint: 'Cards to flip',
  },
  {
    id: 'mind-maps',
    label: 'Mind maps',
    icon: AccountTreeOutlined,
    segment: 'mind-maps',
    page: 'family.mind-maps',
    group: 'activities',
    kind: 'mindmap',
    empty: 'No mind maps yet.',
    make: 'Make a mind map',
    hint: 'See the big picture',
  },
  {
    id: 'stories',
    label: 'Stories',
    icon: AutoStoriesOutlined,
    segment: 'stories',
    page: 'family.stories',
    group: 'activities',
    kind: 'story',
    empty: 'No stories yet.',
    make: 'Make a story',
    hint: 'Learn through a story',
  },
];

// The child's profile (Phase 1.38 design §3.3) is no section: nothing in the sidebar or the tab bar is current there.
export const PROFILE = { id: 'profile', label: 'Profile', segment: 'profile' };

/** The section an address is in, by its first segment after the child's id; Home otherwise, or the profile. */
export function sectionOf(pathname) {
  const segment = segmentOf(pathname);
  if (segment === PROFILE.segment) return PROFILE;
  return SECTIONS.find((section) => section.segment === segment) || SECTIONS[0];
}

// Where each kind's results open (design §3.10–3.11): under its section, and explanations under the Notebook.
export const RESULT_SEGMENTS = {
  ...Object.fromEntries(SECTIONS.filter((section) => section.kind).map(({ kind, segment }) => [kind, segment])),
  learn: 'notebook/explanations',
};

/** A result's address, from its activity's kind and id; the child's page for a kind with no section. */
export function resultPath(childId, { kind, id }) {
  return RESULT_SEGMENTS[kind] ? familyPath(childId, RESULT_SEGMENTS[kind], id) : familyPath(childId);
}
