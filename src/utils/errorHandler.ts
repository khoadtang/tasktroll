import { TaskDetectionResult, BlameMessageResult, DEFAULT_BLAME_MESSAGES } from '../prompts/taskAnalysis';

// Common error handling logic
const handleCommonError = (error: any, addBotMessage: (text: string) => void, setDebug: (text: string) => void): void => {
  setDebug('Error processing request');
  
  // Handle API-specific errors
  if (error?.error?.message) {
    const errorMessage = error.error.message;
    addBotMessage(`😅 Oops! Có vẻ AI đang bị lỗi nè:\n\n${errorMessage}`);
  } else {
    // Handle general errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    addBotMessage(`😅 Oops! Có vẻ AI đang bị lỗi nè:\n\n${errorMessage}`);
  }
  
  console.error('Error processing AI request:', error);
};

// For task detection
export const handleTaskDetectionError = (
  error: any, 
  addBotMessage: (text: string) => void, 
  setDebug: (text: string) => void
): TaskDetectionResult => {
  handleCommonError(error, addBotMessage, setDebug);
  return {
    category: 'general',
    detectedTasks: []
  };
};

// For blame messages
export const handleBlameMessageError = (
  error: any, 
  addBotMessage: (text: string) => void, 
  setDebug: (text: string) => void
): TaskDetectionResult => {
  handleCommonError(error, addBotMessage, setDebug);
  return {
    category: 'general',
    blameMessages: DEFAULT_BLAME_MESSAGES
  };
}; 