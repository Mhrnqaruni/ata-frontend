// Says whether a user may use a mode (teacher or parent); it only gates the UI, the server enforces access.
// Area: identity

export const hasMode = (user, mode) => user?.role === mode || Boolean(user?.modes?.includes(mode));
