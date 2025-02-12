import OpenAI from 'openai';
import { BaseSummarizeModel } from '../base/summarize';
import { ModelConfig, ChatMessage } from '../../types/model';

export class OpenAISummarizeModel extends BaseSummarizeModel {
    private client: OpenAI;
    
    constructor(config: ModelConfig) {
        super(config);
        this.client = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseUrl,
        });
    }
    
    async summarize(messages: ChatMessage[]): Promise<string> {
        const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            {
                role: 'system',
                content: 'Please provide a brief summary of the following conversation:'
            },
            ...messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }))
        ];

        try {
            const chatCompletion = await this.client.chat.completions.create({
                messages: openaiMessages,
                model: this.config.model || 'gpt-4',
            });
            
            const responseMessage = chatCompletion.choices[0]?.message.content;

            if (responseMessage) {
                return responseMessage;
            } else {
                throw new Error('No response from GPT.');
            }
        } catch (error) {
            throw new Error(`Error during summarization: ${error}`);
        }
    }
}
