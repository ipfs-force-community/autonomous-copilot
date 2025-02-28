import { describe, expect, it, beforeAll } from '@jest/globals';
import { ChatMessage } from '../types/model';
import { AgentService, parseToolCalls } from '../services/agent';
import { Tool } from '../types';

interface NoteMeta {
    cid: string;
    title: string;
    tags: string[];
    createdAt: string;
}

interface Note {
    meta: NoteMeta;
    content: string;
}

const mockNotes: Note[] = [
    {
        meta: {
            cid: "note1",
            title: "Chocolate Cake Recipe",
            tags: ["dessert", "baking", "chocolate"],
            createdAt: "2025-01-24T14:00:00Z"
        },
        content: `Ingredients:
- 2 cups all-purpose flour
- 2 cups sugar
- 3/4 cup unsweetened cocoa powder
- 2 teaspoons baking soda
- 1 teaspoon salt
- 2 eggs
- 1 cup milk
- 1/2 cup vegetable oil
- 2 teaspoons vanilla extract
- 1 cup boiling water

Instructions:
1. Preheat oven to 350°F (175°C)
2. Mix dry ingredients
3. Add wet ingredients and mix well
4. Bake for 30-35 minutes`
    },
    {
        meta: {
            cid: "note2",
            title: "Vanilla Cupcakes",
            tags: ["dessert", "baking", "vanilla"],
            createdAt: "2025-01-24T14:30:00Z"
        },
        content: `Ingredients:
- 1.5 cups all-purpose flour
- 1.5 teaspoons baking powder
- 1/4 teaspoon salt
- 1/2 cup unsalted butter
- 1 cup sugar
- 2 eggs
- 2 teaspoons vanilla extract
- 1/2 cup milk

Instructions:
1. Preheat oven to 350°F
2. Line muffin tin with cupcake liners
3. Mix ingredients as directed
4. Bake for 18-20 minutes`
    }
];

describe('AgentService Tests', () => {
    const createMockTools = (): Tool[] => [
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
            execute: jest.fn().mockResolvedValue("note-123")
        },
        {
            name: "listNotes",
            description: "List all saved notes with their cids, titles, and tags. Always try to provide a tag to filter notes efficiently. Listing all notes without a tag should be avoided to prevent information overload",
            parameters: {
                type: "object",
                properties: {
                    tag: { type: "string" }
                },
                required: []
            },
            execute: jest.fn().mockResolvedValue(JSON.stringify(mockNotes))
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
            execute: jest.fn().mockImplementation(async (params) => {
                const note = mockNotes.find(n => n.meta.cid === params.noteId);
                return note ? JSON.stringify(note) : "Note not found";
            })
        },
        {
            name: "replyUser",
            description: "Reply to user",
            parameters: {
                type: "object",
                properties: {
                    message: { type: "string" }
                },
                required: ["message"]
            },
            execute: jest.fn().mockResolvedValue("Replied to user")
        }
    ];

    describe('Basic Functionality', () => {
        const testUser = "TestUser";
        const testTime = new Date("2025-01-25T11:40:03+08:00");

        it('should process messages and execute tools', async () => {
            const mockTools = createMockTools();
            const agentService = new AgentService(mockTools, testUser);
            const messages: ChatMessage[] = [
                { role: "user", content: "Show me my dessert recipes" }
            ];

            await agentService.chat(messages);

            const listNotesTool = mockTools.find(t => t.name === "listNotes");
            const replyUserTool = mockTools.find(t => t.name === "replyUser");

            expect(listNotesTool?.execute).toHaveBeenCalled();
            expect(replyUserTool?.execute).toHaveBeenCalled();
            expect(messages[0].role).toBe("system");
        }, 15000);
    });

    describe('Tool Execution', () => {
        const testUser = "TestUser";
        const testTime = new Date("2025-01-25T11:40:03+08:00");

        it('should create note with tags', async () => {
            const mockTools = createMockTools();
            const agentService = new AgentService(mockTools, testUser);
            const messages: ChatMessage[] = [
                {
                    role: 'user',
                    content: `Chocolate Cake Recipe
Ingredients:
- 2 cups all-purpose flour
- 2 cups sugar
- 3/4 cup unsweetened cocoa powder
- 2 teaspoons baking soda
- 1 teaspoon salt
- 2 eggs
- 1 cup milk
- 1/2 cup vegetable oil
- 2 teaspoons vanilla extract
- 1 cup boiling water

Instructions:
1. Preheat oven to 350°F (175°C)
2. Mix dry ingredients
3. Add wet ingredients and mix well
4. Bake for 30-35 minutes`
                }
            ];

            await agentService.chat(messages);

            const createNoteTool = mockTools.find(t => t.name === 'saveNote');
            expect(createNoteTool?.execute).toHaveBeenCalledWith(expect.objectContaining({
                title: expect.any(String),
                // todo: should keep consistent with user message, but there is some transcoding
                content: expect.any(String),
                tags: expect.any(Array)
            }));
        }, 15000);

        it('should list notes', async () => {
            const mockTools = createMockTools();
            const agentService = new AgentService(mockTools, testUser);
            const messages: ChatMessage[] = [
                { role: "user", content: "Show me my dessert recipes" }
            ];

            await agentService.chat(messages);

            const listNotesTool = mockTools.find(t => t.name === "listNotes");
            expect(listNotesTool?.execute).toHaveBeenCalled();
        }, 15000);

        it('should list and view note', async () => {
            const mockTools = createMockTools();
            const agentService = new AgentService(mockTools, testUser);
            const messages: ChatMessage[] = [
                { role: "user", content: "Show me the chocolate cake recipe" }
            ];

            await agentService.chat(messages);

            const listNotesTool = mockTools.find(t => t.name === "listNotes");
            const viewNoteTool = mockTools.find(t => t.name === "viewNote");
            const replyUserTool = mockTools.find(t => t.name === "replyUser");

            expect(listNotesTool?.execute).toHaveBeenCalled();
            expect(viewNoteTool?.execute).toHaveBeenCalled();
            expect(replyUserTool?.execute).toHaveBeenCalled();
        }, 15000);
    });

    describe('Error Handling', () => {
        const testUser = "TestUser";
        const testTime = new Date("2025-01-25T11:40:03+08:00");

        it('should handle missing tool gracefully', async () => {
            const mockTools = createMockTools();
            const agentService = new AgentService(mockTools, testUser);
            const messages: ChatMessage[] = [
                { role: "user", content: "Test command" },
                { role: "assistant", content: '<call>nonexistentTool(param="value")</call>' }
            ];

            await expect(agentService.chat(messages)).resolves.not.toThrow();
        }, 15000);
    });
});
