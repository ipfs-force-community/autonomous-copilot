import OpenAI from 'openai';
import { BaseEmbeddingModel } from '../base/embedding';
import { ModelConfig } from '../../types/model';

export class OpenAIEmbeddingModel extends BaseEmbeddingModel {
    private client: OpenAI;
    
    constructor(config: ModelConfig) {
        super(config);
        this.client = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseUrl,
        });
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
