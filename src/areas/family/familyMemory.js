// What parent mode remembers in this browser tab (C-7, C-1): the current child, and the last family page, which /family
// reopens. sessionStorage is optional: when it's blocked, nothing is remembered and nothing fails.
// Area: family

import { childOf } from './familyPaths';

const key = (name, userId) => `mst.family.${name}.${userId}`;

function read(name, userId) {
  try {
    return (userId && sessionStorage.getItem(key(name, userId))) || '';
  } catch {
    return '';
  }
}

function write(name, userId, value) {
  try {
    if (userId && value) sessionStorage.setItem(key(name, userId), value);
  } catch {
    /* Storage is optional. */
  }
}

export const currentChild = {
  read: (userId) => read('child', userId),
  write: (userId, childId) => write('child', userId, childId),
};

export const lastPage = {
  read: (userId) => read('last', userId),
  write: (userId, path) => write('last', userId, path),
};

/** Every family page records itself: its child becomes the current one, and the page, without a dialog, the last. */
export function rememberPage(userId, pathname, search) {
  const childId = childOf(pathname);
  if (!childId) return;
  currentChild.write(userId, childId);
  const params = new URLSearchParams(search);
  params.delete('dialog');
  const query = params.toString();
  lastPage.write(userId, pathname + (query ? `?${query}` : ''));
}
