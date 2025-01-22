import { Context } from 'telegraf';
import { StoreService } from './store.js';
import { OpenAIService } from './openai.js';

export class MessageService {
    private static instance: MessageService;
    private storeService: StoreService;
    private openAIService: OpenAIService;

    private constructor() {
        this.storeService = StoreService.getInstance();
        this.openAIService = OpenAIService.getInstance();
    }

    public static getInstance(): MessageService {
        if (!MessageService.instance) {
            MessageService.instance = new MessageService();
        }
        return MessageService.instance;
    }

    public async handleStart(ctx: Context): Promise<void> {
        const firstName = ctx.from?.first_name || 'User';
        const welcomeMessage = `Hello ${firstName}!
Every message you send will be collected as a note store into autodrive, a secure place for your files.
You can ask any question with command /q.`;
        
        await ctx.reply(welcomeMessage);
    }

    public async handleQuestion(ctx: Context): Promise<void> {
        if (!ctx.message || !('text' in ctx.message)) {
            await ctx.reply('Invalid message format');
            return;
        }

        const question = ctx.message.text.split(' ').slice(1).join(' ');
        if (!question) {
            await ctx.reply('Please follow the command with a question, example: /q What is the meaning of life?');
            return;
        }

        const userId = ctx.from?.id;
        if (!userId) {
            await ctx.reply('User ID not found');
            return;
        }

        try {
            // Get conversation history
            const msgHistory = await this.storeService.getUserMessages(userId);
            
            // Generate AI response
            const response = await this.openAIService.generateResponse(question, msgHistory);
            
            // Store the AI response
            await this.storeService.addMessage(userId, `Q: ${question}\nA: ${response}`);
            
            await ctx.reply(response);
        } catch (error) {
            console.error('Error handling question:', error);
            await ctx.reply('Sorry, I encountered an error while processing your question. Please try again later.');
        }
    }

    public async handleTextMessage(ctx: Context): Promise<void> {
        if (!ctx.message || !('text' in ctx.message)) {
            await ctx.reply('Invalid message format');
            return;
        }

        const userId = ctx.from?.id;
        if (!userId) {
            await ctx.reply('User ID not found');
            return;
        }

        const text = ctx.message.text;
        await this.storeService.addMessage(userId, text);
        await ctx.reply('Message stored successfully');
    }
}
