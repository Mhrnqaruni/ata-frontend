// The browser entry point: turns on error reporting, then mounts the app in React StrictMode with React Query.
// Also loads the KaTeX stylesheet used to draw maths formulas.
// Area: platform

import 'katex/dist/katex.min.css';

// --- Core React Imports ---
import React from 'react';
import ReactDOM from 'react-dom/client';

// --- Application Shell Import ---
// Import the top-level App component.
import App from './App.jsx';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './services/queryCache';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { installClientErrorReporting } from './services/clientErrors';
import { installUiLog } from './services/uiLog';

// Uncaught errors, crashes and failed API calls reach our logs from the first render on.
installClientErrorReporting(import.meta.env.VITE_API_BASE_URL);
// So do page views and load times, unless this tab is sampled out or switched off (localStorage mst.uiLog = 'off').
installUiLog(import.meta.env.VITE_API_BASE_URL, import.meta.env.VITE_UI_LOG_RATE);

// --- Application Rendering ---
// Find the root DOM element from index.html.
const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);

// Render the entire application into the root.
// All providers and theming are now handled inside the App component.
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
