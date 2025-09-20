
// /src/services/authService.js

// Import the single, pre-configured axios instance.
// All requests made through this client will automatically have the correct base URL
// and will eventually have interceptors for attaching the auth token.
import apiClient from './api';

/**
 * A dedicated service object that encapsulates all API calls related to user
 * authentication (registration, login, and session validation). This provides
 * a clean separation of concerns, keeping raw API call logic out of our React
 * hooks and components.
 */
const authService = {
  /**
   * Sends a registration request to the backend.
   *
   * @param {string} fullName - The user's full name.
   * @param {string} email - The user's email address.
   * @param {string} password - The user's plain-text password.
   * @returns {Promise<object>} A promise that resolves to the new user's public
   *                            data (id, email, fullName) on success.
   * @throws {Error} Throws an error with a user-friendly message on failure.
   */
  register: async (fullName, email, password) => {
    try {
      // The payload object uses standard JavaScript camelCase.
      // A future interceptor in `apiClient` can handle conversion to snake_case if needed.
      const payload = {
        fullName: fullName,
        email: email,
        password: password,
      };
      // Make a POST request to the /api/auth/register endpoint.
      const response = await apiClient.post('/api/auth/register', payload);
      // Return the data from the successful response.
      return response.data;
    } catch (error) {
      // Log the technical error for developer debugging.
      console.error("Error during registration:", error);
      // Extract a user-friendly message from the backend's structured error
      // response, or provide a generic fallback.
      const errorMessage = error.response?.data?.detail || "Registration failed. Please try again.";
      // Re-throw the error so the calling function can catch it and update the UI.
      throw new Error(errorMessage);
    }
  },

  /**
   * Sends a login request to the backend using the OAuth2 Password Flow.
   *
   * @param {string} email - The user's email.
   * @param {string} password - The user's password.
   * @returns {Promise<object>} A promise that resolves to the token object
   *                            (e.g., { access_token, token_type }) on success.
   * @throws {Error} Throws an error with a user-friendly message on failure.
   */
  login: async (email, password) => {
    try {
      // The OAuth2 Password Flow requires `application/x-www-form-urlencoded` data.
      // URLSearchParams is the standard browser API to create this format.
      const formData = new URLSearchParams();
      formData.append('username', email);    // The backend's form expects the email in the 'username' field.
      formData.append('password', password); // The password goes in the 'password' field.

      // Make a POST request, explicitly setting the Content-Type for maximum robustness.
      const response = await apiClient.post('/api/auth/token', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      // On success, return the data, which will be the token object.
      return response.data;
    } catch (error) {
      console.error("Error during login:", error);
      const errorMessage = error.response?.data?.detail || "Login failed. Please check your credentials.";
      throw new Error(errorMessage);
    }
  },

  /**
   * Fetches the profile of the currently authenticated user using their stored token.
   *
   * This function relies on the `apiClient`'s request interceptor to
   * automatically attach the necessary `Authorization: Bearer <token>` header.
   *
   * @returns {Promise<object>} A promise that resolves to the current user's
   *                            profile data on success.
   * @throws {Error} Throws an error if the token is invalid or the session has expired.
   */
  getMe: async () => {
    try {
      // Make a simple GET request to the protected /api/auth/me endpoint.
      const response = await apiClient.get('/api/auth/me');
      
      // Return the user profile data.
      return response.data;
    } catch (error) {
      // This error will be triggered if the token is invalid, expired, or missing.
      // The `useAuth` hook will handle this to log the user out.
      console.error("Error fetching current user profile (/me):", error);
      const errorMessage = error.response?.data?.detail || "Your session has expired. Please log in again.";
      throw new Error(errorMessage);
    }
  },
};

export default authService;