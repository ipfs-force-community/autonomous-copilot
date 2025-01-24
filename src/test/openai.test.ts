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

    describe('Embeddings', () => {
        test('should generate embedding for text', async () => {
            const text = 'This is a test message';
            const embedding = await client.createEmbedding(text);
            
            // Check if embedding is an array of numbers
            expect(Array.isArray(embedding)).toBe(true);
            expect(embedding.length).toBeGreaterThan(0);
            embedding.forEach(value => {
                expect(typeof value).toBe('number');
            });
        }, 10000);


        test('should generate different embeddings for different texts', async () => {
            const text1 = 'This is the first message';
            const text2 = 'This is a completely different message';
            
            const embedding1 = await client.createEmbedding(text1);
            const embedding2 = await client.createEmbedding(text2);

            // Check if embeddings are different
            expect(embedding1).not.toEqual(embedding2);
        } , 10000);
    });
});
