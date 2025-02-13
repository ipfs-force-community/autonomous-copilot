import { ModelType, ModelConfig, ChatMessage } from '../types/model';
import { ModelFactory } from '../models/factory';

export class SummarizeService {
    private static instance: SummarizeService;
    private summarizeModel;

    private constructor(modelType: ModelType, config: ModelConfig) {
        this.summarizeModel = ModelFactory.createSummarizeModel(modelType, config);
    }

    public static getInstance(modelType: ModelType, config: ModelConfig): SummarizeService {
        if (!SummarizeService.instance) {
            SummarizeService.instance = new SummarizeService(modelType, config);
        }
        return SummarizeService.instance;
    }

    async summarize(messages: ChatMessage[]): Promise<string> {
        return await this.summarizeModel.summarize(messages);
    }
}
