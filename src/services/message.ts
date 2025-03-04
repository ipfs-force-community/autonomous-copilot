import { BotContext } from "../types/bot";
import { Note, NoteMetaWithCid, Tool, NoteMeta } from "../types";
import { AgentService } from "./agent";
import { StoreService } from "./store";
import { UserId } from "../types/index";
import { Logger } from "./tools";
import { ChatMessage } from "../types/model";

var logger = new Logger('MessageService');

interface ConversationHistory {
    [userId: UserId]: ChatMessage[];
}

/**
 * Service for handling bot message interactions across different platforms
 * Creates a new Agent instance for each message
 */
export class MessageService {
    private static instance: MessageService;
    private storeService: StoreService;
    private conversationHistory: ConversationHistory = {};
    private readonly MAX_HISTORY_LENGTH = 10; // Maximum number of messages to keep in history

    /**
     * Private constructor to enforce singleton pattern
     * Initializes required services
     */
    private constructor() {
        this.storeService = StoreService.getInstance();
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
     * Creates tools for a specific user's AgentService instance
     * @param userId The user ID
     * @param ctx The bot context for sending replies
     * @returns Array of tools configured for this user
     */
    private createUserTools(userId: UserId, ctx: BotContext): Tool[] {
        return [
            {
                name: "saveNote",
                description: "Save a new note with content strictly from user input (NEVER modify or fabricate user's content). Title and tags can be intelligently generated based on the content. Returns the metadata of the saved note. This operation may take a long time to process.",
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
                    let note: Note = {
                        title,
                        content,
                        tags,
                        createdAt: new Date().toISOString(),
                    };
                    const cid = await this.storeService.addNote(userId, note) || "";
                    const metadata : NoteMetaWithCid = {
                        cid,
                        title: note.title,
                        tags: note.tags,
                        createdAt: note.createdAt
                    };
                    return JSON.stringify(metadata);
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
                description: "Search for notes based on semantic similarity to the query text. Returns notes ranked by relevance. This operation may take some time to process.",
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
                description: "View the complete content of a specific note by its cid. This operation may take some time to process.",
                parameters: {
                    type: "object",
                    properties: {
                        cid: { type: "string" }
                    },
                    required: ["cid"]
                },
                execute: async (params) => {
                    const { cid } = params;
                    const note = await this.storeService.getNote(userId, cid);
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
                    await ctx.reply(message);
                    return "reply user success";
                }
            },
            {
                name: "sendNote",
                description: "Send a note to the user directly based on its cid.",
                parameters: {
                    type: "object",
                    properties: {
                        cid: { type: "string" }
                    },
                    required: ["cid"]
                },
                execute: async (params) => {
                    const { cid } = params;
                    const note = await this.storeService.getNote(userId, cid);
                    if (!note) return "Note not found";
                    
                    const message = `Title: ${note.title}\nTags: ${note.tags}\nDate: ${note.createdAt}\nContent:\n\n ${note.content}`;
                    const meta = {
                        cid,
                        title: note.title,
                        tags: note.tags,
                        createdAt: note.createdAt
                    }
                    await ctx.reply(message);
                    return `send note to user success: ${meta} `;
                }
            },
            {
                name: "reassureUser",
                description: "Reassure the user when operations might take a long time. Sends a message and shows a typing indicator to let them know the agent is working on their request.It could be used to acknowledge the user's intention or update the state of current task. Use this only when you are going to perform an operation.",
                parameters: {
                    type: "object",
                    properties: {
                        message: { type: "string" }
                    },
                    required: ["message"]
                },
                execute: async (params) => {
                    const { message } = params;
                    await ctx.reply(message);
                    await ctx.sendAction('typing');
                    return "User reassured with message and typing indicator";
                }
            }
            

        ];
    }

    /**
     * Handle the /start command by sending a welcome message
     * @param ctx Bot context containing user information
     */
    public async handleStart(ctx: BotContext): Promise<void> {
        const userName = ctx.message.user.username;
        const welcomeMessage = `Hello\!\n\nWelcome to your personal AI assistant\. I can help you store and retrieve information intelligently\. Feel free to share any content you'd like to save or ask me questions about previously stored information\. I'll analyze your requests and manage the data accordingly\!`
        await ctx.reply(welcomeMessage);
    }

    /**
     * Handle all text messages by creating a new Agent instance
     * Each message gets its own Agent instance that is disposed after use
     * @param ctx Bot context containing message and user information
     * @throws Error if message processing fails
     */
    public async handleTextMessage(ctx: BotContext): Promise<void> {
        const userId = ctx.message.user.id;
        const messageText = ctx.message.text;

        try {
            // todo: this action only consist for 5s, retrigger it on other actions
            ctx.sendAction('typing');
            const agent = new AgentService(this.createUserTools(userId, ctx),  ctx.sendAction);

            // initialize conversation history
            if (!this.conversationHistory[userId]) {
                this.conversationHistory[userId] = [];
            }

            // Limit history length by removing older messages (keeping system message)
            if (this.conversationHistory[userId].length > this.MAX_HISTORY_LENGTH) {
                // Remove the oldest message
                this.conversationHistory[userId].shift();
            }

            // Add the new message to the history
            const messageParam: ChatMessage = {
                role: "user",
                content: ctx.message.text
            };
            this.conversationHistory[userId].push(messageParam);

            // Process the message using conversation history
            await agent.chat(this.conversationHistory[userId]);
        } catch (error) {
            logger.error('Error handling message:', error);
            await ctx.reply('Sorry, I encountered an error while processing your message. Please try again later.');
        }
    }
}
