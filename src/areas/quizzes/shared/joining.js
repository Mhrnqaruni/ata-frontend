// Joining a quiz, as words and links (Phase 1.46, SOT-8; design.md §3.7 to §3.9): the code rule, the short link that
// the QR code holds, the address pupils type, today's join page for a run, and the invite text Share copies.
// Area: quizzes

import { formatDateTime } from '../../../utils/dates';

// A code as the join pages and the lookup take it: no spaces, in capitals (QA P3-6). Codes never contain spaces.
export const cleanCode = (code) =>
  String(code ?? '')
    .replace(/\s+/g, '')
    .toUpperCase();

// The short link: "https://app.mysmartteach.com/join/NCFL38", on this app's own address.
export const joinLink = (code, origin = window.location.origin) =>
  `${origin}/join/${encodeURIComponent(cleanCode(code))}`;

// The address pupils type: "app.mysmartteach.com/join".
export const joinAddress = (origin = window.location.origin) => `${origin.replace(/^https?:\/\//, '')}/join`;

// Today's pupil page for a run (SOT-8): a live code opens /quiz/join/:code, a homework code /quiz/sp/join/:code.
export const joinPath = (kind, code) =>
  `${kind === 'homework' ? '/quiz/sp/join' : '/quiz/join'}/${encodeURIComponent(cleanCode(code))}`;

// Share's invite (design.md §3.9): 'Join my quiz "Year 9 Cells": go to app.mysmartteach.com/join and type NCFL38, or
// open {link}'. Homework adds its due date on a line of its own, so the link stays the last thing on its line.
export function inviteText({ title, code, due, origin = window.location.origin, now }) {
  const join = `Join my quiz "${title}": go to ${joinAddress(origin)} and type ${cleanCode(code)}, or open ${joinLink(code, origin)}`;
  return due ? `${join}\nDue ${formatDateTime(due, { now })}.` : join;
}

// The QR image's file name, for Download QR: "join-NCFL38.png".
export const qrFileName = (code) => `join-${cleanCode(code)}.png`;

// The join card's and the join line's words (Phase 1.47 design.md §3.3, §5).
export const JOIN = {
  joinAt: 'Pupils join at',
  copyCode: 'Copy code',
  board: 'Show on the board',
  joinCode: 'Join code',
  due: (when) => `Due ${when} · Pupils can't open it after this`,
};
