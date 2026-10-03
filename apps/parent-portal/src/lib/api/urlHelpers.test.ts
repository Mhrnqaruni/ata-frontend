import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveApiHost } from './urlHelpers';

test('file URLs retain the shared VPS backend mount', () => {
  assert.equal(deriveApiHost('https://ata-api.mysmartteach.com/parent-workspace/api/v1'),
    'https://ata-api.mysmartteach.com/parent-workspace');
});

test('dedicated backend origins and local development still work', () => {
  assert.equal(deriveApiHost('https://api.example.com/api/v1'), 'https://api.example.com');
  assert.equal(deriveApiHost(), 'http://localhost:5001');
});

test('same-origin URLs retain a mount without introducing a localhost origin', () => {
  assert.equal(deriveApiHost('/parent-workspace/api/v1'), '/parent-workspace');
  assert.equal(deriveApiHost('/api/v1'), '');
});
