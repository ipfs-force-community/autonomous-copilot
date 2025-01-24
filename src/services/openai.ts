import { OpenAIClient } from '../openai/client';
import { OpenAI } from 'openai';
import { MessageData } from '../types/index';

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
     * Generate a response based on the question and conversation history
     * @param question The user's question
     * @param history Array of previous messages with their content and optional titles
     * @returns AI-generated response as a string
     * @throws Error if response generation fails
     */
    public async generateResponse(question: string, history: MessageData[]): Promise<string> {
        try {
            // Construct conversation context
            const messages: ChatCompletionMessageParam[] = [
                {
                    role: 'system',
                    content: 'You are a helpful assistant. Use the provided conversation history to give contextual responses.',
                },
                // Add history messages
                ...history.map((msg): ChatCompletionMessageParam => ({
                    role: 'user',
                    content: msg.title ? `${msg.title}\n${msg.content}` : msg.content
                })),
                // Add the current question
                {
                    role: 'user',
                    content: question
                }
            ];

            return await this.openAIClient.chat(messages);
        } catch (error) {
            console.error('Error generating AI response:', error);
            throw new Error('Failed to generate response');
        }
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
