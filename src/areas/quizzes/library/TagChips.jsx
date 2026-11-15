// A quiz row's title and its tags (Phase 1.47 R14; design.md §3.10): the title first, then up to 2 tag chips in the
// room left and "+3" for the rest. A title that doesn't fit drops its chips into "+n", so it's never cut while they show.
// Area: quizzes

import { Link as RouterLink } from 'react-router-dom';
import { Box, Chip, Link, Tooltip } from '@mui/material';
import { font } from '../../../theme/tokens';
import { tagsThatFit } from './rows';
import { LIBRARY } from './words';

const ellipsis = { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const CHIP_MAX = 112; // a long tag's chip is cut at this width
const CHIP_EDGES = 20; // a chip's label padding (9 px a side) and its border

// The width a line takes in a font, measured on a canvas; without one, an estimate from its length.
let canvas;
function textWidth(text, style) {
  if (canvas === undefined) canvas = typeof document === 'undefined' ? null : document.createElement('canvas');
  const context = canvas?.getContext('2d');
  if (!context) return text.length * 8;
  context.font = `${style} ${font}`;
  return Math.ceil(context.measureText(text).width) + 1;
}

// The title's tooltip: the whole title, which a narrow column cuts, then the description when there is one (§11.6).
const titleTip = (title, description) => (
  <>
    <Box component="span" sx={{ display: 'block', fontWeight: 600 }}>
      {title}
    </Box>
    {description ? (
      <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
        {description}
      </Box>
    ) : null}
  </>
);

// title, description, tags: the row's; to: the page the title opens; room: the Quiz cell's inside width in px;
// max: the most chips shown (0 on a phone, where tags don't show).
export default function TagChips({ title, description, tags: given, to, room, max }) {
  const tags = max && given?.length ? given : [];
  const widths = tags.map((tag) => Math.min(CHIP_MAX, textWidth(tag.name, '600 12px') + CHIP_EDGES));
  const shown = tags.length ? tagsThatFit({ title: textWidth(title, '600 14px'), tags: widths, room, max }) : 0;
  const rest = tags.slice(shown);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
      <Tooltip title={titleTip(title, description)} placement="bottom-start">
        <Link
          component={RouterLink}
          to={to}
          underline="hover"
          sx={{ ...ellipsis, flex: '0 1 auto', color: 'var(--mst-ink)', fontWeight: 600 }}
        >
          {title}
        </Link>
      </Tooltip>
      {shown || rest.length ? (
        <Box sx={{ display: 'flex', gap: 0.5, flex: 'none' }}>
          {tags.slice(0, shown).map((tag) => (
            <Chip key={tag.id} label={tag.name} size="small" variant="outlined" sx={{ maxWidth: CHIP_MAX }} />
          ))}
          {rest.length ? (
            <Tooltip title={rest.map((tag) => tag.name).join(', ')}>
              <Chip label={LIBRARY.moreTags(rest.length)} size="small" variant="outlined" />
            </Tooltip>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
}
