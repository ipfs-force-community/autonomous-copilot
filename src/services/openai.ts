import { OpenAIClient } from '../openai/client.js';
import { OpenAI } from 'openai';

type ChatCompletionMessageParam = OpenAI.Chat.ChatCompletionMessageParam  ;

export class OpenAIService {
    private static instance: OpenAIService;
    private openAIClient: OpenAIClient;

    private constructor() {
        this.openAIClient = OpenAIClient.getInstance();
    }

    public static getInstance(): OpenAIService {
        if (!OpenAIService.instance) {
            OpenAIService.instance = new OpenAIService();
        }
        return OpenAIService.instance;
    }

    /**
     * Generate a response based on the question and conversation history
     * @param question The user's question
     * @param history Previous messages for context
     * @returns AI-generated response
     */
    public async generateResponse(question: string, history: string[]): Promise<string> {
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
                    content: msg
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
     * @returns Summary of the conversation
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
}
