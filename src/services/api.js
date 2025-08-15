// /src/services/api.js

// --- Core Imports ---
// Import the axios library, which is our http client.
import axios from 'axios';

// --- Configuration ---
// 1. Get the base URL for our backend API from the environment variables.
// This is the crucial link between the frontend and backend applications.
// It is defined in the `ata-frontend/.env.local` file.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 2. A critical check to ensure the environment variable is set.
// This prevents hard-to-debug errors and immediately alerts the developer
// if their `.env.local` file is missing or misconfigured.
if (!API_BASE_URL) {
  throw new Error("VITE_API_BASE_URL is not set. Please check your .env.local file.");
}

// 3. Create the single, pre-configured axios instance (the "Singleton").
// All other service files will import THIS instance, not the raw axios library.
const apiClient = axios.create({
  // The base URL for all requests made with this instance.
  baseURL: API_BASE_URL,
  
  // Default headers to be sent with every request.
  headers: {
    'Content-Type': 'application/json',
  },
  
  // A reasonable timeout for standard API calls.
  timeout: 150000, // 150 seconds
});

// --- Interceptors (Future-Proofing) ---
// Interceptors are a powerful axios feature that allows us to run code
// before a request is sent or after a response is received.
// This is the designated place for our V2 authentication logic.
/*
apiClient.interceptors.request.use(
  (config) => {
    // In V2, we would get the JWT from our auth provider here.
    const token = localStorage.getItem('authToken'); 
    if (token) {
      // Attach the token to the Authorization header for every request.
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
*/

// 4. Export the configured instance as the default export.
export default apiClient;