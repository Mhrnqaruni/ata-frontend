// The shared axios client for every backend call: base URL from VITE_API_BASE_URL, JSON by default, 150 s timeout.
// Adds the sign-in token and a reference per request, reports failures, and signs out on an expired token (401).
// Area: platform

// --- Core Imports ---
import axios from 'axios';
import { sessionGeneration, resetTeacherSession } from './queryCache.js';
import { newRequestId, reportClientError } from './clientErrors.js';
import { finishApiCall, startApiCall } from './pageElements.js';

// --- Configuration ---
// 1. Get the base URL for our backend API from the environment variables.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 2. A critical check to ensure the environment variable is set.
if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL is not set. Please check your .env.local file.');
}

// 3. Create the single, pre-configured axios instance (the "Singleton").
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 150000, // 150 seconds
});

// --- [CRITICAL MODIFICATION 1/2: REQUEST INTERCEPTOR] ---
// This interceptor runs BEFORE every single request is sent by axios.
apiClient.interceptors.request.use(
  (config) => {
    // This is the logic that will be executed for every API call.

    // 1. Retrieve the authentication token from localStorage.
    // localStorage is synchronous, so this is a fast operation.
    config.mstSessionGeneration = sessionGeneration();
    // A new reference for each request. The backend keeps it, logs it and sends it back in X-Request-ID.
    config.mstRequestId = newRequestId();
    config.headers['X-Request-ID'] = config.mstRequestId;
    const token = localStorage.getItem('authToken');

    // 2. If a token exists, attach it to the Authorization header.
    // The backend's `get_current_user` dependency is specifically looking for
    // this "Bearer <token>" format.
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // The UI log times this call, and the page that's loading isn't ready until it answers. Last, so a failure
    // above (blocked storage) can't leave the call counted as loading with no response to end it.
    config.mstCall = startApiCall(config.mstPrefetchFor); // set by the sidebar's hover prefetch (useTeacherData.js)

    // 3. Return the modified config object for axios to continue with the request.
    return config;
  },
  (error) => {
    // This part of the interceptor handles errors that occur during the
    // setup of a request. It's rare but good practice to include.
    return Promise.reject(error);
  }
);

// --- [CRITICAL MODIFICATION 2/2: RESPONSE INTERCEPTOR] ---
// This interceptor runs AFTER a response is received from the backend, but
// BEFORE it is passed to the `catch` block of the original API call.
apiClient.interceptors.response.use(
  // The first argument is a pass-through for successful responses (status 2xx).
  (response) => {
    finishApiCall(response.config, response);
    if (response.config.mstSessionGeneration !== sessionGeneration()) throw new axios.CanceledError('Session changed');
    return response;
  },

  // The second argument is the crucial error handler.
  (error) => {
    // This is the logic that will be executed for every FAILED API call.
    finishApiCall(error.config, error.response, error);

    // 1. Check if the error is due to an authentication failure (401 Unauthorized).
    // The optional chaining `?.` prevents errors if the `response` object doesn't exist.
    if (error.config?.mstSessionGeneration !== undefined && error.config.mstSessionGeneration !== sessionGeneration()) {
      return Promise.reject(new axios.CanceledError('Session changed'));
    }
    // The reference a teacher can send us: the backend's, or the one we sent. With no response the request never
    // reached us, so there's none to show. The backend logs every reply itself, so we report only what it can't see.
    if (error.response) error.reference = error.response.headers?.['x-request-id'] || error.config?.mstRequestId;
    if (error.isAxiosError && !axios.isCancel(error) && (!error.response || error.response.status >= 500)) {
      reportFailure(error);
    }
    if (
      error.response?.status === 401 &&
      localStorage.getItem('authToken') &&
      error.config?.headers?.Authorization === `Bearer ${localStorage.getItem('authToken')}`
    ) {
      resetTeacherSession();

      // 2. An authentication error means our stored token is invalid or expired.
      // We must perform a "hard logout" to clean up the invalid session.
      console.warn('Received 401 Unauthorized. Token is invalid or expired. Logging out.');

      // Remove the bad token from storage.
      localStorage.removeItem('authToken');
      window.dispatchEvent(new Event('mst-session-expired'));

      // 3. Force a redirect to the login page.
      // We use `window.location.href` instead of React Router's `navigate` because
      // this is a low-level service file outside of the React component tree.
      // This is one of the few appropriate places to use a hard redirect.
      // It also has the benefit of clearing all application state.
      // A family page comes back after sign-in, with its query (Phase 1.37, C-16); any other page signs in afresh.
      const { pathname, search } = window.location;
      const family = pathname === '/family' || pathname.startsWith('/family/');
      if (pathname !== '/login') {
        window.location.href = family ? `/login?next=${encodeURIComponent(pathname + search)}` : '/login';
      }
    }

    // 4. Regardless of the error type, we must re-throw it so that the original
    // calling function (e.g., in `classService.js`) can still catch it and
    // handle it as needed (e.g., to show a specific error message in the UI).
    return Promise.reject(error);
  }
);

// A network failure or server error goes to our logs with its method and path, never the query string.
function reportFailure(error) {
  const { method = 'get', url = '' } = error.config || {};
  reportClientError({
    kind: 'api',
    message: `${method.toUpperCase()} ${url.split('?')[0]}: ${error.message}`,
    status: error.response?.status,
    reference: error.config?.mstRequestId,
  });
}

// The error a service re-throws or a page shows: the backend's message, or the fallback (also for a validation
// list, which isn't a sentence), keeping the reference to show the teacher.
export const apiError = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  const message = typeof detail === 'string' && detail ? detail : fallback;
  return Object.assign(new Error(message), { reference: error?.reference });
};

// 4. Export the now-intelligent, configured instance as the default export.
export default apiClient;
