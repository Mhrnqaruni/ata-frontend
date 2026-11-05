// Picks a stable colour for a class from its name, and gives the initial shown on the class mark.
// Area: academics

const CLASS_COLORS = ['#0f9fb8', '#3d5bd9', '#7a4bd8', '#b8399f'];
export const classColor = (name = '') => {
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CLASS_COLORS[h % CLASS_COLORS.length];
};
export const initialOf = (name = '') => (String(name).trim()[0] || '?').toUpperCase();
