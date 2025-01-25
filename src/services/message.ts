import { Context } from "telegraf";
import { OpenAIService } from "./openai";
import { StoreService } from "./store";

/**
 * Service for handling Telegram bot message interactions
 * Manages message processing, storage, and AI-powered responses
 */
export class MessageService {
    private static instance: MessageService;
    private storeService: StoreService;
    private openAIService: OpenAIService;
    private userState: Map<number, { step: string; title?: string }> = new Map();

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
        const firstName = ctx.from?.first_name || "User";
        const welcomeMessage = `Hello *${firstName}*\\!

Every message you send will be collected as a note and stored in a decentralized storage system, ensuring your data is secure and private\\.

You can also leverage AI to get answers to your question\\.`;


        // If triggered by a command like /start
        await ctx.reply(welcomeMessage, {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "Create Note", callback_data: "create_note" },
                        { text: "Notes", callback_data: "notes" },
                    ],
                ],
            },
            parse_mode: "MarkdownV2",
        });

    }

    public async handleCallbackQuery(ctx: Context): Promise<void> {
        if (!('data' in ctx.callbackQuery!)) return;

        const userId = ctx.from?.id;
        if (!userId) return;

        const data = ctx.callbackQuery.data;

        if (data === 'create_note') {
            this.userState.set(userId, { step: "awaiting_title" });
            await ctx.reply('Please enter the title for your note:');
            return;
        }

        if (data === 'notes') {
            const titles = this.storeService.getUserNotesTitles(userId);
            if (titles.length === 0) {
                await ctx.reply('No notes found');
                return;
            }

            const notesMsg = 'Here are your notes:\n\nClick on a title to view the content:';
            const notesKeyboard = titles.map((title, idx) => [{ text: `${idx + 1}. ${title}`, callback_data: `view_note_${idx}` }]);

            await ctx.editMessageText(notesMsg, {
                reply_markup: {
                    inline_keyboard: notesKeyboard,
                },
            });
        }

        if (data.startsWith('view_note_')) {
            const idx = parseInt(data.split('_')[2]);
            const content = await this.storeService.getUserNoteByIndex(userId, idx);
            if (!content) {
                await ctx.reply('Note not found');
                return;
            }

            await ctx.reply(content);
        }
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
            const similarMessages = await this.storeService.searchSimilarMessages(userId, question);
            const msgHistory = similarMessages.map(msg => ({
                content: msg.content,
                title: msg.title
            }));

            // Generate AI response
            const response = await this.openAIService.generateResponse(question, msgHistory);

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
        if (!ctx.message || !("text" in ctx.message)) {
            await ctx.reply("Invalid message format");
            return;
        }

        const userId = ctx.from?.id;
        if (!userId) {
            await ctx.reply("User ID not found");
            return;
        }

        const userState = this.userState.get(userId);
        const text = ctx.message.text;
        if (userState?.step === "awaiting_title" || userState?.step === "awaiting_content") {
            await this.handleCreateNoteText(ctx, userId, text, userState);
            return;
        }
    }

    public async handleCreateNoteText(ctx: Context, userID: number, text: string, userState: { step: string; title?: string }): Promise<void> {
        if (userState.step === 'awaiting_title') {
            this.userState.set(userID, { step: 'awaiting_content', title: text });
            await ctx.reply('Great! Now, please enter the content for your note:');
        } else if (userState.step === 'awaiting_content') {
            const title = userState.title;
            const cid = await this.storeService.addMessage(userID, text, title);
            this.userState.delete(userID);

            if (!cid) {
                await ctx.reply('Error creating note');
                return;
            }

            const replyMsg = `Note *${title}* created successfully\\! \n\n*CID*: ${cid}`;
            await ctx.replyWithMarkdownV2(replyMsg);
        }
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
