import dotenv from 'dotenv';
import { BotConfig, AutoDriveConfig, OpenAIConfig } from '../types/index';

// Load environment variables
dotenv.config();

export const botConfig: BotConfig = {
    token: process.env.BOT_TOKEN || '',
};

export const autoDriveConfig: AutoDriveConfig = {
    apiKey: process.env.AUTO_DRIVE_API_KEY || '',
};

export const openAIConfig: OpenAIConfig = {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    projectId: process.env.OPENAI_PROJECT_ID || '',
};

// Validate configuration
if (!botConfig.token) {
    throw new Error('BOT_TOKEN is required');
}

if (!autoDriveConfig.apiKey) {
    throw new Error('AUTO_DRIVE_API_KEY is required');
}

if (!openAIConfig.apiKey) {
    throw new Error('OPENAI_API_KEY is required');
}

if (!openAIConfig.projectId) {
    throw new Error('OPENAI_PROJECT_ID is required');
}
