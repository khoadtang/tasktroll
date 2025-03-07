import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from '@emotion/styled';
import {
  TaskDetectionResult,
  BlameMessageResult,
  DEFAULT_BLAME_MESSAGES,
  formatBlamePrompt
} from '../prompts/taskAnalysis';
import { handleTaskDetectionError, handleBlameMessageError } from '../utils/errorHandler';
import { 
  AppStrings, 
  TASK_DETECTION_PROMPT,
  BLAME_MESSAGE_PROMPT,
  formatTaskDetectionPrompt,
} from '../localization/vi';
import { formatString, getRandomItem } from '../utils/stringUtils';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  deadline?: string;
  category?: string; // Task category determined by AI
  lastChecked?: number; // Last time AI checked this task
  customBlameMessages?: string[]; // Custom blame messages for this task type
  timeExpired?: boolean; // Flag for tasks that have expired
  remainingTime?: number; // Remaining time for tasks that have expired
  created?: number; // Creation time for tasks that have expired
}

interface ChatMessage {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: number;
  todo?: Todo; // Optional todo item to display in chat
  isTodoList?: boolean; // Flag for messages that contain the todo list
  isProcessing?: boolean; // Flag for messages that are processing
}

interface AIConfig {
  provider: 'openai' | 'gemini' | 'deepseek' | 'openrouter' | null;
  apiKey: string;
  enabled: boolean;
  lastCheck: number;
  autoDetectTasks: boolean;
  endpoint: string; // API endpoint to call
  model: string;    // Model name to use
}

// Animations - with reduced motion (even more reduced to prevent display issues)
const fadeIn = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const slideIn = `
  @keyframes slideIn {
    from { transform: translateX(5px); opacity: 0.8; }
    to { transform: translateX(0); opacity: 1; }
  }
`;

const pulse = `
  @keyframes pulse {
    0% { opacity: 0.7; }
    50% { opacity: 1; }
    100% { opacity: 0.7; }
  }
`;

// Add animations for micro-interactions
const slideUp = `
  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
`;

// Update Container with more trendy gradient
const Container = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  background: linear-gradient(to bottom, #0c1222, #1a202c);
  color: #f3f4f6;
  will-change: transform;
  overflow: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
`;

// Update Header to be more compact and integrated
const Header = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(66, 68, 101, 0.2);
  z-index: 10;
`;

// Update AppTitle to match modern apps
const AppTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #f3f4f6;
  letter-spacing: -0.3px;
  display: flex;
  align-items: center;
  
  &::before {
    content: '💬';
    margin-right: 6px;
    font-size: 16px;
  }
`;

// Update settings button to match the design
const AISettingsButton = styled.button`
  background: rgba(30, 41, 59, 0.4);
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  color: #a5b4fc;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  
  &:hover {
    background: rgba(30, 41, 59, 0.6);
    color: #c7d2fe;
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

// Modern chat container
const ChatContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(30, 41, 59, 0.2);
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(79, 70, 229, 0.3);
    border-radius: 2px;
  }
`;

// Update InputContainer to be more integrated with the design
const InputContainer = styled.div`
  display: flex;
  padding: 10px 12px 14px;
  background: transparent;
  position: relative;
  z-index: 5;
`;

// Update Input to match modern chat apps
const Input = styled.input`
  flex: 1;
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(66, 68, 101, 0.2);
  border-radius: 20px;
  padding: 12px 46px 12px 16px;
  font-size: 14px;
  color: #f3f4f6;
  outline: none;
  transition: all 0.15s ease;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  
  &:focus {
    border-color: rgba(99, 102, 241, 0.3);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  }
  
  &::placeholder {
    color: rgba(156, 163, 175, 0.4);
  }
`;

// Update SendButton to be more modern
const SendButton = styled.button`
  position: absolute;
  right: 18px;
  top: 50%;
  transform: translateY(-50%);
  background: #4f46e5;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 2px 6px rgba(79, 70, 229, 0.3);
  
  &:hover {
    background: #4338ca;
    transform: translateY(-50%) scale(1.05);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

// Update message components with modern design
const Message = styled.div<{ isBot: boolean }>`
  display: flex;
  margin-bottom: 16px;
  justify-content: ${props => props.isBot ? 'flex-start' : 'flex-end'};
  width: 100%;
  flex-direction: ${props => props.isBot ? 'row' : 'row-reverse'};
  padding: 0;
  align-items: flex-start;
`;

const Avatar = styled.div<{ isBot: boolean }>`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${props => props.isBot ? 'rgba(79, 70, 229, 0.2)' : 'rgba(236, 72, 153, 0.2)'};
  color: ${props => props.isBot ? '#818cf8' : '#f472b6'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 12px;
  margin: ${props => props.isBot ? '0 8px 0 0' : '0 0 0 8px'};
  flex-shrink: 0;
`;

// Update Todo container for a more compact, modern look
const TodoContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-bottom: 8px;
  background: rgba(26, 32, 44, 0.6);
  border-radius: 12px;
  padding: 14px;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(66, 68, 101, 0.3);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
`;

// Update the TodoListTitle for a more compact, modern look
const TodoListTitle = styled.div`
  font-weight: 600;
  margin-bottom: 10px;
  color: #a5b4fc;
  font-size: 15px;
  display: flex;
  align-items: center;
  
  &::before {
    content: '📋';
    margin-right: 8px;
  }
`;

// Update TodoItem for a more compact, chatbot-like design with enhanced animations
const TodoItem = styled.div<{ completed: boolean }>`
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 10px;
  background: ${props => props.completed ? 'rgba(79, 70, 229, 0.08)' : 'rgba(30, 41, 59, 0.6)'};
  border: 1px solid ${props => props.completed ? 'rgba(79, 70, 229, 0.2)' : 'rgba(66, 68, 101, 0.2)'};
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  margin-bottom: 8px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  
  &:last-child {
    margin-bottom: 0;
  }
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    background: ${props => props.completed ? 'rgba(79, 70, 229, 0.1)' : 'rgba(30, 41, 59, 0.7)'};
  }
`;

// More compact and modern checkbox with enhanced animations
const TodoCheckbox = styled.div<{ completed: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 2px solid ${props => props.completed ? 'rgba(79, 70, 229, 0.8)' : 'rgba(156, 163, 175, 0.5)'};
  background: ${props => props.completed ? 'rgba(79, 70, 229, 0.8)' : 'transparent'};
  margin-right: 10px;
  position: relative;
  flex-shrink: 0;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  transform: ${props => props.completed ? 'scale(1.1)' : 'scale(1)'};
  box-shadow: ${props => props.completed ? '0 0 10px rgba(79, 70, 229, 0.5)' : 'none'};
  cursor: pointer;
  z-index: 1; /* Ensure the checkbox is above other elements */
  
  &:hover {
    transform: ${props => props.completed ? 'scale(1.15)' : 'scale(1.05)'};
    border-color: ${props => props.completed ? 'rgba(79, 70, 229, 1)' : 'rgba(156, 163, 175, 0.8)'};
    box-shadow: 0 0 5px rgba(79, 70, 229, 0.3);
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 45%;
    left: 50%;
    width: 6px;
    height: 10px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: ${props => props.completed 
      ? 'translate(-50%, -50%) rotate(45deg) scale(1)' 
      : 'translate(-50%, -50%) rotate(45deg) scale(0)'};
    opacity: ${props => props.completed ? 1 : 0};
    transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }
`;

// Update TodoText for a cleaner, more modern look with animations
const TodoText = styled.span<{ completed: boolean }>`
  font-size: 14px;
  color: ${props => props.completed ? 'rgba(226, 232, 240, 0.6)' : '#e2e8f0'};
  text-decoration: ${props => props.completed ? 'line-through' : 'none'};
  transition: all 0.3s ease;
  position: relative;
  margin-right: 4px;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  
  &::after {
    content: ${props => props.completed ? "'✨'" : "''"};
    position: absolute;
    right: -20px;
    top: -5px;
    font-size: 12px;
    opacity: ${props => props.completed ? 1 : 0};
    transform: ${props => props.completed ? 'rotate(15deg) scale(1)' : 'scale(0)'};
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    animation: ${props => props.completed ? 'sparkle 1.5s infinite' : 'none'};
  }
  
  @keyframes sparkle {
    0%, 100% { transform: rotate(15deg) scale(1); }
    50% { transform: rotate(-5deg) scale(1.2); }
  }
`;

// Update Deadline to be more compact and modern
const Deadline = styled.div`
  display: flex;
  align-items: center;
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
  
  svg {
    width: 12px;
    height: 12px;
    margin-right: 4px;
    stroke: #64748b;
  }
`;

// Update MessageBubble for more consistent styling and positioning
const MessageBubble = styled.div<{ isBot: boolean }>`
  background: ${props => props.isBot ? 'rgba(30, 41, 59, 0.4)' : 'rgba(79, 70, 229, 0.2)'};
  border: 1px solid ${props => props.isBot ? 'rgba(66, 68, 101, 0.2)' : 'rgba(79, 70, 229, 0.3)'};
  border-radius: 16px;
  border-bottom-left-radius: ${props => props.isBot ? '4px' : '16px'};
  border-bottom-right-radius: ${props => !props.isBot ? '4px' : '16px'};
  padding: 10px 14px;
  backdrop-filter: blur(10px);
  width: auto;
  max-width: 90%;
  color: #f3f4f6;
  line-height: 1.4;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  word-break: break-word;
  margin-left: ${props => props.isBot ? '0' : 'auto'};
  margin-right: ${props => !props.isBot ? '0' : 'auto'};
`;

// Update the command hint
const CommandHint = styled.div`
  font-size: 11px;
  color: rgba(99, 102, 241, 0.6);
  text-align: center;
  padding: 6px 12px;
  margin: 4px auto;
  background: rgba(99, 102, 241, 0.08);
  border-radius: 16px;
  max-width: 240px;
  backdrop-filter: blur(5px);
`;

// Update ProgressBar to be more subtle
const ProgressBar = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  height: 2px;
  background: #4f46e5;
  width: 100%;
  z-index: 1001;
  opacity: 0.7;
`;

// Simple timestamp
const Timestamp = styled.div<{ isBot: boolean }>`
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
  margin-top: 4px;
  text-align: ${props => props.isBot ? 'left' : 'right'};
`;

// Add category icon based on todo category
const getCategoryIcon = (category?: string) => {
  const lowerCategory = category?.toLowerCase() || 'general';
  
  if (lowerCategory.includes('work')) return '💼';
  if (lowerCategory.includes('personal')) return '👤';
  if (lowerCategory.includes('health')) return '💪';
  if (lowerCategory.includes('study') || lowerCategory.includes('school')) return '📚';
  if (lowerCategory.includes('home')) return '🏠';
  if (lowerCategory.includes('shop') || lowerCategory.includes('buy')) return '🛒';
  if (lowerCategory.includes('urgent')) return '🔥';
  if (lowerCategory.includes('idea')) return '💡';
  if (lowerCategory.includes('travel')) return '✈️';
  return '📌';
};

// Adding missing FloatingActionButton component
const FloatingActionButton = styled.button`
  position: absolute;
  bottom: 80px;
  right: 20px;
  width: 56px;
  height: 56px;
  border-radius: 28px;
  background: #4f46e5;
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(79, 70, 229, 0.5);
  cursor: pointer;
  transition: all 0.2s;
  z-index: 100;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(79, 70, 229, 0.6);
  }
  
  svg {
    width: 24px;
    height: 24px;
  }
`;

// Adding missing AISettingsModal component and related components
const AISettingsModal = styled.div<{ show: boolean }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(${props => props.show ? 1 : 0.9});
  background: rgba(17, 24, 39, 0.85);
  backdrop-filter: blur(12px);
  border-radius: 20px;
  padding: 24px;
  width: 90%;
  max-width: 320px;
  z-index: 1001;
  opacity: ${props => props.show ? 1 : 0};
  pointer-events: ${props => props.show ? 'all' : 'none'};
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

// Simplified overlay
const AISettingsOverlay = styled.div<{ show: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(5px);
  z-index: 1000;
  opacity: ${props => props.show ? 1 : 0};
  pointer-events: ${props => props.show ? 'all' : 'none'};
  transition: all 0.25s ease;
`;

// Cleaner title without icon
const AISettingsTitle = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #f3f4f6;
  margin-bottom: 24px;
  text-align: center;
`;

// Add styled components for AI settings
const AISettingsGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  color: white;
`;

const AISettingsLabel = styled.label`
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  color: #a5b4fc;
`;

const AISettingsSelect = styled.select`
  width: 100%;
  padding: 8px 10px;
  background-color: #1e293b;
  color: white;
  border: 1px solid #475569;
  border-radius: 6px;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #6366f1;
  }
`;

const AISettingsInput = styled.input`
  width: 100%;
  padding: 8px 10px;
  background-color: #1e293b;
  color: white;
  border: 1px solid #475569;
  border-radius: 6px;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #6366f1;
  }
  
  &::placeholder {
    color: #64748b;
  }
`;

const ToggleContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
`;

const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  
  input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  
  span {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #334155;
    transition: .3s;
    border-radius: 24px;
    
    &:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .3s;
      border-radius: 50%;
    }
  }
  
  input:checked + span {
    background-color: #4f46e5;
  }
  
  input:checked + span:before {
    transform: translateX(20px);
  }
`;

const AISaveButton = styled.button`
  margin-top: 10px;
  padding: 8px 16px;
  background-color: #4f46e5;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: #4338ca;
  }
  
  &:disabled {
    background-color: #6b7280;
    cursor: not-allowed;
  }
`;

// First, I'll create a LoadingMessage component for AI processing indications
const LoadingMessage = styled.div`
  font-size: 13px;
  color: #818cf8;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  animation: pulse 1.5s infinite ease-in-out;
  
  @keyframes pulse {
    0% { opacity: 0.6; }
    50% { opacity: 1; }
    100% { opacity: 0.6; }
  }
`;

// Add a styled component for the countdown timer
const CountdownTimer = styled.div<{ isExpired: boolean }>`
  display: flex;
  align-items: center;
  font-size: 11px;
  margin-top: 2px;
  color: ${props => props.isExpired ? '#ef4444' : '#64748b'};
  
  svg {
    width: 12px;
    height: 12px;
    margin-right: 4px;
    stroke: ${props => props.isExpired ? '#ef4444' : '#64748b'};
  }
`;

// Add a generic type for safeParseJSON
interface SafeParseResult {
  detectedTasks?: Array<{
    text: string;
    deadline?: string;
  }>;
  category?: string;
  blameMessages?: string[];
}

const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>(() => {
    try {
      // Load saved todos from localStorage
      const savedTodos = localStorage.getItem('todos');
      if (savedTodos) {
        return JSON.parse(savedTodos);
      }
    } catch (error) {
      console.error('Error loading todos from localStorage:', error);
    }
    return [];
  });
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showCommandHint, setShowCommandHint] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [debug, setDebug] = useState<string>('Ready');
  const [schedulerEnabled, setSchedulerEnabled] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Add AI config state
  const [aiConfig, setAIConfig] = useState<AIConfig>(() => {
    try {
      // Load saved AI config
      const savedConfig = localStorage.getItem('aiConfig');
      if (savedConfig) {
        return JSON.parse(savedConfig);
      }
    } catch (error) {
      console.error('Error loading AI config:', error);
    }
    return {
      provider: null,
      apiKey: '',
      enabled: false,
      lastCheck: 0,
      autoDetectTasks: false,
      endpoint: '',
      model: ''
    };
  });
  const [showAISettings, setShowAISettings] = useState(false);
  
  // Save AI config when it changes
  useEffect(() => {
    try {
      localStorage.setItem('aiConfig', JSON.stringify(aiConfig));
    } catch (error) {
      console.error('Error saving AI config:', error);
    }
  }, [aiConfig]);
  
  // Function to safely generate blame messages with AI
  const generateBlameMessage = async (task: { text: string, category?: string, completed: boolean, id: string }): Promise<BlameMessageResult> => {
    try {
      if (!aiConfig.enabled || !aiConfig.apiKey) {
        console.log('AI not enabled or no API key, using default blame messages');
        return { blameMessages: DEFAULT_BLAME_MESSAGES };
      }
      
      console.log('Generating blame message for task:', task.text, 'using provider:', aiConfig.provider);
      
      // Create a promise that rejects after timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('AI request timed out')), 20000); // Increased timeout to 20 seconds to ensure complete response
      });
      
      // Create the actual AI request promise
      const aiRequestPromise = (async () => {
        const formatPrompt = formatBlamePrompt({ 
          text: task.text,
          category: task.category || 'general',
        });
        
        let apiEndpoint = '';
        let requestBody = {};
        
        switch (aiConfig.provider) {
          case 'openai':
            apiEndpoint = 'https://api.openai.com/v1/chat/completions';
            requestBody = {
              model: aiConfig.model || "gpt-3.5-turbo",
              messages: [
                { role: "system", content: BLAME_MESSAGE_PROMPT },
                { role: "user", content: formatPrompt }
              ],
              temperature: 0.9, // Higher temperature for more creative responses
              max_tokens: 400,  // Higher token limit for more complete responses
              frequency_penalty: 0.2  // To encourage more varied responses
            };
            break;
            
          case 'openrouter':
            apiEndpoint = 'https://openrouter.ai/api/v1/chat/completions';
            requestBody = {
              model: aiConfig.model || "anthropic/claude-3-haiku",  // Try a different model that may handle Vietnamese better
              messages: [
                { role: "system", content: BLAME_MESSAGE_PROMPT },
                { role: "user", content: formatPrompt }
              ],
              temperature: 0.9,
              max_tokens: 400,
              frequency_penalty: 0.2
            };
            break;
            
          case 'gemini':
            apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
            requestBody = {
              contents: [{
                parts: [{
                  text: `${BLAME_MESSAGE_PROMPT}\n\n${formatPrompt}`
                }]
              }],
              generationConfig: {
                temperature: 0.9,
                maxOutputTokens: 400,
                topP: 0.9,
                topK: 40
              },
              safetySettings: [
                {
                  category: "HARM_CATEGORY_HARASSMENT",
                  threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
              ]
            };
            break;
            
          default:
            return { blameMessages: DEFAULT_BLAME_MESSAGES };
        }
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        
        if (aiConfig.provider === 'openai' || aiConfig.provider === 'openrouter') {
          headers['Authorization'] = `Bearer ${aiConfig.apiKey}`;
        } else if (aiConfig.provider === 'gemini') {
          headers['x-goog-api-key'] = aiConfig.apiKey;
        }
        
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Received AI response for blame message:', data);
        
        // Parse response based on provider
        let result: any;
        
        if (aiConfig.provider === 'gemini') {
          const text = data.candidates[0].content.parts[0].text;
          console.log('Raw Gemini response:', text);
          result = safeParseJSON(text);
        } else if (aiConfig.provider === 'openrouter') {
          const text = data.choices[0].message.content;
          console.log('Raw OpenRouter response:', text);
          result = safeParseJSON(text);
        } else {
          const text = data.choices[0].message.content;
          console.log('Raw OpenAI response:', text);
          result = safeParseJSON(text);
        }
        
        if (!result || !result.blameMessages || !Array.isArray(result.blameMessages) || result.blameMessages.length === 0) {
          console.error('Invalid or empty blame messages from AI, using defaults');
          return { blameMessages: DEFAULT_BLAME_MESSAGES };
        }
        
        console.log('Parsed blame messages:', result.blameMessages);
        return { 
          blameMessages: result.blameMessages 
        };
      })();
      
      // Race between the AI request and timeout
      return await Promise.race([aiRequestPromise, timeoutPromise]);
    } catch (error) {
      console.error('Error generating blame message:', error);
      return { blameMessages: DEFAULT_BLAME_MESSAGES };
    }
  };
  
  // Helper function to safely parse JSON from AI responses
  const safeParseJSON = (text: string) => {
    try {
      console.log('Parsing raw AI response:', text);
      
      // First, try to extract content from markdown code blocks
      if (text.includes('```')) {
        // Extract content between code fences
        const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (match && match[1]) {
          text = match[1].trim();
          console.log('Extracted JSON from code block:', text);
        }
      }
      
      // For blame messages that might be too long or have formatting issues
      // Try to extract just the message content directly if it looks like a blame message
      if (text.includes('blame') && text.includes('leetcode') && !text.includes('{')) {
        console.log('Found raw blame message without JSON formatting, converting to proper format');
        // Split by sentences or lines to get individual messages
        const sentences = text.split(/[.!?][\s\n]+/).filter(s => s.length > 10);
        if (sentences.length > 0) {
          return { 
            blameMessages: sentences.slice(0, 3).map(s => s.trim() + '!') 
          };
        }
      }
      
      // Clean up any extra text around the JSON
      text = text.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      
      // Try to fix common JSON issues
      // 1. Fix unescaped quotes within strings
      text = text.replace(/"([^"]*)"([^"]*)"([^"]*)"/g, '"$1\\"$2\\"$3"');
      
      // 2. Fix missing commas between array items
      text = text.replace(/"\s*"/g, '", "');
      
      // 3. Fix trailing commas in arrays
      text = text.replace(/,\s*]/g, ']');
      
      // Try standard JSON parse with fixes
      try {
        const parsedJson = JSON.parse(text);
        console.log('Successfully parsed JSON:', parsedJson);
        
        // Handle different response formats - look for blameMessages or trollReminders
        if (parsedJson.blameMessages) {
          // Handle case where blameMessages is itself a string (not an array)
          if (typeof parsedJson.blameMessages === 'string') {
            console.log('Found blameMessages as a string value, converting to array');
            return { blameMessages: [parsedJson.blameMessages] };
          }
          // Handle normal array case
          else if (Array.isArray(parsedJson.blameMessages)) {
            // Filter out any items that are literally "blameMessages"
            const filteredMessages = parsedJson.blameMessages.filter((msg: any) => 
              msg !== "blameMessages" && msg !== "blameMessages\\"
            );
            
            // Fall back to defaults if all items were filtered out
            if (filteredMessages.length === 0) {
              console.log('All blame messages were invalid, using defaults');
              return { blameMessages: DEFAULT_BLAME_MESSAGES };
            }
            
            // Ensure messages are not too long
            const messages = filteredMessages.map((msg: string) => 
              typeof msg === 'string' ? 
                (msg.length > 150 ? msg.substring(0, 147) + '...' : msg) : 
                JSON.stringify(msg).substring(0, 100)
            );
            return { blameMessages: messages };
          }
        }
        
        // Check for trollReminders format (seen in Gemini responses)
        if (parsedJson.trollReminders && Array.isArray(parsedJson.trollReminders)) {
          console.log('Found trollReminders format, converting to blameMessages');
          // Extract messages from the trollReminders array
          if (parsedJson.trollReminders.length > 0) {
            const messages = parsedJson.trollReminders.map((item: any) => {
              const msg = typeof item === 'string' ? item : 
                (item.message || item.text || JSON.stringify(item));
              return msg.length > 150 ? msg.substring(0, 147) + '...' : msg;
            }).filter(Boolean);
            
            if (messages.length > 0) {
              return { blameMessages: messages };
            }
          }
        }
        
        // Look for any arrays in the response that might contain messages
        for (const key in parsedJson) {
          if (Array.isArray(parsedJson[key])) {
            const possibleMessages = parsedJson[key];
            if (possibleMessages.length > 0) {
              // Try to extract message strings from the array
              const extractedMessages = possibleMessages.map((item: any) => {
                let msg = '';
                if (typeof item === 'string') msg = item;
                else if (item.message) msg = item.message;
                else if (item.text) msg = item.text;
                else if (item.content) msg = item.content;
                else return null;
                
                // Truncate long messages
                return msg.length > 150 ? msg.substring(0, 147) + '...' : msg;
              }).filter(Boolean);
              
              if (extractedMessages.length > 0) {
                console.log(`Found messages in "${key}" field:`, extractedMessages);
                return { blameMessages: extractedMessages };
              }
            }
          }
        }
      } catch (jsonError) {
        console.warn('Standard JSON parse failed, trying alternative methods:', jsonError);
      }
      
      // If we're dealing with blame messages, try to extract them directly using regex
      const blameMessageRegex = /"blameMessages"\s*:\s*\[\s*"([^"]+)"\s*(?:,\s*"([^"]+)"\s*)?(?:,\s*"([^"]+)"\s*)?\]/;
      const blameMatch = text.match(blameMessageRegex);
      if (blameMatch) {
        console.log('Extracted blame messages using regex');
        const messages = blameMatch.slice(1).filter(Boolean).map(msg => 
          msg.length > 150 ? msg.substring(0, 147) + '...' : msg
        );
        if (messages.length > 0) {
          return { blameMessages: messages };
        }
      }
      
      // Final fallback: Extract any quoted strings that look like messages
      const quotedStringsRegex = /"([^"]{10,150})"/g;
      const messageMatches = [...text.matchAll(quotedStringsRegex)];
      if (messageMatches.length > 0) {
        console.log('Extracted quoted strings that appear to be messages');
        const messages = messageMatches.map(m => m[1]).slice(0, 3);
        return { blameMessages: messages };
      }
      
      // If all parsing methods fail, use default messages
      console.warn('All JSON parsing methods failed, using default messages');
      return { blameMessages: DEFAULT_BLAME_MESSAGES };
    } catch (e) {
      console.error('Error in safeParseJSON:', e);
      return { blameMessages: DEFAULT_BLAME_MESSAGES };
    }
  };
  
  // Create a simplified initialization process
  useEffect(() => {
    console.log('App initialization starting...');
    
    try {
      // Try to load from localStorage for simplicity
      const savedMessages = localStorage.getItem('messages');
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages);
        if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
          setMessages(parsedMessages);
          setShowCommandHint(false);
          console.log('Loaded saved messages:', parsedMessages.length);
        } else {
          // Add welcome message if messages array is empty
          const welcomeMsg: ChatMessage = {
            id: Date.now().toString(),
            text: "Xin chào! Tôi là Task Chat, trợ lý giúp bạn quản lý công việc một cách hiệu quả. Hãy tạo công việc đầu tiên bằng cách nhập 'add [công việc]'.",
            isBot: true,
            timestamp: Date.now()
          };
          setMessages([welcomeMsg]);
        }
      } else {
        // Display a simple welcome message if no saved messages
        const welcomeMsg: ChatMessage = {
          id: Date.now().toString(),
          text: "Xin chào! Tôi là Task Chat, trợ lý giúp bạn quản lý công việc một cách hiệu quả. Hãy tạo công việc đầu tiên bằng cách nhập 'add [công việc]'.",
          isBot: true,
          timestamp: Date.now()
        };
        setMessages([welcomeMsg]);
      }
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
      // Add fallback welcome message
      const welcomeMsg: ChatMessage = {
        id: Date.now().toString(),
        text: "Xin chào! Tôi là Task Chat, trợ lý giúp bạn quản lý công việc một cách hiệu quả. Hãy tạo công việc đầu tiên bằng cách nhập 'add [công việc]'.",
        isBot: true,
        timestamp: Date.now()
      };
      setMessages([welcomeMsg]);
    }
    
    // Simply set loading to false after a short delay
    const timer = setTimeout(() => {
      setIsLoading(false);
      console.log('Initial loading complete');
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Save messages to localStorage when they change
  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem('messages', JSON.stringify(messages));
      }
    } catch (error) {
      console.error('Error saving messages to localStorage:', error);
    }
  }, [messages]);
  
  // Save todos to localStorage when they change
  useEffect(() => {
    try {
      if (todos.length > 0) {
        localStorage.setItem('todos', JSON.stringify(todos));
      }
    } catch (error) {
      console.error('Error saving todos to localStorage:', error);
    }
  }, [todos]);
  
  // Simple function to add a message from the bot
  const addBotMessageSimple = (text: string) => {
    // Sanitize text to remove or replace problematic characters
    let sanitizedText = text;
    
    // Remove any null characters
    sanitizedText = sanitizedText.replace(/\0/g, '');
    
    // Replace any weird Unicode that might cause display issues
    sanitizedText = sanitizedText.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDFFF]/g, '?');
    
    // Ensure text isn't undefined or null
    if (!sanitizedText) {
      sanitizedText = "Tin nhắn không hợp lệ";
    }
    
    const message: ChatMessage = {
      id: Date.now().toString(),
      text: sanitizedText,
      isBot: true,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, message]);
  };
  
  // Function to show todo list
  const showTodoListSimple = () => {
    const todoListMessage = {
      id: Date.now().toString(),
      text: "Here are your tasks:",
      isBot: true,
      isTodoList: true,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, todoListMessage]);
  };
  
  // Function to handle task completion
  const handleTaskCompletion = (id: string, completed: boolean) => {
    setTodos(prev => prev.map(todo => {
      if (todo.id === id) {
        return { ...todo, completed };
      }
      return todo;
    }));
    
    if (completed) {
      addBotMessageSimple(`✅ Great job! You've completed a task.`);
    }
  };
  
  // Enhanced message handling with basic task functions
  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputValue,
      isBot: false,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Process command
    const input = inputValue.toLowerCase();
    
    // Normal task handling logic
    if (input.startsWith('add ')) {
      const taskText = inputValue.substring(4).trim();
      // Create a new task
      const newTodo: Todo = {
        id: Date.now().toString(),
        text: taskText,
        completed: false,
        category: 'general',
        created: Date.now()
      };
      
      // Add to todos
      setTodos(prev => [...prev, newTodo]);
      
      // Show the task in chat
      const todoMessage: ChatMessage = {
        id: Date.now().toString(),
        text: '',
        isBot: true,
        timestamp: Date.now(),
        todo: newTodo
      };
      
      setMessages(prev => [...prev, todoMessage]);
      
      // Confirmation message
      addBotMessageSimple(`✅ Đã thêm công việc: "${taskText}"`);
    } 
    else if (input === 'list' || input === 'tasks') {
      if (todos.length === 0) {
        addBotMessageSimple("Bạn chưa có công việc nào. Hãy thêm công việc bằng cách nhập 'add [công việc]'.");
      } else {
        showTodoListSimple();
      }
    }
    else if (input.startsWith('delete ')) {
      const taskIdx = parseInt(input.split(' ')[1]) - 1;
      
      if (isNaN(taskIdx) || taskIdx < 0 || taskIdx >= todos.length) {
        addBotMessageSimple("Không tìm thấy công việc đó. Hãy nhập 'list' để xem danh sách công việc của bạn.");
      } else {
        const deletedTodo = todos[taskIdx];
        setTodos(prev => prev.filter((_, idx) => idx !== taskIdx));
        addBotMessageSimple(`🗑️ Đã xóa công việc: "${deletedTodo.text}"`);
      }
    }
    else if (input === 'help') {
      addBotMessageSimple("Các lệnh: 'add [công việc]', 'list', 'delete [số thứ tự]', 'clear' (xóa tất cả công việc), 'clearall' (xóa tất cả công việc và tin nhắn), 'help'. Bạn cũng có thể nhắn tin bình thường và tôi sẽ phân tích xem có công việc nào cần làm không.");
    }
    else if (input === 'clear') {
      if (todos.length === 0) {
        addBotMessageSimple("Bạn chưa có công việc nào để xóa.");
      } else {
        const taskCount = todos.length;
        setTodos([]);
        addBotMessageSimple(`🧹 Đã xóa tất cả ${taskCount} công việc.`);
      }
    }
    else if (input === 'clearall') {
      // Clear all tasks
      const taskCount = todos.length;
      setTodos([]);
      
      // Create welcome message
      const welcomeMsg: ChatMessage = {
        id: Date.now().toString(),
        text: "Xin chào! Tôi là Task Chat, trợ lý giúp bạn quản lý công việc một cách hiệu quả. Hãy tạo công việc đầu tiên bằng cách nhập 'add [công việc]'.",
        isBot: true,
        timestamp: Date.now()
      };
      
      // Create confirmation message
      const confirmMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: `🧹 Đã xóa tất cả ${taskCount} công việc và lịch sử tin nhắn.`,
        isBot: true,
        timestamp: Date.now() + 1
      };
      
      // Set messages to welcome message, user command, and confirmation
      setMessages([welcomeMsg, userMessage, confirmMsg]);
    }
    else {
      // Try simple task detection for direct messages first
      const simpleTaskDetected = detectSimpleTask(inputValue);
      
      if (simpleTaskDetected) {
        // Simple task was detected and added, no need to call AI
      }
      // Otherwise try processing with AI if enabled
      else if (aiConfig.enabled && aiConfig.autoDetectTasks) {
        // Add a message to indicate task detection is happening
        const processingId = Date.now().toString();
        const processingMessage: ChatMessage = {
          id: processingId,
          text: "Đang phân tích tin nhắn của bạn...",
          isBot: true,
          timestamp: Date.now(),
          isProcessing: true
        };
        setMessages(prev => [...prev, processingMessage]);
        
        // Try to detect tasks in the message
        detectTasksInMessage(inputValue)
          .then(detected => {
            // Remove processing message
            setMessages(prev => prev.filter(m => m.id !== processingId));
            
            if (detected) {
              // Task was detected and added, no need for additional response
            } else {
              // No task detected, give a normal response
              addBotMessageSimple(`Tôi hiểu rồi. Bạn có thể thêm công việc bằng cách nhập 'add [công việc]'.`);
            }
          })
          .catch(error => {
            // Remove processing message and show error
            setMessages(prev => prev.filter(m => m.id !== processingId));
            console.error('Error detecting tasks:', error);
            addBotMessageSimple(`Xin lỗi, tôi gặp vấn đề khi phân tích tin nhắn của bạn. Hãy thử lại sau.`);
          });
      } else {
        // AI is not enabled, give a normal response
        const responses = [
          "💬 Tôi ở đây để giúp bạn năng suất hơn. Thử 'add [công việc]' để tạo công việc mới.",
          "📋 Muốn xem danh sách công việc? Chỉ cần nhập 'list'.",
          "📅 Cần đặt thời hạn? Thử 'add mua đồ ngày mai'.",
          "❓ Không chắc phải làm gì? Nhập 'help' để xem tất cả lệnh.",
          "🚀 Hãy tập trung vào công việc! Công việc nào chúng ta nên thêm đầu tiên?"
        ];
        
        const randomResponse = getRandomItem(responses);
        addBotMessageSimple(randomResponse);
      }
    }
    
    // Clear input
    setInputValue('');
  };
  
  // Helper function to detect tasks in a message
  const detectTasksInMessage = async (message: string): Promise<boolean> => {
    try {
      if (!aiConfig.enabled || !aiConfig.apiKey) {
        console.log('AI not enabled or no API key, skipping task detection');
        return false;
      }
      
      console.log('Checking for tasks in message:', message);
      
      // Create a promise that rejects after timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('AI request timed out')), 15000); // Increased timeout for better results
      });
      
      // Create the actual AI request promise
      const aiRequestPromise = async () => {
        const formatPrompt = formatTaskDetectionPrompt(message);
        
        let apiEndpoint = '';
        let requestBody = {};
        
        switch (aiConfig.provider) {
          case 'openai':
            apiEndpoint = 'https://api.openai.com/v1/chat/completions';
            requestBody = {
              model: "gpt-3.5-turbo",
              messages: [
                { role: "system", content: TASK_DETECTION_PROMPT },
                { role: "user", content: formatPrompt }
              ],
              temperature: 0.7,
              max_tokens: 350 // Increased for more complete responses
            };
            break;
            
          case 'openrouter':
            apiEndpoint = 'https://openrouter.ai/api/v1/chat/completions';
            requestBody = {
              model: aiConfig.model || "google/gemini-flash-1.5-8b",
              messages: [
                { role: "system", content: TASK_DETECTION_PROMPT },
                { role: "user", content: formatPrompt }
              ],
              temperature: 0.7,
              max_tokens: 350 // Increased for more complete responses
            };
            break;
            
          case 'gemini':
            apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
            requestBody = {
              contents: [{
                parts: [{
                  text: `${TASK_DETECTION_PROMPT}\n\n${formatPrompt}`
                }]
              }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 350
              }
            };
            break;
            
          default:
            return false;
        }
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        
        if (aiConfig.provider === 'openai' || aiConfig.provider === 'openrouter') {
          headers['Authorization'] = `Bearer ${aiConfig.apiKey}`;
        } else if (aiConfig.provider === 'gemini') {
          headers['x-goog-api-key'] = aiConfig.apiKey;
        }
        
        console.log(`Sending task detection request to ${aiConfig.provider} AI`);
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Received task detection response from ${aiConfig.provider} AI:`, data);
        
        // Parse response based on provider
        let rawText: string;
        
        if (aiConfig.provider === 'gemini') {
          rawText = data.candidates[0].content.parts[0].text;
        } else if (aiConfig.provider === 'openrouter') {
          rawText = data.choices[0].message.content;
        } else {
          rawText = data.choices[0].message.content;
        }
        
        console.log('Raw AI task detection response:', rawText);
        
        // Process the response with a dedicated task detection parser
        const result = parseTasks(rawText);
        
        // Check if task was detected
        if (result.detectedTasks && result.detectedTasks.length > 0) {
          const task = result.detectedTasks[0];
          
          // Create a new task
          const newTodo: Todo = {
            id: Date.now().toString(),
            text: task.text,
            completed: false,
            category: result.category || 'general',
            created: Date.now()
          };
          
          // Add deadline if detected
          if (task.deadline) {
            newTodo.deadline = task.deadline;
          }
          
          // Add to todos
          setTodos(prev => [...prev, newTodo]);
          
          // Show the task in chat
          const todoMessage: ChatMessage = {
            id: Date.now().toString(),
            text: '',
            isBot: true,
            timestamp: Date.now(),
            todo: newTodo
          };
          
          setMessages(prev => [...prev, todoMessage]);
          
          // Show detection message
          addBotMessageSimple(`✅ Đã thêm công việc: "${task.text}"`);
          
          return true;
        }
        
        return false;
      };
      
      // Execute the AI request function and then race its promise
      const aiPromise = aiRequestPromise();
      return await Promise.race([aiPromise, timeoutPromise]);
    } catch (error) {
      console.error('Error detecting tasks:', error);
      return false;
    }
  };
  
  // Special parser for task detection responses
  const parseTasks = (text: string): TaskDetectionResult => {
    try {
      console.log('Parsing task detection response:', text);
      
      // Extract JSON from code blocks if present
      if (text.includes('```')) {
        const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (match && match[1]) {
          text = match[1].trim();
          console.log('Extracted JSON from code block:', text);
        }
      }
      
      // Clean up any extra text around the JSON
      text = text.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      
      // Try standard JSON parse
      const parsedJson = JSON.parse(text);
      console.log('Successfully parsed task detection JSON:', parsedJson);
      
      // Validate and return the parsed result
      const result: TaskDetectionResult = {
        category: parsedJson.category || 'general',
        detectedTasks: []
      };
      
      // Handle different response formats
      if (parsedJson.detectedTasks && Array.isArray(parsedJson.detectedTasks)) {
        result.detectedTasks = parsedJson.detectedTasks;
      } 
      // Some models might use a different field name
      else if (parsedJson.tasks && Array.isArray(parsedJson.tasks)) {
        result.detectedTasks = parsedJson.tasks.map((task: any) => ({
          text: task.text || task.task || task.name || task.description || '',
          deadline: task.deadline || task.due || task.dueDate || undefined
        }));
      }
      // Handle case where the AI returns a single task directly
      else if (parsedJson.text || parsedJson.task) {
        result.detectedTasks = [{
          text: parsedJson.text || parsedJson.task || parsedJson.description || '',
          deadline: parsedJson.deadline || parsedJson.due || parsedJson.dueDate || undefined
        }];
      }
      
      // Special case: if our message is directly a task (like "leetcode tối nay"),
      // make sure we have at least one detected task
      if (!result.detectedTasks || result.detectedTasks.length === 0) {
        // Check if there's any indication this is a task
        const messageLower = text.toLowerCase();
        if (messageLower.includes('task') || 
            messageLower.includes('công việc') || 
            messageLower.includes('làm') ||
            messageLower.includes('deadline')) {
          console.log('Message appears to be a task, creating a default task entry');
          result.detectedTasks = [{
            text: parsedJson.message || text,
            deadline: undefined
          }];
        }
      }
      
      return result;
    } catch (e) {
      console.error('Error parsing task JSON:', e, 'Original text:', text);
      
      // Last attempt: try to create a task directly from the message if it seems like a task
      if (text.length < 100 && !text.includes('\n\n')) {
        console.log('Using message directly as a task:', text);
        return {
          category: 'general',
          detectedTasks: [{
            text: text.trim(),
            deadline: undefined
          }]
        };
      }
      
      return { category: 'general' };
    }
  };
  
  // Set focus on input when loaded
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (date.toDateString() === today.toDateString()) {
          return "Today";
        } else if (date.toDateString() === tomorrow.toDateString()) {
          return "Tomorrow";
        } else {
          return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        }
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  };
  
  // Format remaining time for countdown display
  const formatRemainingTime = (ms: number): string => {
    if (ms <= 0) return "Time's up!";
    
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s remaining`;
  };
  
  // Add back the handleInput function
  const handleInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Add back the handleButtonClick function
  const handleButtonClick = () => {
    handleSendMessage();
  };

  // Add back the enhanced task scheduler
  useEffect(() => {
    console.log('Starting enhanced task scheduler');
    
    // Only update countdown timers, with safe AI calls
    const timerId = setInterval(() => {
      const now = Date.now();
      
      // Update remaining time for each task
      setTodos(prev => {
        // Skip if no todos to update
        if (prev.length === 0) return prev;
        
        // Check if any task needs time updating
        let needsUpdate = false;
        
        const updatedTodos = prev.map(todo => {
          if (todo.completed) return todo;
          
          // Use 10-second timeboxes for development mode
          const timeboxDuration = 10 * 1000; // 10 seconds
          const createdTime = todo.created || now - 5000;
          const expiryTime = createdTime + timeboxDuration;
          
          // Calculate remaining time
          const remainingTime = Math.max(0, expiryTime - now);
          
          // Check if value changed
          if (todo.remainingTime !== remainingTime) {
            needsUpdate = true;
            return { ...todo, remainingTime };
          }
          
          return todo;
        });
        
        // Only trigger update if times actually changed
        return needsUpdate ? updatedTodos : prev;
      });
      
      // Safe processing of expired tasks (with AI if enabled)
      todos.forEach(todo => {
        if (!todo.completed && !todo.timeExpired) {
          const timeboxDuration = 10 * 1000; // 10 seconds
          const createdTime = todo.created || now - 5000;
          const expiryTime = createdTime + timeboxDuration;
          
          // If time expired and we haven't already shown a message
          if (now >= expiryTime) {
            // Mark task as expired in a separate state update to ensure UI responsiveness
            setTodos(prev => prev.map(t => {
              if (t.id === todo.id) {
                return { ...t, timeExpired: true };
              }
              return t;
            }));
            
            // Generate AI blame message without blocking the UI
            if (aiConfig.enabled && aiConfig.apiKey) {
              console.log(`Getting AI blame message for task: "${todo.text}" (ID: ${todo.id})`);
              
              generateBlameMessage(todo).then(result => {
                try {
                  let finalMessage = "";
                  
                  // Log the entire result to debug
                  console.log('Full blame message result:', JSON.stringify(result));
                  
                  // Check if we have valid blame messages from AI
                  if (result.blameMessages && result.blameMessages.length > 0) {
                    // Get a random message from the array
                    let aiMessage = getRandomItem(result.blameMessages);
                    
                    // Special case: if aiMessage is literally "blameMessages", this is an error state
                    if (aiMessage === "blameMessages" || aiMessage === "blameMessages\\") {
                      console.log('Got incorrect "blameMessages" string instead of content, using default');
                      finalMessage = getRandomItem(DEFAULT_BLAME_MESSAGES);
                    } else {
                      console.log('Got raw blame message from AI:', aiMessage);
                      
                      // Clean up the message
                      aiMessage = aiMessage.trim().replace(/^["']|["']$/g, '');
                      aiMessage = aiMessage.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
                      
                      // Truncate if too long
                      if (aiMessage.length > 150) {
                        aiMessage = aiMessage.substring(0, 147) + '...';
                      }
                      
                      // Check if message is in English
                      if (/^[a-zA-Z\s\d.,!?'"()-:;]+$/.test(aiMessage)) {
                        console.log('Received English message from AI:', aiMessage);
                        
                        // Check if it has some Vietnamese mixed in
                        if (!aiMessage.match(/^[a-zA-Z\s\d.,!?'"()-:;]+$/)) {
                          console.log('Message has Vietnamese characters, using it');
                          finalMessage = aiMessage;
                        } else {
                          // English-only message, use default instead
                          console.log('Message is English-only, using default Vietnamese message');
                          finalMessage = getRandomItem(DEFAULT_BLAME_MESSAGES);
                        }
                      } else {
                        // Valid Vietnamese message from AI
                        console.log('Successfully received Vietnamese blame message from AI:', aiMessage);
                        finalMessage = aiMessage;
                      }
                    }
                  } else {
                    // No valid messages from AI, use default
                    console.log('No valid blame messages returned from AI, using default message');
                    finalMessage = getRandomItem(DEFAULT_BLAME_MESSAGES);
                  }
                  
                  // Add emoji prefix and display
                  addBotMessageSimple("⚠️ " + finalMessage);
                  
                } catch (error) {
                  // If anything goes wrong, use a default message
                  console.error('Error processing blame message:', error);
                  addBotMessageSimple("⚠️ " + getRandomItem(DEFAULT_BLAME_MESSAGES));
                }
              }).catch(error => {
                console.error('Error generating AI blame message:', error);
                // Use default message on error
                addBotMessageSimple("⚠️ " + getRandomItem(DEFAULT_BLAME_MESSAGES));
              });
            } else {
              // Use simple message if AI is not enabled
              addBotMessageSimple(`⏰ Hết giờ cho công việc: "${todo.text}"`);
            }
          }
        }
      });
    }, 1000);
    
    return () => clearInterval(timerId);
  }, [todos, aiConfig.enabled, aiConfig.apiKey, aiConfig.provider]);

  // Simple function to detect obvious tasks without requiring AI
  const detectSimpleTask = (message: string): boolean => {
    // Common Vietnamese action verbs that often indicate tasks
    const actionVerbs = ['làm', 'học', 'đọc', 'viết', 'xem', 'mua', 'đi', 'nộp', 'hoàn thành', 'gửi', 'chuẩn bị'];
    
    // Check if message starts with an action verb (casually checking)
    const lowercaseMsg = message.toLowerCase().trim();
    
    for (const verb of actionVerbs) {
      if (lowercaseMsg.startsWith(verb + ' ')) {
        const taskText = message.trim();
        console.log('Simple task detected:', taskText);
        
        // Create and add the task
        const newTodo: Todo = {
          id: Date.now().toString(),
          text: taskText,
          completed: false,
          category: 'general',
          created: Date.now()
        };
        
        // Check for time-related keywords to set deadline
        const timeKeywords = {
          'ngay': 'Hôm nay',
          'bây giờ': 'Hôm nay',
          'hôm nay': 'Hôm nay',
          'ngày mai': 'Ngày mai',
          'tuần sau': 'Tuần sau'
        };
        
        for (const [keyword, deadline] of Object.entries(timeKeywords)) {
          if (lowercaseMsg.includes(keyword)) {
            newTodo.deadline = deadline;
            break;
          }
        }
        
        // Add to todos
        setTodos(prev => [...prev, newTodo]);
        
        // Show confirmation and the task
        const todoMessage: ChatMessage = {
          id: Date.now().toString(),
          text: '',
          isBot: true,
          timestamp: Date.now(),
          todo: newTodo
        };
        
        setMessages(prev => [...prev, todoMessage]);
        addBotMessageSimple(`✅ Đã thêm công việc: "${taskText}"`);
        
        return true;
      }
    }
    
    return false;
  };

  // Modified render to include todo list display
  return (
    <>
      <Container>
        <ProgressBar />
        <Header>
          <AppTitle>Task Chat</AppTitle>
          <AISettingsButton onClick={() => setShowAISettings(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </AISettingsButton>
        </Header>
        
        <ChatContainer ref={chatContainerRef}>
          {messages.map((message) => (
            <Message key={message.id} isBot={message.isBot}>
              <Avatar isBot={message.isBot}>{message.isBot ? 'AI' : 'You'}</Avatar>
              <MessageBubble isBot={message.isBot}>
                {message.todo ? (
                  <TodoItem
                    completed={message.todo.completed}
                    onClick={() => handleTaskCompletion(message.todo!.id, !message.todo!.completed)}
                  >
                    <TodoCheckbox completed={message.todo.completed} />
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ marginRight: '8px' }}>{getCategoryIcon(message.todo.category)}</span>
                        <TodoText completed={message.todo.completed}>
                          {message.todo.text}
                        </TodoText>
                      </div>
                      {message.todo.deadline && (
                        <Deadline>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatDate(message.todo.deadline)}
                        </Deadline>
                      )}
                      {message.todo.remainingTime !== undefined && (
                        <CountdownTimer isExpired={message.todo.remainingTime <= 0}>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatRemainingTime(message.todo.remainingTime)}
                        </CountdownTimer>
                      )}
                    </div>
                  </TodoItem>
                ) : message.isTodoList ? (
                  <TodoContainer>
                    {todos.length > 0 ? (
                      <>
                        <TodoListTitle>Your Tasks</TodoListTitle>
                        {todos.map((todo, index) => (
                          <TodoItem 
                            key={todo.id} 
                            completed={todo.completed}
                            onClick={() => handleTaskCompletion(todo.id, !todo.completed)}
                          >
                            <TodoCheckbox completed={todo.completed} />
                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                                <span style={{ marginRight: '8px' }}>{getCategoryIcon(todo.category)}</span>
                                <TodoText completed={todo.completed}>
                                  {index + 1}. {todo.text}
                                </TodoText>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {todo.deadline && (
                                  <Deadline>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {formatDate(todo.deadline)}
                                  </Deadline>
                                )}
                                {todo.remainingTime !== undefined && (
                                  <CountdownTimer isExpired={todo.remainingTime <= 0}>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {formatRemainingTime(todo.remainingTime)}
                                  </CountdownTimer>
                                )}
                              </div>
                            </div>
                          </TodoItem>
                        ))}
                      </>
                    ) : (
                      <div>No tasks yet. Add a task!</div>
                    )}
                  </TodoContainer>
                ) : (
                  <div style={{whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>
                    {message.text}
                  </div>
                )}
                <Timestamp isBot={message.isBot}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </Timestamp>
              </MessageBubble>
            </Message>
          ))}
          
          {showCommandHint && !isLoading && (
            <CommandHint>
              Try commands like "add buy milk", "list", or "help"
            </CommandHint>
          )}
        </ChatContainer>
        
        <InputContainer>
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleInput}
            placeholder="Nhập tin nhắn..."
            disabled={isLoading}
          />
          <SendButton onClick={handleButtonClick} disabled={isLoading}>
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </SendButton>
        </InputContainer>
        
        <AISettingsOverlay show={showAISettings} onClick={() => setShowAISettings(false)} />
        <AISettingsModal show={showAISettings}>
          <AISettingsTitle>AI Settings</AISettingsTitle>
          <AISettingsGroup>
            <div>
              <AISettingsLabel>Provider</AISettingsLabel>
              <AISettingsSelect 
                value={aiConfig.provider || ''} 
                onChange={(e) => {
                  const provider = e.target.value || null;
                  let endpoint = '';
                  let model = '';
                  
                  if (provider === 'openai') {
                    endpoint = 'https://api.openai.com/v1/chat/completions';
                    model = 'gpt-3.5-turbo';
                  } else if (provider === 'gemini') {
                    endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
                    model = 'gemini-pro';
                  } else if (provider === 'openrouter') {
                    endpoint = 'https://openrouter.ai/api/v1/chat/completions';
                    model = 'google/gemini-flash-1.5-8b';
                  }
                  
                  setAIConfig(prev => ({
                    ...prev,
                    provider: provider as AIConfig['provider'],
                    endpoint,
                    model,
                    enabled: false
                  }));
                }}
              >
                <option value="">Select provider...</option>
                <option value="openai">OpenAI</option>
                <option value="gemini">Google Gemini</option>
                <option value="openrouter">OpenRouter</option>
              </AISettingsSelect>
            </div>
            
            <div>
              <AISettingsLabel>API Key</AISettingsLabel>
              <AISettingsInput
                type="password"
                value={aiConfig.apiKey}
                onChange={(e) => setAIConfig(prev => ({
                  ...prev,
                  apiKey: e.target.value
                }))}
                placeholder="Enter API key..."
              />
            </div>
            
            <ToggleContainer>
              <span>Enable AI</span>
              <ToggleSwitch>
                <input 
                  type="checkbox" 
                  checked={aiConfig.enabled}
                  onChange={(e) => setAIConfig(prev => ({
                    ...prev,
                    enabled: e.target.checked
                  }))}
                />
                <span></span>
              </ToggleSwitch>
            </ToggleContainer>
            
            <ToggleContainer>
              <span>Auto-detect Tasks</span>
              <ToggleSwitch>
                <input 
                  type="checkbox" 
                  checked={aiConfig.autoDetectTasks}
                  onChange={(e) => setAIConfig(prev => ({
                    ...prev,
                    autoDetectTasks: e.target.checked
                  }))}
                />
                <span></span>
              </ToggleSwitch>
            </ToggleContainer>
            
            <AISaveButton onClick={() => setShowAISettings(false)}>
              Save
            </AISaveButton>
          </AISettingsGroup>
        </AISettingsModal>
      </Container>
    </>
  );
};

export default App; 
