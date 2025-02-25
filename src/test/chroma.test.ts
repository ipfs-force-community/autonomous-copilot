import { ChromaService } from '../services/chroma';
import { EmbeddingService } from '../services/embedding';
import { UserId } from '../types/index';
import { modelConfig } from '../config';


describe('ChromaService', () => {
    let chromaService: ChromaService;
    let embeddingService: EmbeddingService;
    const userId: UserId = "12345";
    const testMessages = [
        { content: 'Hello world', cid: '1' },
        { content: 'This is a test message', cid: '2' },
        { content: 'Another test message about world', cid: '3' },
    ];

    let testEmbeddings: number[][] = [];

    beforeAll(async () => {
        chromaService = ChromaService.getInstance();
        embeddingService = EmbeddingService.getInstance(modelConfig.embedding.type, modelConfig.embedding.config);
        // Generate all embeddings before tests
        for (const msg of testMessages) {
            const embedding = await embeddingService.createEmbedding(msg.content);
            testEmbeddings.push(embedding);
        }
    }, 15000);

    describe('Collection Management', () => {
        it('should create a new collection for user', async () => {
            const collection = await chromaService.getUserCollection(userId);
            expect(collection).toBeDefined();
        });

        it('should reuse existing collection for same user', async () => {
            const collection1 = await chromaService.getUserCollection(userId);
            const collection2 = await chromaService.getUserCollection(userId);
            expect(collection1).toBe(collection2);
        });
    });

    describe('Vector Operations', () => {
        beforeEach(async () => {
            // Clean up any existing vectors
            await chromaService.deleteCollection(userId);
        });

        it('should add vectors to collection', async () => {
            // Add all test messages
            for (let i = 0; i < testMessages.length; i++) {
                await chromaService.addNote(
                    userId,
                    testMessages[i].cid,
                    testEmbeddings[i]
                );
            }

            // Verify vectors were added
            const collection = await chromaService.getUserCollection(userId);
            const count = await collection.count();
            expect(count).toBe(testMessages.length);
        });

        it('should find similar vectors', async () => {
            // Add all test messages
            for (let i = 0; i < testMessages.length; i++) {
                await chromaService.addNote(
                    userId,
                    testMessages[i].cid,
                    testEmbeddings[i]
                );
            }

            // Search for similar messages to "world"
            const queryEmbedding = await embeddingService.createEmbedding('world');
            const results = await chromaService.searchSimilar(userId, queryEmbedding, 2);

            // Verify results
            expect(results).toHaveLength(2);
            expect(results[0]).toHaveProperty('cid');
            expect(results[0]).toHaveProperty('score');

            // First result should be most similar (lowest distance)
            expect(results[0].score).toBeLessThanOrEqual(results[1].score);
        });
    });

    describe('Error Handling', () => {
        it('should handle non-existent collection gracefully', async () => {
            const nonExistentUserId: UserId = "99999";
            const queryEmbedding = await embeddingService.createEmbedding('test');
            const results = await chromaService.searchSimilar(nonExistentUserId, queryEmbedding);
            expect(results).toEqual([]);
        });

        it('should handle empty collection search', async () => {
            await chromaService.deleteCollection(userId);

            const queryEmbedding = await embeddingService.createEmbedding('test');
            const results = await chromaService.searchSimilar(userId, queryEmbedding);
            expect(results).toEqual([]);
        });
    });
});
