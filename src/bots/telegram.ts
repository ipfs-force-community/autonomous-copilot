import { Telegraf, Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { Message } from 'telegraf/types';
import { BotContext } from '../types/bot';
import { MessageService } from '../services/message';

export class TelegramBot {
    private bot: Telegraf;
    private messageService: MessageService;

    constructor(token: string) {
        this.bot = new Telegraf(token);
        this.messageService = MessageService.getInstance();
        this.setupHandlers();
    }

    private createContext(ctx: Context): BotContext {
        if (!ctx.from?.id) {
            throw new Error("User ID not found in Telegram context");
        }

        const message = ctx.message as Message.TextMessage;
        if (!message || !('text' in message)) {
            throw new Error("Message must be a text message");
        }

        return {
            message: {
                text: message.text,
                user: {
                    id: ctx.from.id.toString(),
                    username: ctx.from?.username || "User"
                }
            },
            reply: async (text: string) => {
                await ctx.reply(text, {
                    parse_mode: "Markdown"
                });
            },
            platform: "telegram"
        };
    }

    private setupHandlers(): void {
        // Error handling middleware
        this.bot.catch((err, ctx) => {
            console.error(`Error for ${ctx.updateType}:`, err);
            ctx.reply('An error occurred while processing your request');
        });

        // Command handlers
        this.bot.command('start', (ctx) => {
            const botContext = this.createContext(ctx);
            return this.messageService.handleStart(botContext);
        });

        // Message handlers
        this.bot.on(message('text'), (ctx) => {
            const botContext = this.createContext(ctx);
            return this.messageService.handleTextMessage(botContext);
        });
    }

    public async start(): Promise<void> {
        try {
            await this.bot.launch();
            console.log('Telegram bot is starting...');
        } catch (error) {
            console.error('Error starting Telegram bot:', error);
            throw error;
        }
    }

    public async stop(): Promise<void> {
        console.log('Stopping Telegram bot...');
        this.bot.stop();
    }
}
