import dotenv from 'dotenv';
import { BotConfig, AutoDriveConfig, ChromaConfig } from '../types/index';
import { ModelType, ModelConfig } from '../types/model';

// Load environment variables
dotenv.config();

export const botConfig: BotConfig = {
    token: process.env.BOT_TOKEN || '',
};

export const autoDriveConfig: AutoDriveConfig = {
    apiKey: process.env.AUTO_DRIVE_API_KEY || '',
};

export const modelConfig: {
    type: ModelType;
    config: ModelConfig;
} = {
    type: (process.env.MODEL_TYPE as ModelType) || 'openai',
    config: {
        apiKey: process.env.OPENAI_API_KEY || '',
        baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        model: process.env.OPENAI_MODEL || 'gpt-4',
    }
};

export const chromaConfig: ChromaConfig = {
    url: process.env.CHROMA_URL || 'http://localhost:8000',
};

// Validate configuration
if (!botConfig.token) {
    throw new Error('BOT_TOKEN is required');
}

if (!autoDriveConfig.apiKey) {
    throw new Error('AUTO_DRIVE_API_KEY is required');
}

if (!modelConfig.config.apiKey) {
    throw new Error('OPENAI_API_KEY is required');
}
