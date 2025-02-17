import { ModelType, ModelConfig, ChatModel, SummarizeModel, EmbeddingModel } from '../types/model';
import { OpenAIChatModel } from './openai/chat';
import { OpenAISummarizeModel } from './openai/summarize';
import { OpenAIEmbeddingModel } from './openai/embedding';
import { SecretAIChatModel } from './secretai/chat';

export class ModelFactory {
    static createChatModel(type: ModelType, config: ModelConfig): ChatModel {
        switch (type) {
            case 'openai':
                return new OpenAIChatModel(config);
            case 'secretai':
                return new SecretAIChatModel(config);
            case 'anthropic':
            case 'google':
                throw new Error(`Model type ${type} not implemented yet`);
            default:
                throw new Error(`Unsupported model type: ${type}`);
        }
    }

    static createSummarizeModel(type: ModelType, config: ModelConfig): SummarizeModel {
        switch (type) {
            case 'openai':
                return new OpenAISummarizeModel(config);
            case 'secretai':
                throw new Error(`Model type ${type} not implemented yet`);
            case 'anthropic':
            case 'google':
                throw new Error(`Model type ${type} not implemented yet`);
            default:
                throw new Error(`Unsupported model type: ${type}`);
        }
    }

    static createEmbeddingModel(type: ModelType, config: ModelConfig): EmbeddingModel {
        switch (type) {
            case 'openai':
                return new OpenAIEmbeddingModel(config);
            case 'secretai':
                throw new Error(`Model type ${type} not implemented yet`);
            case 'anthropic':
            case 'google':
                throw new Error(`Model type ${type} not implemented yet`);
            default:
                throw new Error(`Unsupported model type: ${type}`);
        }
    }
}
