// Parent mode's server messages in parent words (design §5.6): all seven messages, and everything else as today.
// Area: family
import test from 'node:test';
import assert from 'node:assert/strict';
import { familyError, familyMessage } from '../src/areas/family/familyErrors.js';

const failed = (detail) => ({ response: { data: { detail } } });

test('the seven server messages get design §5.6 words', () => {
  const words = {
    'Child not found or archived.': 'That child isn’t available. Choose one of your children.',
    'Chat changed. Refresh before saving.': 'This chat changed in another window. Refresh to see the latest.',
    'Conversation changed. Refresh before sending again.':
      'This chat changed in another window. Refresh to see the latest.',
    'Please wait for the current reply.': 'Please wait for the answer to finish.',
    'Upload exceeds the supported size.': 'That’s too many pages. Use up to 20 pages and 20 MB in total.',
    'Choose at most 20 pages combined.': 'That’s too many pages. Use up to 20 pages and 20 MB in total.',
    'Activity not found.': 'That isn’t available.',
  };
  for (const [message, expected] of Object.entries(words)) {
    assert.equal(familyMessage(message), expected);
    assert.equal(familyError(failed(message), 'fallback'), expected);
  }
});

test('every other message shows as today, and a request with no detail shows the fallback', () => {
  assert.equal(familyMessage('Material not ready.'), 'Material not ready.');
  assert.equal(familyError(failed('Material not ready.'), 'fallback'), 'Material not ready.');
  assert.equal(familyError(failed({ loc: ['body'] }), 'Could not save.'), 'Could not save.');
  assert.equal(familyError(new Error('Network Error'), 'Could not save.'), 'Could not save.');
});
