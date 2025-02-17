export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface ModelConfig {
    apiKey: string;
    baseUrl?: string;
    model?: string;
}

export type ModelType = 'openai' | 'anthropic' | 'google' | 'secretai';

export interface ModuleConfig {
    chat: {
        type: ModelType;
        config: ModelConfig;
    };
    embedding: {
        type: ModelType;
        config: ModelConfig;
    };
    summarize: {
        type: ModelType;
        config: ModelConfig;
    };
}

export interface ChatModel {
    chat(messages: ChatMessage[]): Promise<string>;
}

export interface SummarizeModel {
    summarize(messages: ChatMessage[]): Promise<string>;
}

export interface EmbeddingModel {
    createEmbedding(text: string): Promise<number[]>;
}
