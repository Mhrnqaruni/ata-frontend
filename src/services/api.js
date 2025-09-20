
// /src/services/api.js (FINAL, SUPERVISOR-APPROVED - FLAWLESS VERSION)

// --- Core Imports ---
import axios from 'axios';

// --- Configuration ---
// 1. Get the base URL for our backend API from the environment variables.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 2. A critical check to ensure the environment variable is set.
if (!API_BASE_URL) {
  throw new Error("VITE_API_BASE_URL is not set. Please check your .env.local file.");
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
    const token = localStorage.getItem('authToken');
    
    // 2. If a token exists, attach it to the Authorization header.
    // The backend's `get_current_user` dependency is specifically looking for
    // this "Bearer <token>" format.
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
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
  (response) => response,
  
  // The second argument is the crucial error handler.
  (error) => {
    // This is the logic that will be executed for every FAILED API call.

    // 1. Check if the error is due to an authentication failure (401 Unauthorized).
    // The optional chaining `?.` prevents errors if the `response` object doesn't exist.
    if (error.response?.status === 401) {
      
      // 2. An authentication error means our stored token is invalid or expired.
      // We must perform a "hard logout" to clean up the invalid session.
      console.warn("Received 401 Unauthorized. Token is invalid or expired. Logging out.");
      
      // Remove the bad token from storage.
      localStorage.removeItem('authToken');
      
      // 3. Force a redirect to the login page.
      // We use `window.location.href` instead of React Router's `navigate` because
      // this is a low-level service file outside of the React component tree.
      // This is one of the few appropriate places to use a hard redirect.
      // It also has the benefit of clearing all application state.
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // 4. Regardless of the error type, we must re-throw it so that the original
    // calling function (e.g., in `classService.js`) can still catch it and
    // handle it as needed (e.g., to show a specific error message in the UI).
    return Promise.reject(error);
  }
);


// 4. Export the now-intelligent, configured instance as the default export.
export default apiClient;