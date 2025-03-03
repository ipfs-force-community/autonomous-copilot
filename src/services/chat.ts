import { ChatMessage, ModelType, ModelConfig } from '../types/model';
import { ModelFactory } from '../models/factory';

export class ChatService {
    private static instance: ChatService;
    private chatModel;

    private constructor(modelType: ModelType, config: ModelConfig) {
        this.chatModel = ModelFactory.createChatModel(modelType, config);
    }

    public static getInstance(modelType: ModelType, config: ModelConfig): ChatService {
        if (!ChatService.instance) {
            ChatService.instance = new ChatService(modelType, config);
        }
        return ChatService.instance;
    }

    async chat(messages: ChatMessage[]): Promise<string> {
        const reply = await this.chatModel.chat(messages);
        // Recover special characters that might be escaped in the model's response
        const formattedReply = reply
            .replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\]^_`{|}~])/g, '\\$1');
        return formattedReply;
    }
}
