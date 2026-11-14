// The owner's session in this tab: the owner token, its end time and the email, in sessionStorage (SOT-13).
// It's never the teacher's token, and closing the tab ends it.
// Area: owner

const TOKEN = 'mst.owner.token';
const EXPIRES = 'mst.owner.expires';
const EMAIL = 'mst.owner.email';

// sessionStorage can be blocked (private windows, strict settings): then there's simply no session.
function read(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

// The owner token, or null once it has ended (8 hours after sign-in) or was never set.
export function ownerToken() {
  const token = read(TOKEN);
  const expires = Date.parse(read(EXPIRES) || '');
  return token && !(expires <= Date.now()) ? token : null;
}

export const ownerEmail = () => read(EMAIL) || '';

export function saveOwnerSession({ token, expiresAt, email }) {
  try {
    sessionStorage.setItem(TOKEN, token);
    sessionStorage.setItem(EXPIRES, expiresAt || '');
    sessionStorage.setItem(EMAIL, email || '');
  } catch {
    /* with storage blocked, the panel can't keep a session */
  }
}

export function clearOwnerSession() {
  try {
    [TOKEN, EXPIRES, EMAIL].forEach((key) => sessionStorage.removeItem(key));
  } catch {
    /* nothing was kept */
  }
}
