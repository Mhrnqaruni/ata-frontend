/** Modes grant UI access; the server remains the authorization boundary. */
export const hasMode = (user, mode) => user?.role === mode ||
  (user?.role !== 'admin' && user?.modes?.includes(mode));
