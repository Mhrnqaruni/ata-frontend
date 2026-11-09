// The Outlined icon of each thing the Notebook makes (Phase 1.38 design §1.2, §4.5, §4.8): its kind tile in the make
// section and on the rows of things made in a chat.
// Area: family

import AccountTreeOutlined from '@mui/icons-material/AccountTreeOutlined';
import AutoStoriesOutlined from '@mui/icons-material/AutoStoriesOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import QuizOutlined from '@mui/icons-material/QuizOutlined';
import StyleOutlined from '@mui/icons-material/StyleOutlined';

const ICONS = {
  quiz: QuizOutlined,
  flashcards: StyleOutlined,
  mindmap: AccountTreeOutlined,
  story: AutoStoriesOutlined,
  learn: MenuBookOutlined,
};

/** The kind's icon; an explanation's for any other kind. */
export const kindIcon = (kind) => ICONS[kind] || MenuBookOutlined;
