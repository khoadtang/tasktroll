import { BlameMessageResult, DEFAULT_BLAME_MESSAGES } from '../prompts/taskAnalysis';

export const generateBlameMessage = async (task: { text: string, category?: string, completed?: boolean, id?: string }): Promise<BlameMessageResult> => {
  try {
    // Return default blame messages
    return {
      blameMessages: DEFAULT_BLAME_MESSAGES
    };
  } catch (error) {
    console.error('Error generating blame message:', error);
    return {
      blameMessages: DEFAULT_BLAME_MESSAGES
    };
  }
}; 