# **Autonomous Copilot: Autonomys Network's Intelligent Decision-Making Layer**

**Autonomous Copilot** is an AI-powered data management and decision-making tool built on the Autonomys Network, designed to help users securely store fragmented data while making informed decisions. By leveraging the Autonomys Distributed Storage Network (DSN), Autonomous Copilot ensures long-term data persistence and efficient data processing.

With a powerful combination of AI agents and decentralized storage, Autonomous Copilot enables users to store, manage, and analyze data securely. Through an intuitive interface and seamless Telegram integration, users can access personalized AI services, improving decision-making and overall productivity.

Autonomous Copilot also provides an SDK and API for developers, allowing them to integrate data management and AI-driven decision-making capabilities into their own applications.

## Key Features

- **AI-powered Personal Assistant**: Utilizes natural language processing to interact with users seamlessly.
- **Decentralized Data Storage**: Ensures data ownership and availability with Auto-Drive technology.
- **Telegram Integration**: Interact with the bot directly via [@autonomous_copilot_bot](https://t.me/autonomous_copilot_bot).

## Roadmap

While currently in the early stages, we have an ambitious vision for future features:

- Enhanced integration with Large Language Models (LLMs) for more sophisticated AI capabilities.
- Multi-platform support, including Discord, Slack, and Web Interfaces.
- Extended support for multimedia handling (images, videos, audio).

## Structure

- Flow for persist user data

![persist data](./doc/images/store.png)

- Flow to query user data for analysis

![query data](./doc/images/query.png)

## Getting Started

### Using the Bot

1. Start a chat with [@autonomous_copilot_bot](https://t.me/autonomous_copilot_bot) on Telegram.
2. The bot will assist you with AI-powered services based on your stored data.
3. Your data will be securely stored using **Auto-Drive** technology.

### Host the Bot by Yourself

Follow the steps below to install and run Autonomous Copilot.

#### Prerequisites

Before you start, make sure you have the following:

- **Node.js** (v16 or higher)
- **npm**

#### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/ipfs-force-community/autonomous-copilot
   cd autonomous-copilot
   ```

2. Install project dependencies:

   ```bash
   npm install
   ```

3. Install Chroma:

   Follow the instructions from the [Chroma Cookbook](https://cookbook.chromadb.dev/core/install/).

4. Create a `.env` file in the root directory with the following content:

   ```bash
   BOT_TOKEN=<your_telegram_bot_token>
   AUTO_DRIVE_API_KEY=<your_auto_drive_api_key>
   OPENAI_API_KEY=<your_openai_api_key>
   OPENAI_PROJECT_ID=<your_openai_project_id>
   ```

   **Explanation:**

   - **BOT_TOKEN**: Your Telegram Bot Token, which you can obtain from [@BotFather](https://t.me/BotFather).
   - **AUTO_DRIVE_API_KEY**: API key for managing decentralized storage with Auto-Drive.
   - **OPENAI_API_KEY**: Your OpenAI API key to integrate AI functionalities.
   - **OPENAI_PROJECT_ID**: The ID of your OpenAI project to manage your resources.

#### Running the Bot

##### Development Mode (Hot Reload)

To run the bot in development mode with hot reloading:

```bash
npm run dev
# Optionally, use a proxy if needed
proxychains npm run dev
```

##### Production Mode

To run the bot in production mode, follow these steps:

1. Start Chroma:

   ```bash
   chroma run --path ./data/chroma/
   ```

2. Build and start the bot:

   ```bash
   npm run build
   npm start
   ```

### Simple Demonstration

![demonstration](./doc/images/demo.png)
