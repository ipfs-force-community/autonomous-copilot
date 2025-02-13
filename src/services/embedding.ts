import { ModelType, ModelConfig } from '../types/model';
import { ModelFactory } from '../models/factory';

export class EmbeddingService {
    private static instance: EmbeddingService;
    private embeddingModel;

    private constructor(modelType: ModelType, config: ModelConfig) {
        this.embeddingModel = ModelFactory.createEmbeddingModel(modelType, config);
    }

    public static getInstance(modelType: ModelType, config: ModelConfig): EmbeddingService {
        if (!EmbeddingService.instance) {
            EmbeddingService.instance = new EmbeddingService(modelType, config);
        }
        return EmbeddingService.instance;
    }

    async createEmbedding(text: string): Promise<number[]> {
        return await this.embeddingModel.createEmbedding(text);
    }
}
