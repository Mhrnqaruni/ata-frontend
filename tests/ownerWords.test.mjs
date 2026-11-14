// The admin panel's dates and range words (Phase 1.44, QA's Section 4 P3-4, P3-5 and P3-9): a year only when it
// isn't this year, and always on price periods; seconds on calls; the range inside a sentence; dates keep capitals.
// Area: owner
import test from 'node:test';
import assert from 'node:assert/strict';
import { clock, day, fullDay, sentenceCase, time } from '../src/areas/owner/format.js';
import { capital, rangeOf } from '../src/areas/owner/useRange.js';

const year = new Date().getUTCFullYear();

test('a date shows its year only when it is not this year, and price periods always do', () => {
  assert.equal(day(`${year}-11-13`), '13 Nov');
  assert.equal(day(`${year - 1}-11-26`), `26 Nov ${year - 1}`);
  assert.equal(time(`${year - 1}-12-06T08:05:00Z`), `6 Dec ${year - 1}, 08:05`);
  assert.equal(fullDay(`${year}-01-01`), `1 Jan ${year}`);
  assert.equal(clock('2026-11-13T09:34:52.400Z'), '09:34:52');
});

test('the range reads as part of a sentence', () => {
  const params = (text) => new URLSearchParams(text);
  assert.equal(rangeOf(params('')).during, 'in the last 30 days');
  assert.equal(rangeOf(params('range=all')).during, 'so far');
  assert.equal(rangeOf(params('range=today')).during, 'today');
  assert.equal(capital(rangeOf(params('range=7d')).during), 'In the last 7 days');
  assert.equal(rangeOf(params(`from=${year}-11-01&to=${year}-11-13`)).during, 'from 1 Nov to 13 Nov');
});

test('"Last active" lowers a word but never a date', () => {
  assert.equal(sentenceCase('Yesterday'), 'yesterday');
  assert.equal(sentenceCase('Just now'), 'just now');
  assert.equal(sentenceCase('29 Oct'), '29 Oct');
  assert.equal(sentenceCase('5 min ago'), '5 min ago');
});
