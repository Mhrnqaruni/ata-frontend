// /ata-frontend/src/config.js

// 1. Get the base HTTP URL from the environment variables set by Vercel/Vite
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// 2. Determine if the current environment is production
const IS_PRODUCTION = API_BASE_URL.startsWith('https://');

// 3. Construct the WebSocket URL
//    - If it's production (https), use the secure 'wss://' protocol.
//    - If it's local dev (http), use the insecure 'ws://' protocol.
//    - We also need to strip the 'http' or 'https' from the base URL.
const WS_BASE_URL = IS_PRODUCTION
  ? `wss://${API_BASE_URL.replace(/^https?:\/\//, '')}`
  : `ws://${API_BASE_URL.replace(/^https?:\/\//, '')}`;

// 4. Export the configured URLs for the rest of the app to use
export const config = {
  apiBaseUrl: API_BASE_URL,
  wsBaseUrl: WS_BASE_URL,
};