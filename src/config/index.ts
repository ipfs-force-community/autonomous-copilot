import dotenv from 'dotenv';
import { BotConfig, AutoDriveConfig, ChromaConfig } from '../types/index';
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

export const botConfig: BotConfig = {
    token: process.env.BOT_TOKEN || '',
};

export const autoDriveConfig: AutoDriveConfig = {
    apiKey: process.env.AUTO_DRIVE_API_KEY || '',
};

export const modelConfig: ModuleConfig = {
    chat: {
        type: (process.env.CHAT_MODEL_TYPE as ModelType) || (process.env.MODEL_TYPE as ModelType) || 'openai',
        config: (() => {
            const modelType = (process.env.CHAT_MODEL_TYPE as ModelType) || (process.env.MODEL_TYPE as ModelType) || 'openai';
            return getModelConfig(modelType);
        })()
    },
    embedding: {
        type: (process.env.EMBEDDING_MODEL_TYPE as ModelType) || (process.env.MODEL_TYPE as ModelType) || 'openai',
        config: (() => {
            const modelType = (process.env.EMBEDDING_MODEL_TYPE as ModelType) || (process.env.MODEL_TYPE as ModelType) || 'openai';
            return getModelConfig(modelType);
        })()
    },
    summarize: {
        type: (process.env.SUMMARIZE_MODEL_TYPE as ModelType) || (process.env.MODEL_TYPE as ModelType) || 'openai',
        config: (() => {
            const modelType = (process.env.SUMMARIZE_MODEL_TYPE as ModelType) || (process.env.MODEL_TYPE as ModelType) || 'openai';
            return getModelConfig(modelType);
        })()
    }
};

export const chromaConfig: ChromaConfig = {
    url: process.env.CHROMA_URL || 'http://localhost:8000'
};

// Validate required configurations
if (!botConfig.token) {
    throw new Error('BOT_TOKEN is required');
}

if (!autoDriveConfig.apiKey) {
    throw new Error('AUTO_DRIVE_API_KEY is required');
}

Object.entries(modelConfig).forEach(([module, config]) => {
    if (!config.config.apiKey) {
        throw new Error(`API key for ${module} module (type: ${config.type}) is required`);
    }
});
