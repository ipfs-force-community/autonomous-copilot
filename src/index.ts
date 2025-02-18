import { botConfig } from './config/index';
import { TelegramBot } from './bots/telegram';
import { DiscordBot } from './bots/discord';

const stopFns: Array<() => Promise<void>> = [];

async function startBots() {
    // Start Telegram bot if configured
    if (botConfig.telegram?.token) {
        const telegramBot = new TelegramBot(botConfig.telegram.token);
        stopFns.push(() => telegramBot.stop());
        telegramBot.start();
    }

    // Start Discord bot if configured
    if (botConfig.discord?.token) {
        const discordBot = new DiscordBot(botConfig.discord.token);
        stopFns.push(() => discordBot.stop());
        discordBot.start();
    }

    if (stopFns.length === 0) {
        throw new Error('No bot configuration found. Please set TELEGRAM_BOT_TOKEN and/or DISCORD_BOT_TOKEN');
    }

    console.log('All bots started successfully');
}

async function stopBots(signal: string) {
    console.log(`Received ${signal}, stopping all bots...`);
    await Promise.all(stopFns.map(stop => stop()));
    process.exit(0);
}

// Setup signal handlers for graceful shutdown
process.once('SIGINT', () => stopBots('SIGINT'));
process.once('SIGTERM', () => stopBots('SIGTERM'));

startBots().catch(error => {
    console.error('Failed to start bots:', error);
    process.exit(1);
});
