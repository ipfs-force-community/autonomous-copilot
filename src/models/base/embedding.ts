import { EmbeddingModel, ModelConfig } from '../../types/model';

export abstract class BaseEmbeddingModel implements EmbeddingModel {
    protected config: ModelConfig;
    
    constructor(config: ModelConfig) {
        this.config = config;
    }
    
    abstract createEmbedding(text: string): Promise<number[]>;
}
