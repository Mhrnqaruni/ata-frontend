// /vite.config.js

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // --- SERVER CONFIGURATION ---
  // This section configures the Vite development server.
  server: {
    // --- HOST CONFIGURATION ---
    // By default, Vite only allows connections from localhost.
    // To use a tunneling service like PageKite or ngrok, you must
    // explicitly add your public hostname to the list of allowed hosts.
    // This is a security feature to prevent DNS rebinding attacks.
    allowedHosts: [
      // Add your PageKite hostname here as a string.
      "mehrangharooni.pagekite.me",
      
      // It's good practice to also keep the default if needed,
      // though Vite may handle localhost implicitly.
      ".localhost",
    ],
  },
});