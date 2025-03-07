# TaskTroll

<div align="center">
  
![TaskTroll Logo](public/icon128.png)

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

*Coming soon*

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
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top-right corner)
4. Click "Load unpacked"
5. Select the `dist` folder from the project directory

## 🎮 Usage

1. Click the TaskTroll icon in your browser toolbar
2. Type tasks directly or use natural language like "I need to submit the report by Friday"
3. View your tasks and check them off as you complete them
4. Use commands like:
   - `add [task]` - Add a new task
   - `list` - View all your tasks
   - `delete [number]` - Remove a specific task
   - `clear` - Remove all tasks
   - `clearall` - Reset both tasks and message history
   - `help` - View available commands

## ⚙️ AI Configuration

TaskTroll supports multiple AI providers:

1. Go to settings by clicking the gear icon
2. Select your preferred AI provider
3. Enter your API key
4. Enable automatic task detection (optional)

## 🔧 Tech Stack

- TypeScript
- React
- Webpack
- Emotion (CSS-in-JS)
- LocalStorage for data persistence
- AI APIs (OpenAI, Google Gemini, etc.)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

<div align="center">
  Made with ❤️ for productivity
</div>
