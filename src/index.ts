import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { botConfig } from './config/index';
import { MessageService } from './services/message';

const bot = new Telegraf(botConfig.token);
const messageService = MessageService.getInstance();

// Error handling middleware
bot.catch((err, ctx) => {
    console.error(`Error for ${ctx.updateType}:`, err);
    ctx.reply('An error occurred while processing your request');
});

// Command handlers
bot.command('start', (ctx) => messageService.handleStart(ctx));
bot.command('q', (ctx) => messageService.handleQuestion(ctx));

// Message handlers
bot.on(message('text'), (ctx) => messageService.handleTextMessage(ctx));

// Start bot
bot.launch().then(() => {
    console.log('Bot is running...');
}).catch((error) => {
    console.error('Error starting bot:', error);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
