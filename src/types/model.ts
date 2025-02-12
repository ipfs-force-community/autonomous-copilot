export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface ModelConfig {
    apiKey: string;
    baseUrl?: string;
    model?: string;
}

export type ModelType = 'openai' | 'anthropic' | 'google';

export interface ChatModel {
    chat(messages: ChatMessage[]): Promise<string>;
}

export interface SummarizeModel {
    summarize(messages: ChatMessage[]): Promise<string>;
}

export interface EmbeddingModel {
    createEmbedding(text: string): Promise<number[]>;
}
