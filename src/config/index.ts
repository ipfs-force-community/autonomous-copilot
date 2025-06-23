import dotenv from 'dotenv';
import { BotConfig, PdpConfig as PdpConfig, ChromaConfig } from '../types/index';
import { ModelConfig, ModelType, ModuleConfig } from '../types/model';

// Load environment variables
dotenv.config();

function getModelConfig(modelType: ModelType): ModelConfig {
    switch (modelType) {
        case 'openai':
            return {
                apiKey: process.env.OPENAI_API_KEY || '',
                baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
                model: process.env.OPENAI_MODEL || 'gpt-4',
            };
        case 'anthropic':
            return {
                apiKey: process.env.ANTHROPIC_API_KEY || '',
                baseUrl: process.env.ANTHROPIC_BASE_URL,
                model: process.env.ANTHROPIC_MODEL || 'claude-2',
            };
        case 'google':
            return {
                apiKey: process.env.GOOGLE_API_KEY || '',
                model: process.env.GOOGLE_MODEL || 'gemini-pro',
            };
        case 'secretai':
            return {
                apiKey: process.env.SECRETAI_API_KEY || '',
                baseUrl: process.env.SECRETAI_BASE_URL || 'https://ai1.scrtlabs.com:21434',
                model: process.env.SECRETAI_MODEL || 'deepseek-r1:70b',
            };
        default:
            throw new Error(`Unsupported model type: ${modelType}`);
    }
}

export const botConfig = {
    telegram: process.env.TELEGRAM_BOT_TOKEN ? {
        token: process.env.TELEGRAM_BOT_TOKEN
    } : undefined,
    discord: process.env.DISCORD_BOT_TOKEN ? {
        token: process.env.DISCORD_BOT_TOKEN
    } : undefined
} as BotConfig;

// Validate required configurations
if (!botConfig.telegram && !botConfig.discord) {
    throw new Error('At least one bot token must be provided (TELEGRAM_BOT_TOKEN or DISCORD_BOT_TOKEN)');
}

export const pdpConfig: PdpConfig = {
    url: process.env.PDP_URL || 'https://caliberation-pdp.infrafolio.com',
    token: process.env.PDP_TOKEN || undefined,
};

export const modelConfig: ModuleConfig = {
    chat: {
        type: (process.env.CHAT_MODEL_TYPE as ModelType) || (process.env.MODEL_TYPE as ModelType) || 'openai',
        config: getModelConfig((process.env.CHAT_MODEL_TYPE as ModelType) || (process.env.MODEL_TYPE as ModelType) || 'openai')
    },
    embedding: {
        type: (process.env.EMBEDDING_MODEL_TYPE as ModelType) || (process.env.MODEL_TYPE as ModelType) || 'openai',
        config: getModelConfig((process.env.EMBEDDING_MODEL_TYPE as ModelType) || (process.env.MODEL_TYPE as ModelType) || 'openai')
    },
    summarize: {
        type: (process.env.SUMMARIZE_MODEL_TYPE as ModelType) || (process.env.MODEL_TYPE as ModelType) || 'openai',
        config: getModelConfig((process.env.SUMMARIZE_MODEL_TYPE as ModelType) || (process.env.MODEL_TYPE as ModelType) || 'openai')
    }
};

export const chromaConfig: ChromaConfig = {
    url: process.env.CHROMA_URL || 'http://localhost:8000'
};

if (!pdpConfig.token) {
    throw new Error('PDP_TOKEN is required');
}

Object.entries(modelConfig).forEach(([module, config]) => {
    if (!config.config.apiKey) {
        throw new Error(`API key for ${module} module (type: ${config.type}) is required`);
    }
});
