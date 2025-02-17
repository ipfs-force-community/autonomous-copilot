import { ChatMessage, ModelConfig } from '../../types/model';
import { BaseChatModel } from '../base/chat';

export class SecretAIChatModel extends BaseChatModel {
    private apiKey: string;
    private baseUrl: string;
    
    constructor(config: ModelConfig) {
        super(config);
        this.apiKey = config.apiKey;
        this.baseUrl = config.baseUrl || 'https://ai1.scrtlabs.com:21434';
        // todo: init base url and model with query result from secretai
    }
    
    async chat(messages: ChatMessage[]): Promise<string> {
        const response = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                messages: messages,
                model: 'deepseek-r1:70b',
                stream: false
            })
        });

        const data = await response.json();
        let content = data.message.content;
        // Remove the model's thinking process (enclosed in <think> tags) from the response to get only the final answer
        if (content.includes('<think>') && content.includes('</think>')) {
            const thinkPattern = /<think>[\s\S]*?<\/think>\s*/;
            content = content.replace(thinkPattern, '').trim();
        }
        
        return content;
    }
}