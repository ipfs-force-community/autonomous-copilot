import { ChromaClient, Collection } from 'chromadb';
import { chromaConfig } from '../config';
import { UserId } from "../types/index";

/**
 * Service for managing vector embeddings in Chroma database
 */
export class ChromaService {
    private static instance: ChromaService;
    private client: ChromaClient;
    private collections: Map<UserId, Collection> = new Map();

    /**
     * Private constructor to enforce singleton pattern
     * Initializes Chroma client with persistent storage
     */
    private constructor() {
        this.client = new ChromaClient({
            path: chromaConfig.url
        });
    }

    /**
     * Returns the singleton instance of ChromaService
     * @returns ChromaService instance
     */
    public static getInstance(): ChromaService {
        if (!ChromaService.instance) {
            ChromaService.instance = new ChromaService();
        }
        return ChromaService.instance;
    }

    /**
     * Get or create a collection for a specific user
     * @param userId Telegram user ID
     * @returns Chroma collection instance
     */
    public async getUserCollection(userId: UserId): Promise<Collection> {
        let collection = this.collections.get(userId);
        if (!collection) {
            collection = await this.client.getOrCreateCollection({
                name: `user_${userId}`,
                metadata: { userId }
            });
            this.collections.set(userId, collection);
        }
        return collection;
    }

    /**
     * Add a message to the vector database
     * @param userId Telegram user ID
     * @param cid Content identifier
     * @param embedding Vector embedding of the message
     */
    public async addNote(
        userId: UserId,
        cid: string,
        embedding: number[]
    ): Promise<void> {
        const collection = await this.getUserCollection(userId);
        await collection.add({
            ids: [cid],
            embeddings: [embedding]
        });
    }

    /**
     * Search for similar messages in the vector database
     * @param userId Telegram user ID
     * @param queryEmbedding Query vector embedding
     * @param limit Maximum number of results to return
     * @returns Array of matching messages with their metadata
     */
    public async searchSimilar(
        userId: UserId,
        queryEmbedding: number[],
        limit: number = 5
    ): Promise<Array<{
        cid: string;
        score: number;
    }>> {
        const collection = await this.getUserCollection(userId);
        const results = await collection.query({
            queryEmbeddings: [queryEmbedding],
            nResults: limit
        });

        // only concern about the first result for now
        const ids = results.ids?.[0] ?? [];
        const distances = results.distances?.[0] ?? [];
        const scores = distances.map(distance => 1 - distance);

        return ids.map((id, index) => ({
            cid: id,
            score: scores[index]
        }));
    }

    /**
     * Delete a message from the vector database
     * @param userId Telegram user ID
     * @param cid Content identifier to delete
     */
    public async deleteNote(userId: UserId, cid: string): Promise<void> {
        const collection = await this.getUserCollection(userId);
        await collection.delete({
            ids: [cid]
        });
    }

    /**
     * Delete all messages for a specific user
     * @param userId Telegram user ID
     */
    public async deleteUserNotes(userId: UserId): Promise<void> {
        const collection = await this.getUserCollection(userId);
        await collection.delete({
            where: {}
        });
    }

    /**
     * Delete a collection for a specific user
     * @param userId Telegram user ID
     */
    public async deleteCollection(userId: UserId): Promise<void> {
        const collectionName = `user_${userId}`;
        await this.client.deleteCollection({
            name: collectionName
        });
        this.collections.delete(userId);
    }
}
