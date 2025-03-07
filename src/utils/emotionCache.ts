import createCache from '@emotion/cache';

// Create a unique key for the emotion cache
export const createEmotionCache = () => {
  return createCache({
    key: 'tasktroll-static',
    stylisPlugins: [],
  });
};

export default createEmotionCache; 
