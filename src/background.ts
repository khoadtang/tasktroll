// Interface definitions
interface Todo {
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

interface StoredNotification {
  message: string;
  timestamp: number;
  displayed: boolean;
}

interface BlameMessage {
  message: string;
  timestamp: number;
}

interface AIConfig {
  enabled: boolean;
  apiKey: string;
  provider: string;
  endpoint?: string;
  autoDetectTasks?: boolean;
}

// Default blame messages if AI is not available
const DEFAULT_BLAME_MESSAGES = [
  "⚠️ Công việc của bạn đã quá hạn!",
  "⏰ Bạn đã không hoàn thành công việc đúng hạn.",
  "🔥 Thời gian đã hết! Công việc chưa hoàn thành.",
  "😱 Bạn đã trễ hạn cho công việc này rồi!"
];

// Import the blame message prompt from the taskAnalysis file
import { BLAME_MESSAGE_PROMPT, formatBlamePrompt as originalFormatBlamePrompt } from './prompts/taskAnalysis';

// Helper function to get a random item from an array
const getRandomItem = <T>(arr: T[]): T => {
  return arr[Math.floor(Math.random() * arr.length)];
};

// Simple API call to OpenAI
const generateWithOpenAI = async (prompt: string, apiKey: string): Promise<string[]> => {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: BLAME_MESSAGE_PROMPT },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 150
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    if (data && data.choices && data.choices[0] && data.choices[0].message) {
      const content = data.choices[0].message.content.trim();
      
      // Try to parse JSON response
      try {
        const jsonResponse = JSON.parse(content);
        if (jsonResponse && jsonResponse.blameMessages && Array.isArray(jsonResponse.blameMessages)) {
          return jsonResponse.blameMessages.length > 0 ? jsonResponse.blameMessages : DEFAULT_BLAME_MESSAGES;
        }
      } catch (parseError) {
        console.error('Error parsing JSON from API response:', parseError);
        // Fall back to line splitting if JSON parsing fails
        const messages = content.split('\n').filter((line: string) => line.trim().length > 0);
        return messages.length > 0 ? messages : DEFAULT_BLAME_MESSAGES;
      }
    }
    
    return DEFAULT_BLAME_MESSAGES;
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    return DEFAULT_BLAME_MESSAGES;
  }
};

// Simple API call to OpenRouter
const generateWithOpenRouter = async (prompt: string, apiKey: string): Promise<string[]> => {
  try {
    console.log('Starting OpenRouter API call with prompt:', prompt.substring(0, 50) + '...');
    
    // The prompt should already be formatted properly from formatBlamePrompt
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/khoatran3005/tasktroll', // Required by OpenRouter
        'X-Title': 'TaskTroll Chrome Extension'  // Helps identify your app in OpenRouter logs
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku', // Using Claude for better JSON formatting
        messages: [
          { role: 'user', content: prompt } // Use the prompt directly as provided by formatBlamePrompt
        ],
        temperature: 0.7,
        max_tokens: 300,
        response_format: { type: "json_object" } // Force JSON response
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('OpenRouter API response data:', data);
    
    // Extract content from response
    let content = '';
    if (data && data.choices && data.choices[0] && data.choices[0].message) {
      if (typeof data.choices[0].message.content === 'string') {
        content = data.choices[0].message.content.trim();
      } else if (Array.isArray(data.choices[0].message.content)) {
        // For array-based content (Gemini format)
        for (const part of data.choices[0].message.content) {
          if (part.type === 'text') {
            content += part.text;
          }
        }
        content = content.trim();
      }
    }
    
    console.log('Raw model response:', content);
    
    // Parse JSON response
    try {
      // Look for JSON-like content
      const jsonMatch = content.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        try {
          const jsonResponse = JSON.parse(jsonStr);
          if (jsonResponse && jsonResponse.blameMessages && Array.isArray(jsonResponse.blameMessages)) {
            const validMessages = jsonResponse.blameMessages
              .filter((msg: string) => typeof msg === 'string' && msg.trim().length > 0)
              .map((msg: string) => msg.trim());
            
            if (validMessages.length > 0) {
              console.log('Successfully parsed blame messages from JSON:', validMessages);
              return validMessages;
            }
          }
        } catch (innerError) {
          console.error('Error parsing extracted JSON:', innerError);
        }
      }
      
      // Fallback: check for bulleted lists or numbered lists
      const lines = content.split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0 && (line.startsWith('-') || line.startsWith('•') || /^\d+[\.\)]/.test(line)));
      
      if (lines.length > 0) {
        // Clean up the bullet points or numbers
        const cleanedLines = lines.map((line: string) => 
          line.replace(/^[-•]|^\d+[\.\)]/, '').trim()
        );
        console.log('Extracted messages from bullet points:', cleanedLines);
        return cleanedLines;
      }
      
      // Last resort: just split by newlines
      const allLines = content.split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => 
          line.length > 0 && 
          !line.includes('{') && 
          !line.includes('}') && 
          !line.includes('blameMessages') &&
          line.length < 150
        );
      
      if (allLines.length > 0) {
        console.log('Using plain text lines as messages:', allLines);
        return allLines;
      }
    } catch (parseError) {
      console.error('Error processing model response:', parseError);
    }
    
    // If all parsing attempts fail, return default messages
    console.warn('Failed to extract blame messages, using defaults');
    return DEFAULT_BLAME_MESSAGES;
  } catch (error) {
    console.error('Error calling OpenRouter:', error);
    return DEFAULT_BLAME_MESSAGES;
  }
};

// Simple API call to Gemini
const generateWithGemini = async (prompt: string, apiKey: string): Promise<string[]> => {
  try {
    console.log('Starting Gemini API call with prompt:', prompt.substring(0, 50) + '...');
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt } // Use the formatted prompt directly
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 300
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      const content = data.candidates[0].content.parts[0].text.trim();
      
      // Try to parse JSON response
      try {
        const jsonResponse = JSON.parse(content);
        if (jsonResponse && jsonResponse.blameMessages && Array.isArray(jsonResponse.blameMessages)) {
          return jsonResponse.blameMessages.length > 0 ? jsonResponse.blameMessages : DEFAULT_BLAME_MESSAGES;
        }
      } catch (parseError) {
        console.error('Error parsing JSON from API response:', parseError);
        // Fall back to line splitting if JSON parsing fails
        const messages = content.split('\n').filter((line: string) => line.trim().length > 0);
        return messages.length > 0 ? messages : DEFAULT_BLAME_MESSAGES;
      }
    }
    
    return DEFAULT_BLAME_MESSAGES;
  } catch (error) {
    console.error('Error calling Gemini:', error);
    return DEFAULT_BLAME_MESSAGES;
  }
};

// Use the original formatBlamePrompt from taskAnalysis.ts
const formatBlamePrompt = (task: { text: string, category?: string, deadline?: string }) => {
  return originalFormatBlamePrompt({
    text: task.text,
    category: task.category || 'general',
    deadline: task.deadline
  });
};

// Function to safely generate blame messages with AI
const generateBlameMessage = async (
  task: Todo,
  aiConfig: AIConfig
): Promise<string[]> => {
  try {
    if (!aiConfig.enabled || !aiConfig.apiKey) {
      console.log('AI not enabled or no API key, using default blame messages');
      return DEFAULT_BLAME_MESSAGES;
    }
    
    const formatPrompt = formatBlamePrompt({
      text: task.text,
      category: task.category || 'general',
      deadline: task.deadline
    });
    
    let apiEndpoint = '';
    let requestBody = {};
    
    switch (aiConfig.provider) {
      case 'openai':
        return await generateWithOpenAI(formatPrompt, aiConfig.apiKey);
      case 'openrouter':
        return await generateWithOpenRouter(formatPrompt, aiConfig.apiKey);
      case 'gemini':
        return await generateWithGemini(formatPrompt, aiConfig.apiKey);
      default:
        return DEFAULT_BLAME_MESSAGES;
    }
  } catch (error) {
    console.error('Error generating blame message:', error);
    return DEFAULT_BLAME_MESSAGES;
  }
};

// Function to push a notification immediately (guaranteed to work)
const pushNotificationImmediately = (message: string, taskId?: string) => {
  console.log('Notification requested:', message, 'for task:', taskId);
  
  // Set badge - this ALWAYS works without user gesture 
  chrome.action.setBadgeText({ text: '!!' });
  chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
  
  // Flash badge animation - guaranteed to work
  const colors = ['#FF0000', '#FF8C00', '#FFD700'];
  let colorIndex = 0;
  const flashInterval = setInterval(() => {
    chrome.action.setBadgeBackgroundColor({ color: colors[colorIndex % colors.length] });
    colorIndex++;
  }, 300);
  
  setTimeout(() => clearInterval(flashInterval), 10000);
  
  // Create notification ID based on task ID if available
  const notificationId = taskId ? `task-${taskId}` : `notification-${Date.now()}`;
  
  // Store for chatbot display (this always works)
  chrome.storage.local.get(['pendingBlameMessages'], (data) => {
    const messages = data.pendingBlameMessages || [];
    messages.push({
      message: message,
      timestamp: Date.now(),
      taskId: taskId // Store the task ID for reference
    });
    chrome.storage.local.set({ pendingBlameMessages: messages });
    console.log('Stored blame message for badge click:', message);
    
    // Also store for popup display
    chrome.storage.local.set({
      showNotification: {
        title: 'Task Alert',
        message: message,
        timestamp: Date.now(),
        taskId: taskId
      }
    });
  });
  
  // Use direct Chrome notification with data URL icon (most successful approach)
  try {
    // Use a very simple, small base64 encoded icon (1x1 pixel transparent PNG)
    // This is guaranteed to work across all Chrome versions
    const simpleIconBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    
    console.log('Creating notification with minimal icon');
    
    // Simple notification with minimal options (most reliable)
    chrome.notifications.create(notificationId, {
      type: 'basic',
      iconUrl: simpleIconBase64, 
      title: 'Task Alert',
      message: message
    }, (createdId) => {
      if (chrome.runtime.lastError) {
        console.error('Error creating notification with icon:', chrome.runtime.lastError);
        
        // Try one more time with absolutely no icon
        console.log('Final attempt: creating notification without icon');
        chrome.notifications.create(notificationId + '_noicon', {
          type: 'basic',
          iconUrl: '', // Empty string to satisfy the type requirement
          title: 'Task Alert',
          message: message
        }, (finalId) => {
          if (chrome.runtime.lastError) {
            console.error('All notification attempts failed:', chrome.runtime.lastError);
          } else {
            console.log('Notification created without icon:', finalId);
          }
        });
      } else {
        console.log('Notification created successfully:', createdId);
      }
    });
  } catch (err) {
    console.error('Error creating notification (benign, badge still works):', err);
  }
};

// Check tasks and send alerts - FIXED with better error handling and logging
const checkTasks = async () => {
  try {
    console.log('Starting task check at:', new Date().toLocaleTimeString());
    
    // Get tasks from storage
    const storageData = await chrome.storage.local.get(['todos', 'aiConfig']);
    console.log('Retrieved storage data:', storageData);
    
    const todos = storageData.todos || [];
    
    // Default to openrouter if no provider is specified
    const aiConfig = storageData.aiConfig || { 
      enabled: true, 
      apiKey: '', 
      provider: 'openrouter' 
    };
    
    // Force the provider to be openrouter unless explicitly set to something else
    if (!aiConfig.provider) {
      aiConfig.provider = 'openrouter';
    }
    
    console.log('Using AI provider:', aiConfig.provider);
    
    if (!todos.length) {
      console.log('No tasks to check');
      return;
    }
    
    console.log('Checking tasks at: ', new Date().toLocaleTimeString());
    console.log('Tasks to check:', todos);
    console.log('AI config:', aiConfig);
    
    const now = Date.now();
    
    // Process each task
    for (const todo of todos) {
      try {
        console.log('Checking task:', todo);
        
        if (todo.completed) {
          console.log('Task is completed, skipping:', todo.id);
          continue;
        }
        
        if (todo.timeExpired) {
          console.log('Task already marked as expired, skipping:', todo.id);
          continue;
        }
        
        // Determine expiry time
        let expiryTime;
        
        if (todo.dueDate) {
          // Use the specific due date if available
          expiryTime = todo.dueDate;
          console.log(`Task ${todo.id} has specific due date:`, new Date(expiryTime).toLocaleString());
        } else {
          // For development/testing, use 10-second timeboxes
          const timeboxDuration = 10 * 1000; // 10 seconds
          const createdTime = todo.created || (now - 5000);
          expiryTime = createdTime + timeboxDuration;
          console.log(`Task ${todo.id} using timebox expiry:`, new Date(expiryTime).toLocaleString());
        }
        
        // Check if task is expired
        const isExpired = now >= expiryTime;
        console.log(`Task ${todo.id} expired? ${isExpired} (now: ${new Date(now).toLocaleString()}, expiry: ${new Date(expiryTime).toLocaleString()})`);
        
        // If time expired
        if (isExpired) {
          console.log('TASK EXPIRED:', todo.text);
          
          // Mark as expired in storage
          todo.timeExpired = true;
          await chrome.storage.local.set({ todos });
          console.log('Marked task as expired in storage:', todo.id);
          
          // Default blame message in case AI fails
          let blameMessage = `⏰ Hết giờ cho công việc: "${todo.text}"`;
          
          // Try to generate blame message with AI if enabled
          if (aiConfig.enabled && aiConfig.apiKey) {
            console.log('AI is enabled, generating blame message for task:', todo.id);
            console.log('Using AI provider:', aiConfig.provider);
            console.log('API key available:', !!aiConfig.apiKey);
            
            try {
              // Get blame messages from AI
              const blameMessages = await generateBlameMessage(todo, aiConfig);
              console.log('AI returned blame messages:', blameMessages);
              
              // Use random message if available
              if (blameMessages && Array.isArray(blameMessages) && blameMessages.length > 0) {
                // Filter out any empty or very short messages
                const validMessages = blameMessages.filter(msg => 
                  typeof msg === 'string' && msg.trim().length > 10
                );
                
                if (validMessages.length > 0) {
                  blameMessage = getRandomItem(validMessages);
                  console.log('Selected blame message:', blameMessage);
                  
                  // Save these messages for future use
                  if (validMessages.length > 1) {
                    todo.customBlameMessages = validMessages;
                    await chrome.storage.local.set({ todos });
                    console.log('Saved custom blame messages to task:', todo.id);
                  }
                } else {
                  console.warn('No valid blame messages returned from AI, using default');
                }
              } else {
                console.warn('No valid blame messages returned from AI, using default');
              }
            } catch (error) {
              console.error('Error generating AI blame message:', error);
            }
          } else {
            console.log('AI is not enabled or no API key, using default blame message');
          }
          
          // Show notification with badge animation
          console.log('Pushing notification with blame message:', blameMessage);
          pushNotificationImmediately(blameMessage, todo.id);
        }
      } catch (taskError) {
        console.error('Error processing task:', todo, taskError);
      }
    }
  } catch (error) {
    console.error('Error checking tasks:', error);
  }
};

// Listen for changes to the todos
chrome.storage.onChanged.addListener((changes) => {
  if (changes.todos) {
    console.log('Todos updated:', changes.todos.newValue);
  }
});

// Initial setup when service worker starts
console.log('TaskTroll background service worker initializing...');

// Check basic API availability
console.log('Chrome API availability check:');
console.log('- chrome.action API:', typeof chrome.action !== 'undefined' ? 'Available' : 'Not available');
console.log('- chrome.storage API:', typeof chrome.storage !== 'undefined' ? 'Available' : 'Not available');
console.log('- chrome.alarms API:', typeof chrome.alarms !== 'undefined' ? 'Available' : 'Not available');
console.log('- chrome.notifications API:', typeof chrome.notifications !== 'undefined' ? 'Available' : 'Not available');

// Skip test notification that was causing errors
console.log('Notifications will be shown when tasks expire');

// Check and update AI settings on startup
const checkAndUpdateAISettings = async () => {
  try {
    const data = await chrome.storage.local.get(['aiConfig']);
    const aiConfig = data.aiConfig || {};
    
    // Check if we need to update settings
    let needsUpdate = false;
    
    if (!aiConfig.provider || aiConfig.provider === 'openai') {
      aiConfig.provider = 'openrouter';
      needsUpdate = true;
    }
    
    if (aiConfig.enabled === undefined) {
      aiConfig.enabled = true;
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      console.log('Updating AI settings to:', aiConfig);
      await chrome.storage.local.set({ aiConfig });
    } else {
      console.log('AI settings already configured:', aiConfig);
    }
  } catch (error) {
    console.error('Error updating AI settings:', error);
  }
};

// Run the settings check on startup
checkAndUpdateAISettings();

// Set up the alarm for periodic checking
chrome.alarms.create('checkTasks', {
  periodInMinutes: 1 // Check every minute
});

// Listen for alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkTasks') {
    checkTasks();
  }
});

// When popup opens, just clear the badge
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'popup') {
    console.log('Popup opened - clearing badge');
    
    // Just clear the badge when popup opens
    chrome.action.setBadgeText({ text: '' });
    
    // Also check for expired tasks when popup opens
    console.log('Popup opened - checking tasks');
    checkTasks();
  }
});

// Handle the test notification button
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'testNotification') {
    // Use the provided message if available, otherwise use default
    const testMessage = message.message || 'This is a test notification!';
    
    // Use the exact same flow as automatic notifications
    pushNotificationImmediately(testMessage, message.taskId);
    
    // Respond to the popup
    sendResponse({ success: true, message: "Notification triggered" });
    
    return true; // Keep the channel open for async response
  }
  
  // Handle task completion - clear notifications for the completed task
  if (message.action === 'taskCompleted' && message.taskId) {
    // Clear any notification related to this task
    const notificationId = `task-${message.taskId}`;
    chrome.notifications.clear(notificationId, (wasCleared) => {
      console.log(`Notification for task ${message.taskId} cleared:`, wasCleared);
    });
    
    // Remove the task from pending blame messages
    chrome.storage.local.get(['pendingBlameMessages'], (data) => {
      if (data.pendingBlameMessages && Array.isArray(data.pendingBlameMessages)) {
        const updatedMessages = data.pendingBlameMessages.filter(
          (msg: any) => msg.taskId !== message.taskId
        );
        chrome.storage.local.set({ pendingBlameMessages: updatedMessages });
        console.log('Removed completed task from pending blame messages:', message.taskId);
      }
    });
    
    sendResponse({ success: true, message: "Task notification cleared" });
    return true;
  }
});

// Initial check on startup
checkTasks(); 
