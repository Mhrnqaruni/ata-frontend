// The owner API's own client: it sends the owner token, never the teacher's, so the two never mix (SOT-13).
// A 401 on a panel read ends the owner session and goes to the owner sign-in, saying the session ended.
// Area: owner

import axios from 'axios';
import { newRequestId, reportClientError } from '../../services/clientErrors.js';
import { finishApiCall, startApiCall } from '../../services/pageElements.js';
import { clearOwnerSession, ownerToken, saveOwnerSession } from './ownerSession.js';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

client.interceptors.request.use((config) => {
  // A reference per request, which the backend logs and sends back, as the teacher client does.
  config.mstRequestId = newRequestId();
  config.headers['X-Request-ID'] = config.mstRequestId;
  const token = ownerToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.mstCall = startApiCall();
  return config;
});

client.interceptors.response.use(
  (response) => {
    finishApiCall(response.config, response);
    return response;
  },
  (error) => {
    finishApiCall(error.config, error.response, error);
    if (error.isAxiosError && !axios.isCancel(error) && (!error.response || error.response.status >= 500)) {
      const { method = 'get', url = '' } = error.config || {};
      reportClientError({
        kind: 'api',
        message: `${method.toUpperCase()} ${url.split('?')[0]}: ${error.message}`,
        status: error.response?.status,
        reference: error.config?.mstRequestId,
      });
    }
    // The sign-in answers 401 for a wrong password, which the page shows; any other 401 ends the session.
    if (error.response?.status === 401 && !error.config?.mstSignIn) {
      clearOwnerSession();
      const { pathname, search } = window.location;
      if (pathname !== '/owner/sign-in') {
        window.location.href = `/owner/sign-in?ended=1&next=${encodeURIComponent(pathname + search)}`;
      }
    }
    return Promise.reject(error);
  }
);

// The words to show for a failed call: the backend's own, else the fallback.
export const ownerError = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  return typeof detail === 'string' && detail ? detail : fallback;
};

export async function signIn(email, password) {
  const { data } = await client.post('/api/owner/session', { email, password }, { mstSignIn: true });
  saveOwnerSession({ token: data.access_token, expiresAt: data.expires_at, email: email.trim() });
  return data;
}

// Ends every owner token on the server, then this tab's session, even if the call fails.
export async function signOut() {
  try {
    await client.delete('/api/owner/session');
  } finally {
    clearOwnerSession();
  }
}

// One read of the owner API: a path under /api/owner and its query, with empty values left out.
export async function ownerGet(path, params = {}) {
  const query = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== ''));
  const { data } = await client.get(`/api/owner${path}`, { params: query });
  return data;
}
