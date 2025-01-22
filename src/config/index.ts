import dotenv from 'dotenv';
import { BotConfig, AutoDriveConfig } from '../types/index.ts';

// Load environment variables
dotenv.config();

export const botConfig: BotConfig = {
    token: process.env.BOT_TOKEN || '',
};

export const autoDriveConfig: AutoDriveConfig = {
    apiKey: process.env.AUTO_DRIVE_API_KEY || '',
};

// Validate configuration
if (!botConfig.token) {
    throw new Error('BOT_TOKEN is required');
}

if (!autoDriveConfig.apiKey) {
    throw new Error('AUTO_DRIVE_API_KEY is required');
}
