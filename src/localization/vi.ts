// Modern, minimal English text resources

export const AppStrings = {
  // App UI
  appTitle: '✨ Task Chat',
  settings: '⚙️',
  inputPlaceholder: '✍️ Nhập nhiệm vụ...',
  send: '➤',
  
  // Settings UI
  aiProvider: '🤖 Provider',
  apiKey: 'Key',
  apiKeyPlaceholder: '🔒 Enter key...',
  selectProvider: '📱 Select',
  openRouter: 'OpenRouter',
  openAI: 'OpenAI',
  googleGemini: 'Gemini',
  deepSeek: 'DeepSeek',
  enableAI: '🚀 Enable',
  autoDetectTasks: 'Auto-detect',
  saveSettings: 'Save',
  testConnection: 'Test',
  
  // Todo List
  todoListTitle: '📋 Tasks',
  emptyTodoList: '🤷‍♂️ No tasks yet',
  
  // Testing
  testingConnection: '⏳ Testing...',
  testError: '❌ Error: {0}',
  testSuccess: '✅ Success!',
  testResultJson: '📊 Result: {0}',
  testResult: '📊 Result: {0}',
  testPrompt: 'Hello!',
  
  // Errors
  apiError: '❌ {0}',
  connectionError: '📶 Connection error',
  
  // Help command output
  helpText: `**Commands:**
      
📋 /list - View tasks
❌ /delete - Remove task
❓ /help - Help`,

  // Initial greeting
  greeting: '👋 Let\'s manage your tasks! Type something to add a task or /help',
  
  // Task completion messages
  taskCompletedMessages: [
    '🎉 Xong rồi: "{0}"!',
    '✅ Hoàn thành: "{0}"!',
    '💯 Đã làm xong: "{0}"!',
    '👏 Nhiệm vụ đã hoàn thành: "{0}"!',
    '🌟 Tuyệt vời! Đã hoàn thành: "{0}"!'
  ],
  
  // New task addition messages with icons
  taskAddedMessages: [
    '📝 Đã thêm: "{0}"',
    '✓ Thêm nhiệm vụ: "{0}"',
    '➕ Nhiệm vụ mới: "{0}"',
    '🗒️ Ghi nhớ: "{0}"',
    '📌 Đã ghim: "{0}"'
  ],
};

export const DEFAULT_BLAME_MESSAGES = [
  "🕒 Task due soon!",
  "⏰ Don't forget this task!",
  "⚠️ Task pending!",
  "📌 Reminder: complete this!",
  "🔔 Task needs attention!",
  "💭 Don't forget this one!",
  "📢 This task is waiting!",
  "⏱️ Tick tock...",
  "🎯 Focus on this task!"
];

// AI Prompts
export const TASK_DETECTION_PROMPT = `You're a task detection assistant:

🔍 Find tasks in messages
📅 Extract deadlines 
🏷️ Categorize tasks

JSON response:
{
  "category": "task category",
  "detectedTasks": [
    {
      "text": "detected task",
      "deadline": "deadline (if any)"
    }
  ]
}`;

export const BLAME_MESSAGE_PROMPT = `Create gentle reminder messages for incomplete tasks:

- Motivational
- Positive tone
- Action-oriented

JSON:
{
  "blameMessages": ["reminder messages"]
}`;

export const formatTaskDetectionPrompt = (taskText: string) => 
  `Phân tích: "${taskText}".
   Tách thành:
   1. Nhiệm vụ chính (không bao gồm thời gian)
   2. Thời hạn (nếu có)
   
   Reply in JSON format:
   {
     "detectedTasks": [
       {
         "text": "nhiệm vụ chính, không bao gồm thời gian",
         "deadline": "thời hạn nếu có (hoặc null)"
       }
     ],
     "category": "loại nhiệm vụ"
   }`;

export const formatBlamePrompt = (task: { text: string, category: string, deadline?: string }) => 
  `Create reminder:
   - Task: ${task.text}
   - Type: ${task.category}
   ${task.deadline ? `- Deadline: ${task.deadline}` : ''}
   Reply in JSON format.`; 