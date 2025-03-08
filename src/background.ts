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
          { role: 'system', content: 'You generate humorous blame messages in Vietnamese for missed deadlines' },
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
      const messages = content.split('\n').filter((line: string) => line.trim().length > 0);
      console.log('AI returned messages:', messages);
      return messages.length > 0 ? messages : DEFAULT_BLAME_MESSAGES;
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
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct',
        messages: [
          { role: 'system', content: 'You generate humorous blame messages in Vietnamese for missed deadlines' },
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
      const messages = content.split('\n').filter((line: string) => line.trim().length > 0);
      console.log('AI returned messages:', messages);
      return messages.length > 0 ? messages : DEFAULT_BLAME_MESSAGES;
    }
    
    return DEFAULT_BLAME_MESSAGES;
  } catch (error) {
    console.error('Error calling OpenRouter:', error);
    return DEFAULT_BLAME_MESSAGES;
  }
};

// Simple API call to Gemini
const generateWithGemini = async (prompt: string, apiKey: string): Promise<string[]> => {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 150
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      const content = data.candidates[0].content.parts[0].text.trim();
      const messages = content.split('\n').filter((line: string) => line.trim().length > 0);
      console.log('AI returned messages:', messages);
      return messages.length > 0 ? messages : DEFAULT_BLAME_MESSAGES;
    }
    
    return DEFAULT_BLAME_MESSAGES;
  } catch (error) {
    console.error('Error calling Gemini:', error);
    return DEFAULT_BLAME_MESSAGES;
  }
};

// Format the blame prompt
const formatBlamePrompt = (task: { text: string, category?: string, deadline?: string }) => {
  return `Hãy tạo một câu "trolling" người dùng vì họ trễ hạn công việc: "${task.text}" (loại: ${task.category || 'chung'})${task.deadline ? `, thời hạn: ${task.deadline}` : ''}.`;
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
const pushNotificationImmediately = (message: string) => {
  console.log('Notification requested:', message);
  
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
  
  // Store for chatbot display when badge is clicked
  chrome.storage.local.get(['pendingBlameMessages'], (data) => {
    const messages = data.pendingBlameMessages || [];
    messages.push({
      message: message,
      timestamp: Date.now()
    });
    chrome.storage.local.set({ pendingBlameMessages: messages });
    console.log('Stored blame message for badge click:', message);
  });
};

// Check tasks and send alerts - FIXED with better error handling and logging
const checkTasks = async () => {
  try {
    console.log('Starting task check at:', new Date().toLocaleTimeString());
    
    // Get tasks from storage
    const storageData = await chrome.storage.local.get(['todos', 'aiConfig']);
    console.log('Retrieved storage data:', storageData);
    
    const todos = storageData.todos || [];
    const aiConfig = storageData.aiConfig || { enabled: false, apiKey: '', provider: 'openai' };
    
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
                blameMessage = getRandomItem(blameMessages);
                console.log('Selected blame message:', blameMessage);
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
          pushNotificationImmediately(blameMessage);
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
  }
});

// Handle the test notification button
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'testNotification') {
    // Use the provided message if available, otherwise use default
    const testMessage = message.message || 'This is a test notification!';
    
    // Use the exact same flow as automatic notifications
    pushNotificationImmediately(testMessage);
    
    // Respond to the popup
    sendResponse({ success: true, message: "Notification triggered" });
    
    return true; // Keep the channel open for async response
  }
});

// Initial check on startup
checkTasks(); 
