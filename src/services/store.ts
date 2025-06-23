import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { Store, Cache, Note, NoteMeta, NoteMetaWithCid, UserId } from '../types/index';
import { PdpService } from './pdp';
import { ChromaService } from './chroma';
import path from 'path';
import fs from 'fs';
import { EmbeddingService } from './embedding';
import { modelConfig } from '../config';

// Data interface for lowdb
type Data = {
    store: Store;
};

/**
 * Executes promises in parallel with a maximum concurrency limit
 * @param concurrency Maximum number of promises to execute simultaneously
 * @param items Array of items to process
 * @param fn Function that returns a promise for each item
 * @returns Array of results in the same order as input items
 */
async function asyncPool<T, R>(
    concurrency: number,
    items: T[],
    fn: (item: T) => Promise<R>
): Promise<R[]> {
    const results: R[] = [];
    const executing = new Set<Promise<void>>();

    for (const [index, item] of items.entries()) {
        const promise = Promise.resolve().then(() => fn(item)).then(result => {
            results[index] = result;
        });

        executing.add(promise);
        const cleanup = () => executing.delete(promise);
        promise.then(cleanup).catch(cleanup);

        if (executing.size >= concurrency) {
            await Promise.race(executing);
        }
    }

    await Promise.all(executing);
    return results;
}

export class StoreService {
    private static instance: StoreService;
    private persistService: PdpService;
    private embeddingService: EmbeddingService;
    private chromaService: ChromaService;
    private db: Low<Data>;
    private cache: Cache = {};
    private readonly MAX_CACHE_AGE = 60 * 60 * 1000; // 1 hour
    private readonly MAX_CACHE_SIZE = 100; // per user
    private readonly MAX_CONCURRENT_REQUESTS = 15; // max concurrent requests for asyncPool

    /**
     * Private constructor to enforce singleton pattern
     * Initializes required services and ensures data directory exists
     */
    private constructor() {
        this.persistService = PdpService.getInstance();
        this.embeddingService = EmbeddingService.getInstance(modelConfig.embedding.type, modelConfig.embedding.config);
        this.chromaService = ChromaService.getInstance();

        // Ensure all data directories exist
        const dataDir = path.join(process.cwd(), 'data');
        const dbDir = path.join(dataDir, 'db');
        const cacheDir = path.join(dataDir, 'cache');

        [dataDir, dbDir, cacheDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });

        const dbPath = path.join(dbDir, 'db.json');
        const adapter = new JSONFile<Data>(dbPath);
        this.db = new Low(adapter, { store: {} });
        this.db.read().catch(error => {
            console.error('Error reading database:', error);
        });
    }

    /**
     * Returns the singleton instance of StoreService
     * @returns StoreService instance
     */
    public static getInstance(): StoreService {
        if (!StoreService.instance) {
            StoreService.instance = new StoreService();
        }
        return StoreService.instance;
    }

    /**
     * Initialize cache for a specific user if it doesn't exist
     * @param userId Telegram user ID
     */
    private initializeUserCache(userId: UserId): void {
        if (!this.cache[userId]) {
            this.cache[userId] = {
                notes: new Map(),
                lastUpdated: Date.now()
            };
        }
    }

    /**
     * Update the note cache for a specific user
     * @param userId Telegram user ID
     * @param cid Content identifier
     * @param note Note data containing content and optional title
     */
    private updateCache(userId: UserId, cid: string, note: Note): void {
        this.initializeUserCache(userId);
        const userCache = this.cache[userId].notes;

        // Check cache size and remove oldest if needed
        if (userCache.size >= this.MAX_CACHE_SIZE) {
            let oldestKey = null;
            let oldestTime = Date.now();

            for (const [key, value] of userCache.entries()) {
                if (value.lastAccessed < oldestTime) {
                    oldestTime = value.lastAccessed;
                    oldestKey = key;
                }
            }

            if (oldestKey) {
                userCache.delete(oldestKey);
            }
        }

        userCache.set(cid, {
            note,
            lastAccessed: Date.now()
        });
    }

    /**
     * Retrieve a note from cache or storage
     * @param userId Telegram user ID
     * @param cid Content identifier
     * @returns Note object if found, null otherwise
     */
    private async getNoteWithCache(userId: UserId, cid: string): Promise<Note | null> {
        const userCache = this.cache[userId]?.notes;
        const cached = userCache?.get(cid);

        if (cached && Date.now() - cached.lastAccessed < this.MAX_CACHE_AGE) {
            // Update last accessed time
            cached.lastAccessed = Date.now();
            return cached.note;
        }

        // If not in cache or expired, fetch from storage
        try {
            const data = await this.persistService.get(cid);
            if (data) {
                let note: Note = JSON.parse(data);
                this.updateCache(userId, cid, note);
                return note;
            }
            return null;
        } catch (error) {
            console.error('Error fetching note:', error);
            return null;
        }
    }

    /**
     * Add a new note to storage and cache
     * Also generates and stores embedding in Chroma
     * @param userId Telegram user ID
     * @param note Note data
     * @returns Content identifier if successful, null otherwise
     */
    public async addNote(userId: UserId, note: Note): Promise<string | null> {
        try {
            const cid = await this.persistService.put(JSON.stringify(note));
            if (!cid) return null;

            await this.db.read();
            if (!this.db.data!.store[userId]) {
                this.db.data!.store[userId] = {};
            }

            // Store NoteMeta
            const noteMeta: NoteMeta = {
                title: note.title,
                tags: note.tags,
                createdAt: note.createdAt
            };

            this.db.data!.store[userId][cid] = noteMeta;
            await this.db.write();

            // Generate and store embedding
            const embedding = await this.embeddingService.createEmbedding(note.content);
            await this.chromaService.addNote(userId, cid, embedding);

            this.updateCache(userId, cid, note);
            return cid;
        } catch (error) {
            console.error('Error adding note:', error);
            return null;
        }
    }

    /**
     * Retrieve a specific note by its content identifier
     * @param userId Telegram user ID
     * @param cid Content identifier
     * @returns Note object if found, null otherwise
     */
    public async getNote(userId: UserId, cid: string): Promise<Note | null> {
        return this.getNoteWithCache(userId, cid);
    }


    /**
     * Retrieve all notes for a specific user
     * Uses asyncPool to limit concurrent requests to the persistence layer
     * @param userId Telegram user ID
     * @returns Array of Note objects
     */
    public async getUserNotes(userId: UserId): Promise<Note[]> {
        await this.db.read();
        const userStore = this.db.data!.store[userId];
        if (!userStore) return [];

        const notes = await asyncPool(
            this.MAX_CONCURRENT_REQUESTS,
            Object.keys(userStore),
            cid => this.getNoteWithCache(userId, cid)
        );

        return notes.filter((note): note is Note => note !== null);
    }

    /**
     * Get all note metadata with a specific tag
     * @param userId Telegram user ID
     * @param tag Tag to filter by
     * @returns Array of NoteMeta objects with their corresponding cids
     */
    public async listUserNotesByTag(userId: UserId, tag: string): Promise<NoteMetaWithCid[]> {
        await this.db.read();
        const userStore = this.db.data!.store[userId];
        if (!userStore) return [];

        return Object.entries(userStore)
            .filter(([_, meta]) => meta.tags.includes(tag))
            .map(([cid, meta]) => ({
                ...meta,
                cid
            }));
    }

    /**
     * List all NoteMeta objects with their cids for a specific user
     * @param userId Telegram user ID
     * @returns Array of NoteMeta objects with their corresponding cids
     */
    public async listUserNotes(userId: UserId): Promise<NoteMetaWithCid[]> {
        await this.db.read();
        const userStore = this.db.data!.store[userId];
        if (!userStore) return [];

        return Object.entries(userStore).map(([cid, meta]) => ({
            ...meta,
            cid
        }));
    }

    /**
     * Search for similar notes using vector similarity
     * @param userId Telegram user ID
     * @param query Search query
     * @param limit Maximum number of results
     * @returns Array of similar notes with their scores
     */
    public async searchSimilarNotes(
        userId: UserId,
        query: string,
        limit: number = 5
    ): Promise<Array<Note & { score: number }>> {
        try {
            const queryEmbedding = await this.embeddingService.createEmbedding(query);
            const results = await this.chromaService.searchSimilar(userId, queryEmbedding, limit);

            const notes = await asyncPool(
                this.MAX_CONCURRENT_REQUESTS,
                results,
                result => this.getNoteWithCache(userId, result.cid)
            );

            return notes
                .map((note, index) => note && {
                    ...note,
                    score: results[index].score
                })
                .filter((note): note is Note & { score: number } => note !== null);
        } catch (error) {
            console.error('Error searching similar notes:', error);
            return [];
        }
    }

    /**
     * Clear the cache for a specific user or all users
     * @param userId Optional Telegram user ID
     */
    public clearCache(userId?: UserId): void {
        if (userId) {
            delete this.cache[userId];
        } else {
            this.cache = {};
        }
    }

    /**
     * Clear user data from both cache and vector database
     * @param userId Optional Telegram user ID
     */
    public async clearUserData(userId?: UserId): Promise<void> {
        if (userId) {
            this.clearCache(userId);
            await this.chromaService.deleteUserNotes(userId);
        } else {
            this.cache = {};
            // Clear all collections if needed
        }
    }

    /**
     * Get cache statistics for a specific user
     * @param userId Telegram user ID
     * @returns Cache statistics object or null if user not found
     */
    public getCacheStats(userId: UserId): { size: number; lastUpdated: number } | null {
        const userCache = this.cache[userId];
        if (!userCache) return null;

        return {
            size: userCache.notes.size,
            lastUpdated: userCache.lastUpdated
        };
    }
}
