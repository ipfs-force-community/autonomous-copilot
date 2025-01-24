import { ChromaClient, Collection  } from 'chromadb';
import path from 'path';
import fs from 'fs';
import { MessageData } from '../types';
import { chromaConfig } from '../config';

/**
 * Service for managing vector embeddings in Chroma database
 */
export class ChromaService {
    private static instance: ChromaService;
    private client: ChromaClient;
    private collections: Map<number, Collection> = new Map();

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
    public async getUserCollection(userId: number): Promise<Collection> {
        let collection = this.collections.get(userId);
        if (!collection) {
            collection = await this.client.getOrCreateCollection({
                name: `user_${userId}`,
                metadata: { userId: userId.toString() }
            });
            this.collections.set(userId, collection);
        }
        return collection;
    }

    /**
     * Add a message to the vector database
     * @param userId Telegram user ID
     * @param cid Content identifier from auto-drive
     * @param embedding Vector embedding of the message
     */
    public async addMessage(
        userId: number,
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
        userId: number,
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

        if (!results.ids.length) return [];

        return results.ids[0].map((id, index) => ({
            cid: id,
            score: results.distances?.[0]?.[index] ?? 0
        }));
    }

    /**
     * Delete a message from the vector database
     * @param userId Telegram user ID
     * @param cid Content identifier to delete
     */
    public async deleteMessage(userId: number, cid: string): Promise<void> {
        const collection = await this.getUserCollection(userId);
        await collection.delete({
            ids: [cid]
        });
    }

    /**
     * Delete all messages for a specific user
     * @param userId Telegram user ID
     */
    public async deleteUserMessages(userId: number): Promise<void> {
        const collection = await this.getUserCollection(userId);
        await collection.delete({
            where: {}
        });
    }

    /**
     * Delete a collection for a specific user
     * @param userId Telegram user ID
     */
    public async deleteCollection(userId: number): Promise<void> {
        const collectionName = `user_${userId}`;
        await this.client.deleteCollection({
            name: collectionName
        });
        this.collections.delete(userId);
    }
}
