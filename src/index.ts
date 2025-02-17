import { botConfig } from './config/index';
import { TelegramBot } from './bots/telegram';

const telegramBot = new TelegramBot(botConfig.token);
telegramBot.start().catch((error) => {
    console.error('Failed to start bot:', error);
    process.exit(1);
});
