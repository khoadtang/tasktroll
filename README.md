# TaskTroll

<div align="center">
  
**A smart todo list with an AI coach that helps keep you accountable**

</div>

## ✨ Overview

TaskTroll is a Chrome extension that combines a modern todo list manager with AI-powered coaching to help you stay on track with your tasks. Unlike ordinary todo apps, TaskTroll uses natural language processing to detect tasks from your conversations and provides gentle reminders when deadlines approach.

## 🚀 Features

- **Smart Task Detection** - Automatically identifies tasks from your chat messages
- **Intelligent Due Dates** - Understands natural language references to time and dates
- **AI Coaching** - Provides personalized reminders when tasks are overdue
- **Category Organization** - Automatically categorizes tasks for better organization
- **Clean Interface** - Modern, distraction-free UI designed for productivity
- **Multiple AI Providers** - Support for OpenAI, Gemini, DeepSeek and OpenRouter

## 📸 Screenshots

<table>
  <tr>
    <td align="center" width="50%">
      <h3>
        ✨ Smart Chat Interface
      </h3>
      <p>AI-powered task detection from natural conversations</p>
      <kbd>
        <a href="screenshots/task_chat.png">
          <img src="screenshots/task_chat.png" width="100%" alt="TaskTroll Chat Interface" />
        </a>
      </kbd>
      <br/>
      <sup>Natural language processing extracts tasks automatically</sup>
    </td>
    <td align="center" width="50%">
      <h3>
        ⚙️ AI Configuration
      </h3>
      <p>Connect to multiple AI providers for intelligent coaching</p>
      <kbd>
        <a href="screenshots/ai_settings.png">
          <img src="screenshots/ai_settings.png" width="100%" alt="AI Configuration" />
        </a>
      </kbd>
      <br/>
      <sup>Supports OpenAI, Gemini, DeepSeek and OpenRouter</sup>
    </td>
  </tr>
</table>

## 🛠️ Installation

### Development Build

```bash
# Clone the repository
git clone https://github.com/yourusername/tasktroll.git
cd tasktroll

# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Loading the Extension

1. Build the extension using `npm run build`
2. Open Chrome and navigate to chrome://extensions/
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `dist` folder from this project 
