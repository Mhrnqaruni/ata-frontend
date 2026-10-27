import 'katex/dist/katex.min.css';
// /src/main.jsx



// --- Core React Imports ---
import React from 'react';
import ReactDOM from 'react-dom/client';

// --- Application Shell Import ---
// Import the top-level App component.
import App from './App.jsx';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './services/queryCache';
import { SpeedInsights } from "@vercel/speed-insights/react"

// --- Application Rendering ---
// Find the root DOM element from index.html.
const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);

// Render the entire application into the root.
// All providers and theming are now handled inside the App component.
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}><App /></QueryClientProvider>
  </React.StrictMode>
);
