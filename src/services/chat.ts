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
        return unescape(reply);
    }
}

function unescape(str: string): string {
    return str.replace(/\\([n"!])/g, (match, p1) => {

        // Map of special escape sequences
        const escapeMap : {[key: string]: string} = {
            'n': '\n',  // Convert \n to actual newline
            '"': '"',   // Convert \" to "
            '!': '!'    // Convert \! to !
        };
        
        return escapeMap[p1] || p1;
    });
}