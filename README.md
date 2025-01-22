# Personal AI Assistant with Decentralized Storage

An intelligent AI assistant leveraging [auto-drive](https://github.com/autonomys/auto-drive) for decentralized data storage.

## Features

- AI-powered personal assistant with natural language understanding
- Decentralized data storage powered by auto-drive, ensuring data ownership and availability
- Seamless interaction through Telegram (@bawangxiaoxuanfeng_bot)

## Roadmap

While this project is in its early stages, we have an ambitious vision for its future:

- Enhanced LLM integration for more sophisticated AI capabilities
- Multi-platform support (Discord, Slack, Web Interface)
- Extended media handling (images, videos, audio)

## How to use

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A Telegram Bot Token (from [@BotFather](https://t.me/BotFather))

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd tg-bot
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following content:
   ```
   BOT_TOKEN=your_telegram_bot_token
   ```

### Running the Bot

Development mode (with hot reload):

```bash
npm run dev
# or you may want a proxy
proxychains npm run dev
```

Production mode:

```bash
npm run build
npm start
```

### Using the Bot

1. Start a chat with [@bawangxiaoxuanfeng_bot](https://t.me/bawangxiaoxuanfeng_bot) on Telegram
2. The bot provides AI agent services based on your data
3. Your data is securely stored using auto-drive technology

### Commands

- `/start` - Initialize the bot
- `/help` - Show available commands

For more information or support, please open an issue in the repository.
