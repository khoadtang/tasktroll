import React from 'react';
import { createRoot } from 'react-dom/client';
import { CacheProvider } from '@emotion/react';
import createEmotionCache from './utils/emotionCache';
import App from './components/App';

// Create a single instance of the emotion cache
const cache = createEmotionCache();

// Connect to background when popup opens - this will clear the badge
const port = chrome.runtime.connect({ name: 'popup' });

// Clean up connection when popup closes
window.addEventListener('unload', () => {
  if (port) {
    port.disconnect();
  }
});

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <CacheProvider value={cache}>
      <App />
    </CacheProvider>
  );
} 
