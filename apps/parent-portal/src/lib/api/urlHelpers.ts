export const DEFAULT_DEV_API_HOST = 'http://localhost:5001';

// File links must retain an API mount path when the backend shares a domain.
export function deriveApiHost(apiUrl?: string): string {
  if (!apiUrl) return DEFAULT_DEV_API_HOST;
  if (apiUrl.startsWith('/')) {
    return apiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
  }
  try {
    const url = new URL(apiUrl);
    const mount = url.pathname.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
    return `${url.origin}${mount}`;
  } catch {
    return '';
  }
}
