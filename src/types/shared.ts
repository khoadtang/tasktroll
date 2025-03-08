// Shared types between the popup and background script

export interface Todo {
  id: string;
  text: string;
  title?: string;
  created: number;
  completed: boolean;
  completedAt?: number;
  timeExpired?: boolean;
  dueDate?: number;
  notifiedAt?: number;
  deadline?: string;
  category?: string;
  lastChecked?: number;
  customBlameMessages?: string[];
  remainingTime?: number;
}

export interface AIConfig {
  enabled: boolean;
  apiKey: string;
  provider: string | null;  // Allow null for initialization
  endpoint?: string;
  autoDetectTasks?: boolean;
  model?: string;          // Add model property
  lastCheck?: number;       // Add lastCheck property
}

export interface BlameMessageResult {
  blameMessages: string[];
  category?: string;
  messageShown?: boolean;
} 
