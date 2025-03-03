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

                // ref to https://core.telegram.org/bots/api#markdownv2-style
                // Any character with code between 1 and 126 inclusively can be escaped anywhere with a preceding '\' character, in which case it is treated as an ordinary character and not a part of the markup. This implies that '\' character usually must be escaped with a preceding '\' character.
                // Inside pre and code entities, all '`' and '\' characters must be escaped with a preceding '\' character.
                // Inside the (...) part of the inline link and custom emoji definition, all ')' and '\' must be escaped with a preceding '\' character.
                // In all other places characters '_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!' must be escaped with the preceding character '\'.

                // Escape special characters according to MarkdownV2 rules
                const escapedText = text.replace(/([_*\[\]()~`>#\+\-=|{}.!\\])/g, '\\$1');

                await ctx.reply(escapedText, {
                    parse_mode: "MarkdownV2"
                });
            },
            sendAction: async (action: string) => {
                // Telegraf 只接受特定的动作类型
                type TelegramAction = "typing" | "upload_photo" | "record_video" | "upload_video" | 
                    "record_voice" | "upload_voice" | "upload_document" | "choose_sticker" | 
                    "find_location" | "record_video_note" | "upload_video_note";
                
                // 检查动作是否是有效的 Telegram 动作
                if (action === "typing" || 
                    action === "upload_photo" || 
                    action === "record_video" || 
                    action === "upload_video" || 
                    action === "record_voice" || 
                    action === "upload_voice" || 
                    action === "upload_document" || 
                    action === "choose_sticker" || 
                    action === "find_location" || 
                    action === "record_video_note" || 
                    action === "upload_video_note") {
                    await ctx.sendChatAction(action as TelegramAction);
                }
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
