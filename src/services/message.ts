import { Context } from "telegraf";
import { ChatCompletionMessageParam, ConversationHistory, Note, Tool } from "../types";
import { AgentService } from "./agent";
import { OpenAIService } from "./openai";
import { StoreService } from "./store";
import { logger } from "./tools";

/**
 * Service for handling Telegram bot message interactions
 * Creates a new Agent instance for each message
 */
export class MessageService {
    private static instance: MessageService;
    private storeService: StoreService;
    private openAIService: OpenAIService;
    private conversationHistory: ConversationHistory = {};
    private readonly MAX_HISTORY_LENGTH = 10; // Maximum number of messages to keep in history

    /**
     * Private constructor to enforce singleton pattern
     * Initializes required services
     */
    private constructor() {
        this.storeService = StoreService.getInstance();
        this.openAIService = OpenAIService.getInstance();
    }

    /**
     * Creates tools for a specific user's AgentService instance
     * @param userId The Telegram user ID
     * @param ctx The Telegram context for sending replies
     * @returns Array of tools configured for this user
     */
    private createUserTools(userId: number, ctx: Context): Tool[] {
        return [
            {
                name: "saveNote",
                description: "Save a new note with content strictly from user input (NEVER modify or fabricate user's content). Title and tags can be intelligently generated based on the content. Returns the cid of the saved note.",
                parameters: {
                    type: "object",
                    properties: {
                        title: { type: "string" },
                        content: { type: "string" },
                        tags: { type: "array", items: { type: "string" } }
                    },
                    required: ["title", "content", "tags"]
                },
                execute: async (params) => {
                    const { title, content, tags } = params;
                    let note :Note = {
                        title,
                        content,
                        tags,
                        createdAt: new Date().toISOString()
                    };
                    const cid = await this.storeService.addNote(userId, note);
                    return cid || "";
                }
            },
            {
                name: "listNotes",
                description: "List all saved notes with their cids, titles, and tags. Always try to provide a tag to filter notes efficiently. Listing all notes without a tag should be avoided to prevent information overload.",
                parameters: {
                    type: "object",
                    properties: {
                        tag: { type: "string" }
                    },
                    required: []
                },
                execute: async (params) => {
                    const { tag } = params;
                    const notes = tag 
                        ? await this.storeService.listUserNotesByTag(userId, tag)
                        : await this.storeService.listUserNotes(userId);
                    return JSON.stringify(notes);
                }
            },
            {
                name: "searchNotes",
                description: "Search for notes based on semantic similarity to the query text. Returns notes ranked by relevance.",
                parameters: {
                    type: "object",
                    properties: {
                        query: { type: "string" }
                    },
                    required: ["query"]
                },
                execute: async (params) => {
                    const { query } = params;
                    const notes = await this.storeService.searchSimilarNotes(userId, query);
                    return JSON.stringify(notes);
                }
            },
            {
                name: "viewNote",
                description: "View the complete content of a specific note by its cid",
                parameters: {
                    type: "object",
                    properties: {
                        noteId: { type: "string" }
                    },
                    required: ["noteId"]
                },
                execute: async (params) => {
                    const { noteId } = params;
                    const note = await this.storeService.getNote(userId, noteId);
                    return note ? JSON.stringify(note) : "Note not found";
                }
            },
            {
                name: "replyUser",
                description: "Reply to user with a clear and well-structured message in the same language they used. Use bullet points for lists, backticks for code/commands, and keep the response concise and easy to read. Always maintain consistency with the user's language choice throughout the conversation.",
                parameters: {
                    type: "object",
                    properties: {
                        message: { type: "string" }
                    },
                    required: ["message"]
                },
                execute: async (params) => {
                    const { message } = params;
                    // replace \\n with \n and ensure message is a string
                    const formattedMessage = String(message).replace(/\\n/g, "\n");
                    await ctx.reply(formattedMessage, {
                        parse_mode: "Markdown"
                    });
                    return formattedMessage;
                }
            }
        ];
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
     * Handle all text messages by creating a new Agent instance
     * Each message gets its own Agent instance that is disposed after use
     * @param ctx Telegram context containing message and user information
     * @throws Error if message processing fails
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

        try {
            // Create a new agent instance for this message
            const userName = ctx.from?.first_name || "User";
            const agent = new AgentService(this.createUserTools(userId, ctx), userName);

            // initialize conversation history
            if (!this.conversationHistory[userId]) {
                this.conversationHistory[userId] = [];
            }
            
            // Limit history length by removing older messages (keeping system message)
            if (this.conversationHistory[userId].length > this.MAX_HISTORY_LENGTH ) {
                // Remove the oldest message
                this.conversationHistory[userId].shift();
            }
            
            // Add the new message to the history
            const messageParam :ChatCompletionMessageParam = {
                role: "user",
                content: ctx.message.text
            };
            this.conversationHistory[userId].push(messageParam);
            

            // Process the message using conversation history
            await agent.chat(this.conversationHistory[userId]);
        } catch (error) {
            logger.error('MessageService', 'Error handling message:', error);
            await ctx.reply('Sorry, I encountered an error while processing your message. Please try again later.');
        }
    }


    /**
     * Handle the /start command by sending a welcome message
     * @param ctx Telegram context containing user information
     */
    public async handleStart(ctx: Context): Promise<void> {
        const userName = ctx.from?.first_name || "User";
        await ctx.replyWithMarkdownV2(
            `Hello *${userName}*\\!\n\nAI communication assistant, the AI agent will decide whether to save the content to the autonomys network or not\\.`
        );
    }
}
