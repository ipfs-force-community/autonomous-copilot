import OpenAI from 'openai';
import { BaseChatModel } from '../base/chat';
import { ChatMessage, ModelConfig } from '../../types/model';

export class OpenAIChatModel extends BaseChatModel {
    private client: OpenAI;
    
    constructor(config: ModelConfig) {
        super(config);
        this.client = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseUrl,
        });
    }
    
    async chat(messages: ChatMessage[]): Promise<string> {
        const params: OpenAI.Chat.ChatCompletionCreateParams = {
            messages: messages,
            model: this.config.model || 'gpt-4o-mini',
        };

        try {
            const chatCompletion = await this.client.chat.completions.create(params);
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
}
