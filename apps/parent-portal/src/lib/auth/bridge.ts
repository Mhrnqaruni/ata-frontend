const BRIDGE_QUERY_KEY = 'bridge_token';
const BRIDGE_HANDLED_PREFIX = 'noobbook.bridge.handled.';

export const getBridgeTokenFromLocation = (search: string = window.location.search): string | null => {
  const params = new URLSearchParams(search);
  const bridgeToken = params.get(BRIDGE_QUERY_KEY)?.trim();
  return bridgeToken || null;
};

export const stripBridgeTokenFromUrl = (): void => {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(BRIDGE_QUERY_KEY)) {
    return;
  }
  url.searchParams.delete(BRIDGE_QUERY_KEY);
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, document.title, nextUrl);
};

export const buildBridgeHandledKey = (bridgeToken: string): string => {
  return `${BRIDGE_HANDLED_PREFIX}${encodeURIComponent(bridgeToken)}`;
};

export const hasHandledBridgeToken = (bridgeToken: string): boolean => {
  try {
    return window.sessionStorage.getItem(buildBridgeHandledKey(bridgeToken)) === '1';
  } catch {
    return false;
  }
};

export const markBridgeTokenHandled = (bridgeToken: string): void => {
  try {
    window.sessionStorage.setItem(buildBridgeHandledKey(bridgeToken), '1');
  } catch {
    // Ignore storage failures and continue with in-memory auth state.
  }
};

export const clearBridgeHandledMarker = (bridgeToken: string): void => {
  try {
    window.sessionStorage.removeItem(buildBridgeHandledKey(bridgeToken));
  } catch {
    // Ignore storage failures.
  }
};
