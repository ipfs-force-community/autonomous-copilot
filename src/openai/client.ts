import OpenAI from 'openai';
import { openAIConfig } from '../config/index';

export class OpenAIClient {
    private static instance: OpenAIClient;
    
    private client: OpenAI;
    private model: string;

    constructor(apiKey: string, projectId?: string, model: string = 'gpt-4o') {
        if (!apiKey) {
            throw new Error('API key is required');
        }

        this.client = new OpenAI({
            apiKey: apiKey,
            project: projectId,
        });

        this.model = model;
    }

    static getInstance(): OpenAIClient {
        if (!OpenAIClient.instance) {
            OpenAIClient.instance = new OpenAIClient(openAIConfig.apiKey, openAIConfig.projectId );
        }
        return OpenAIClient.instance;
    }

    async chat(messages:OpenAI.Chat.ChatCompletionMessageParam []): Promise<string> {
        const params: OpenAI.Chat.ChatCompletionCreateParams = {
            messages:  messages,
            model: this.model,
        };

        try {
            const chatCompletion: OpenAI.Chat.ChatCompletion = await this.client.chat.completions.create(params);
            const responseMessage = chatCompletion.choices[0]?.message.content;

            if (responseMessage) {
                return responseMessage;
            } else {
                throw new Error('No response from GPT.');
            }
        } catch (error) {
            throw new Error(`Error during chat completion: ${error}`);
        }
    }


    async getChatCompletion(message: string): Promise<string> {
        const params: OpenAI.Chat.ChatCompletionCreateParams = {
            messages: [{ role: 'user', content: message }],
            model: this.model,
        };

        try {
            const chatCompletion: OpenAI.Chat.ChatCompletion = await this.client.chat.completions.create(params);
            const responseMessage = chatCompletion.choices[0]?.message.content;

            if (responseMessage) {
                return responseMessage;
            } else {
                throw new Error('No response from GPT.');
            }
        } catch (error) {
            throw new Error(`Error during chat completion: ${error}`);
        }
    }

    async createEmbedding(text: string): Promise<number[]> {
        try {
            const response = await this.client.embeddings.create({
                model: "text-embedding-ada-002",
                input: text,
            });
            
            return response.data[0].embedding;
        } catch (error) {
            throw new Error(`Error creating embedding: ${error}`);
        }
    }
}

// // Usage example
// import 'dotenv/config'; // This loads variables from .env into process.env

// (async () => {
//   const apiKey = process.env['OPENAI_API_KEY'];
//   const projectId = process.env['OPENAI_PROJECT_ID'];

//   if (!apiKey) {
//     throw new Error('Environment variables OPENAI_API_KEY must be set');
//   }

//   const client = new OpenAIClient(apiKey, projectId);
//   try {
//     const response = await client.getChatCompletion('This is a test message');
//     console.log('GPT response:', response);
//   } catch (error) {
//     console.error(error);
//   }
// })();
