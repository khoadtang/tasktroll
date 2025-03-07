import React from 'react';
import { createRoot } from 'react-dom/client';
import { CacheProvider } from '@emotion/react';
import createEmotionCache from './utils/emotionCache';
import App from './components/App';

// Create a single instance of the emotion cache
const cache = createEmotionCache();

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <CacheProvider value={cache}>
      <App />
    </CacheProvider>
  );
} 
