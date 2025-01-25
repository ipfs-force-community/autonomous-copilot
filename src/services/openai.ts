import { OpenAIClient } from '../openai/client';
import { OpenAI } from 'openai';

type ChatCompletionMessageParam = OpenAI.Chat.ChatCompletionMessageParam;

export class OpenAIService {
    private static instance: OpenAIService;
    private openAIClient: OpenAIClient;

    /**
     * Private constructor to prevent direct instantiation
     */
    private constructor() {
        this.openAIClient = OpenAIClient.getInstance();
    }

    /**
     * Returns the singleton instance of OpenAIService
     * @returns OpenAIService instance
     */
    public static getInstance(): OpenAIService {
        if (!OpenAIService.instance) {
            OpenAIService.instance = new OpenAIService();
        }
        return OpenAIService.instance;
    }

    /**
     * Generate a summary of the conversation history
     * @param messages Array of messages to summarize
     * @returns Summary of the conversation as a string
     * @throws Error if summary generation fails
     */
    public async summarizeConversation(messages: string[]): Promise<string> {
        if (messages.length === 0) return '';

        try {
            const prompt: ChatCompletionMessageParam[] = [
                {
                    role: 'system',
                    content: 'Please provide a brief summary of the following conversation history:'
                },
                {
                    role: 'user',
                    content: messages.join('\n')
                }
            ];

            return await this.openAIClient.chat(prompt);
        } catch (error) {
            console.error('Error summarizing conversation:', error);
            throw new Error('Failed to generate conversation summary');
        }
    }

    /**
     * Generate an embedding vector for the given text
     * @param text The text to generate an embedding for
     * @returns Array of numbers representing the text embedding
     * @throws Error if embedding generation fails
     */
    public async generateEmbedding(text: string): Promise<number[]> {
        try {
            return await this.openAIClient.createEmbedding(text);
        } catch (error) {
            console.error('Error generating embedding:', error);
            throw new Error('Failed to generate embedding');
        }
    }
}
