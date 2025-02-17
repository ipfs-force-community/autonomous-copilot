import { SecretAIChatModel } from '../models/secretai/chat';
import { ChatMessage } from '../types/model';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
    // Create SecretAI chat model instance
    const model = new SecretAIChatModel({
        apiKey: process.env.SECRETAI_API_KEY || '',
        baseUrl: 'https://ai1.scrtlabs.com:21434',
    });

    // Example messages
    const messages: ChatMessage[] = [
        {
            role: 'system',
            content: 'You are a helpful AI assistant.'
        },
        {
            role: 'user',
            content: 'What is the capital of France?'
        }
    ];

    try {
        console.log('Sending chat request to SecretAI...');
        console.log('Messages:', JSON.stringify(messages, null, 2));
        
        const response = await model.chat(messages);
        
        console.log('\nResponse from SecretAI:');
        console.log(response);
    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
    }
}

// Run the example
main();
