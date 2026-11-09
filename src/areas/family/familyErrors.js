// Parent words for the server messages that matter more now that parent mode has sections (design §5.6).
// Every other message shows as the server words it.
// Area: family

const WORDS = {
  'Child not found or archived.': 'That child isn’t available. Choose one of your children.',
  'Chat changed. Refresh before saving.': 'This chat changed in another window. Refresh to see the latest.',
  'Conversation changed. Refresh before sending again.':
    'This chat changed in another window. Refresh to see the latest.',
  'Please wait for the current reply.': 'Please wait for the answer to finish.',
  'Upload exceeds the supported size.': 'That’s too many pages. Use up to 20 pages and 20 MB in total.',
  'Choose at most 20 pages combined.': 'That’s too many pages. Use up to 20 pages and 20 MB in total.',
  'Activity not found.': 'That isn’t available.',
};

/** A server message in parent words, when design §5.6 gives some; otherwise the message itself. */
export function familyMessage(message) {
  return WORDS[message] ?? message;
}

/** A failed request's message for the parent: the server's detail, worded as above, or the fallback. */
export function familyError(error, fallback) {
  const detail = error?.response?.data?.detail;
  return typeof detail === 'string' ? familyMessage(detail) : fallback;
}
