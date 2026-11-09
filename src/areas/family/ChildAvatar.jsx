// A child's initial in a circle of the child's own colour (childTone), as the switcher and the Child page show it.
// Moved from FamilyHome.jsx unchanged (Phase 1.37, S2.4).
// Area: family

import { childTone } from './familyWords';

export default function ChildAvatar({ child, size = 36 }) {
  return (
    <span
      className="fam-avatar"
      style={{ '--fam-avatar': childTone(child?.id), width: size, height: size, fontSize: size * 0.44 }}
      aria-hidden
    >
      {(child?.displayName || child?.name || '?').trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}
