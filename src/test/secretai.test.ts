import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { SecretAIChatModel } from '../models/secretai/chat';
import { ChatMessage, ModelConfig } from '../types/model';

// Mock global fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof global.fetch>;
global.fetch = mockFetch;

describe('SecretAIChatModel', () => {
    let model: SecretAIChatModel;
    const mockConfig: ModelConfig = {
        apiKey: 'test-api-key',
        baseUrl: 'https://test.api.com',
        model: 'test-model'
    };

    beforeEach(() => {
        model = new SecretAIChatModel(mockConfig);
        mockFetch.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('chat', () => {
        const mockMessages: ChatMessage[] = [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Hello!' }
        ];

        it('should make a POST request with correct parameters', async () => {
            // Mock successful response
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: 'Hello! How can I help you?' } }]
                })
            } as Response);

            await model.chat(mockMessages);

            expect(mockFetch).toHaveBeenCalledWith(
                'https://test.api.com/api/chat',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer test-api-key'
                    },
                    body: JSON.stringify({
                        messages: mockMessages,
                        model: 'test-model'
                    })
                }
            );
        });

        it('should use default baseUrl if not provided', async () => {
            const modelWithoutBaseUrl = new SecretAIChatModel({
                apiKey: 'test-api-key'
            });

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: 'Response' } }]
                })
            } as Response);

            await modelWithoutBaseUrl.chat(mockMessages);

            expect(mockFetch).toHaveBeenCalledWith(
                'https://ai1.scrtlabs.com:21434/api/chat',
                expect.any(Object)
            );
        });

        it('should use default model if not provided', async () => {
            const modelWithoutModel = new SecretAIChatModel({
                apiKey: 'test-api-key',
                baseUrl: 'https://test.api.com'
            });

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: 'Response' } }]
                })
            } as Response);

            await modelWithoutModel.chat(mockMessages);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: JSON.stringify({
                        messages: mockMessages,
                        model: 'secretai-default'
                    })
                })
            );
        });

        it('should return response content on successful request', async () => {
            const expectedResponse = 'Hello! How can I help you?';
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: expectedResponse } }]
                })
            } as Response);

            const response = await model.chat(mockMessages);

            expect(response).toBe(expectedResponse);
        });

        it('should throw error on API error response', async () => {
            const errorResponse = { error: { message: 'API Error' } };
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: async () => errorResponse
            } as Response);

            await expect(model.chat(mockMessages)).rejects.toThrow(
                `SecretAI API error: 400 ${JSON.stringify(errorResponse)}`
            );
        });

        it('should throw error when response has no content', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: {} }]
                })
            } as Response);

            await expect(model.chat(mockMessages)).rejects.toThrow(
                'No response content from SecretAI'
            );
        });
    });
});
