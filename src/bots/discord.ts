import { Client, Events, GatewayIntentBits, Message, Partials } from 'discord.js';
import { BotContext } from '../types/bot';
import { MessageService } from '../services/message';
import { Logger } from '../services/tools';

var logger = new Logger('DiscordBot');

export class DiscordBot {
    private client: Client;
    private messageService: MessageService;
    private token: string;

    constructor(token: string) {
        this.token = token;
        try {
            this.client = new Client({
                intents: [
                    GatewayIntentBits.Guilds,
                    GatewayIntentBits.GuildMessages,
                    GatewayIntentBits.MessageContent,
                    GatewayIntentBits.DirectMessages,
                    GatewayIntentBits.DirectMessageTyping,
                    GatewayIntentBits.DirectMessageReactions
                ],
                partials: [Partials.Channel, Partials.Message]
            });
        } catch (error) {
            throw new Error(
                'Failed to initialize Discord bot. Please make sure you have enabled the following intents in Discord Developer Portal:\n' +
                '1. SERVER MEMBERS INTENT\n' +
                '2. MESSAGE CONTENT INTENT\n' +
                'To enable these intents:\n' +
                '1. Go to https://discord.com/developers/applications\n' +
                '2. Select your bot application\n' +
                '3. Go to "Bot" settings\n' +
                '4. Enable the required intents under "Privileged Gateway Intents"\n' +
                'Original error: ' + error
            );
        }
        this.messageService = MessageService.getInstance();
        this.setupHandlers();
    }

    private createContext(message: Message): BotContext {
        return {
            message: {
                text: message.content,
                user: {
                    id: message.author.id,  // Discord uses snowflake IDs which are strings
                    username: message.author.username
                }
            },
            reply: async (text: string) => {
                await message.reply({
                    content: text,
                    allowedMentions: { repliedUser: true }
                });
            },
            sendAction: async (action: string) => {
                // Discord doesn't have a direct equivalent to Telegram's sendChatAction
                // But we can simulate "typing" if that's the requested action
                if (action === 'typing') {
                    // try {
                    //     // Discord.js v14 使用 sendTyping() 方法
                    //     if (message.channel.sendTyping) await message.channel.sendTyping();
                    // } catch (error) {
                    //     console.error('Error sending typing indicator:', error);
                    //     // 错误处理：如果发送打字指示器失败，我们只是记录错误并继续
                    // }

                    // todo: implement sendTyping() in Discord.js v14
                }
                // Other actions are ignored in Discord as they don't have direct equivalents
            },
            platform: "discord"
        };
    }

    private setupHandlers(): void {
        // Handle ready event
        this.client.once(Events.ClientReady, c => {
            console.log(`Discord bot ready! Logged in as ${c.user.tag}`);
        });

        // Handle messages
        this.client.on(Events.MessageCreate, async message => {
            // Ignore messages from bots
            if (message.author.bot) return;

            logger.debug(`Received message ${message.content}`, message.author);

            try {
                const botContext = this.createContext(message);

                // Handle commands
                if (message.content.startsWith('!start')) {
                    await this.messageService.handleStart(botContext);
                    return;
                }

                // Handle regular messages
                await this.messageService.handleTextMessage(botContext);
            } catch (error) {
                console.error('Error handling Discord message:', error);
                await message.reply('An error occurred while processing your message');
            }
        });

        // Handle errors
        this.client.on(Events.Error, error => {
            console.error('Discord client error:', error);
        });
    }

    public async start(): Promise<void> {
        try {
            await this.client.login(this.token);
            console.log('Discord bot is starting...');
        } catch (error) {
            console.error('Error starting Discord bot:', error);
            throw new Error(
                'Failed to start Discord bot. Please check:\n' +
                '1. Your bot token is correct\n' +
                '2. Required intents are enabled in Discord Developer Portal\n' +
                '3. The bot has been invited to your server with correct permissions\n\n' +
                'Original error: ' + error
            );
        }
    }

    public async stop(): Promise<void> {
        console.log('Stopping Discord bot...');
        this.client.destroy();
    }
}
