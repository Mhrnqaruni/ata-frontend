// Every parent-mode address, built in one place (C-1): a child's page, a section, a result, the Notebook with a chat,
// the address an old-style link now has, and where /family opens.
// Area: family

const CHILD_PATH = /^\/family\/children\/([^/?#]+)/;

function decoded(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return '';
  }
}

/** A family address. `section` is a section's address segment ('notebook', 'quizzes'…); none is the child's page. */
export function familyPath(childId, section = '', activityId = '', { chat } = {}) {
  if (!childId) return '/family';
  const parts = ['/family/children', encodeURIComponent(childId)];
  if (section) parts.push(section);
  if (activityId) parts.push(encodeURIComponent(activityId));
  return parts.join('/') + (chat ? `?chat=${encodeURIComponent(chat)}` : '');
}

/** The child id in a family address, or '' outside one. */
export function childOf(pathname) {
  const match = CHILD_PATH.exec(pathname || '');
  return match ? decoded(match[1]) : '';
}

/** A family address's section segment ('notebook', 'quizzes'…): the first one after the child's id; '' for the child. */
export function segmentOf(pathname) {
  return (pathname || '').replace(/^\/family\/children\/[^/?#]+\/?/, '').split(/[/?#]/)[0];
}

/** Where the child switcher goes (C-1): the same section for the other child, without a result id or a chat. */
export function switchPath(pathname, childId) {
  return familyPath(childId, segmentOf(pathname));
}

/** The new address of an old-style link (/family?child=…&chat=…): the Notebook at that chat, or the child's page. */
export function oldLinkPath(search) {
  const params = new URLSearchParams(search);
  const child = params.get('child');
  if (!child) return '';
  const chat = params.get('chat');
  return chat ? familyPath(child, 'notebook', '', { chat }) : familyPath(child);
}

/** A link that's safe to open after sign-in (C-16): a same-site /family path, kept with its query; '' otherwise. */
export function safeFamilyReturn(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '';
  let url;
  try {
    url = new URL(value, 'https://mst.invalid');
  } catch {
    return '';
  }
  // Read after the URL's own clean-up, so '/family/../classes' can't pass as a family path.
  const family = url.pathname === '/family' || url.pathname.startsWith('/family/');
  return url.origin === 'https://mst.invalid' && family ? url.pathname + url.search : '';
}

/** Where /family opens (C-1): the last family page in this tab, else the current child's page, else '' (setup). */
export function startPath({ last, current, children }) {
  const active = (children || []).filter((child) => child.isActive !== false);
  if (last?.startsWith('/family/children/') && active.some((child) => child.id === childOf(last))) return last;
  const child = active.find((item) => item.id === current) || active[0];
  return child ? familyPath(child.id) : '';
}
