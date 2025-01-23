import { OpenAIClient } from '../openai/client';
import { openAIConfig } from '../config/index';
import OpenAI from 'openai';

describe('OpenAIClient', () => {
    let client: OpenAIClient;

    beforeEach(() => {
        client = new OpenAIClient(openAIConfig.apiKey, openAIConfig.projectId);
    });

    test('should initialize with API key and project ID', () => {
        expect(client).toBeInstanceOf(OpenAIClient);
    });

    test('should get chat completion', async () => {
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            { role: 'user', content: 'This is a test message' }
        ];
        const response = await client.chat(messages);
        expect(typeof response).toBe('string');
        expect(response.length).toBeGreaterThan(0);
    });

    test('should handle conversation history', async () => {
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            { role: 'user', content: 'What is the weather?' },
            { role: 'assistant', content: 'I cannot provide real-time weather information.' },
            { role: 'user', content: 'Will it rain tomorrow?' }
        ];
        const response = await client.chat(messages);
        expect(typeof response).toBe('string');
        expect(response.length).toBeGreaterThan(0);
    });

    test('should handle errors gracefully', async () => {
        const invalidClient = new OpenAIClient('invalid-key', 'invalid-project');
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            { role: 'user', content: 'test' }
        ];
        await expect(invalidClient.chat(messages)).rejects.toThrow();
    });
});
