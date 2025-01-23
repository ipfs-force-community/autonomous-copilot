import { Context } from 'telegraf';
import { StoreService } from './store';
import { OpenAIService } from './openai';

/**
 * Service for handling Telegram bot message interactions
 * Manages message processing, storage, and AI-powered responses
 */
export class MessageService {
    private static instance: MessageService;
    private storeService: StoreService;
    private openAIService: OpenAIService;

    /**
     * Private constructor to enforce singleton pattern
     * Initializes required services
     */
    private constructor() {
        this.storeService = StoreService.getInstance();
        this.openAIService = OpenAIService.getInstance();
    }

    /**
     * Returns the singleton instance of MessageService
     * @returns MessageService instance
     */
    public static getInstance(): MessageService {
        if (!MessageService.instance) {
            MessageService.instance = new MessageService();
        }
        return MessageService.instance;
    }

    /**
     * Handle the /start command
     * Sends a welcome message to the user explaining bot functionality
     * @param ctx Telegram context containing message and user information
     * @throws Error if message cannot be sent
     */
    public async handleStart(ctx: Context): Promise<void> {
        const firstName = ctx.from?.first_name || 'User';
        const welcomeMessage = `Hello ${firstName}!
Every message you send will be collected as a note store into autodrive, a secure place for your files.
You can ask any question with command /q.`;
        
        await ctx.reply(welcomeMessage);
    }

    /**
     * Handle the /q command for asking questions
     * Retrieves conversation history, generates AI response, and sends it back
     * @param ctx Telegram context containing message and user information
     * @throws Error if message processing fails
     */
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
            // const msgHistory = await this.storeService.getUserMessages(userId);
            const similarMessages = await this.storeService.searchSimilarMessages(userId, question);
            const msgHistory  = similarMessages.map(msg => ({
                content: msg.content,
                title: msg.title
            }));
            
            // Generate AI response
            const response = await this.openAIService.generateResponse(question, msgHistory);
            
            // Store the AI response
            // await this.storeService.addMessage(userId, `Q: ${question}\nA: ${response}`);
            
            // provide history
            let reply = `Q: ${question}\n`;
            if (msgHistory.length > 0) {
                reply += `H: ${msgHistory.join(' \n')}\n`;
            }
            reply += `\nA: ${response}`;

            await ctx.reply(reply);
        } catch (error) {
            console.error('Error handling question:', error);
            await ctx.reply('Sorry, I encountered an error while processing your question. Please try again later.');
        }
    }

    /**
     * Handle regular text messages
     * Stores the message in auto-drive and confirms storage to user
     * @param ctx Telegram context containing message and user information
     * @throws Error if message storage fails
     */
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

    /**
     * Handle the /search command for finding similar messages
     * @param ctx Telegram context containing message and user information
     * @throws Error if search fails
     */
    public async handleSearch(ctx: Context): Promise<void> {
        if (!ctx.message || !('text' in ctx.message)) {
            await ctx.reply('Invalid message format');
            return;
        }

        const query = ctx.message.text.split(' ').slice(1).join(' ');
        if (!query) {
            await ctx.reply('Please follow the command with a search query, example: /search project updates');
            return;
        }

        const userId = ctx.from?.id;
        if (!userId) {
            await ctx.reply('User ID not found');
            return;
        }

        try {
            const results = await this.storeService.searchSimilarMessages(userId, query);
            
            if (results.length === 0) {
                await ctx.reply('No similar messages found.');
                return;
            }

            const response = results.map((result, index) => {
                const title = result.title ? `[${result.title}]\n` : '';
                const score = Math.round((1 - result.score) * 100); // Convert distance to similarity percentage
                return `${index + 1}. ${title}${result.content}\nSimilarity: ${score}%`;
            }).join('\n\n');

            await ctx.reply(`Found ${results.length} similar messages:\n\n${response}`);
        } catch (error) {
            console.error('Error searching messages:', error);
            await ctx.reply('Sorry, I encountered an error while searching. Please try again later.');
        }
    }
}
