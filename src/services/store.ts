import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { Store, Cache, MessageCache, MessageData } from '../types/index';
import { AutoDriveService } from './auto_drive';
import path from 'path';
import fs from 'fs';

// 定义数据库结构
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
    private autoDriveService: AutoDriveService;
    private db: Low<Data>;
    private cache: Cache = {};
    private readonly MAX_CACHE_AGE = 60 * 60 * 1000; // 1 hour
    private readonly MAX_CACHE_SIZE = 100; // per user
    private readonly MAX_CONCURRENT_REQUESTS = 15; // 最大并发请求数

    private constructor() {
        this.autoDriveService = AutoDriveService.getInstance();
        
        // 确保数据目录存在
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        const dbPath = path.join(dataDir, 'db.json');
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
    private initializeUserCache(userId: number): void {
        if (!this.cache[userId]) {
            this.cache[userId] = {
                messages: new Map(),
                lastUpdated: Date.now()
            };
        }
    }

    /**
     * Update the message cache for a specific user
     * @param userId Telegram user ID
     * @param cid Content identifier from auto drive
     * @param data Message data containing content and optional title
     */
    private updateCache(userId: number, cid: string, data: MessageData): void {
        this.initializeUserCache(userId);
        const userCache = this.cache[userId].messages;
        
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
            content: data.content,
            title: data.title,
            lastAccessed: Date.now()
        });
    }

    /**
     * Retrieve a message from cache or storage
     * @param userId Telegram user ID
     * @param cid Content identifier from auto drive
     * @returns MessageData object if found, null otherwise
     */
    private async getMessageWithCache(userId: number, cid: string): Promise<MessageData | null> {
        const userCache = this.cache[userId]?.messages;
        const cached = userCache?.get(cid);

        if (cached && Date.now() - cached.lastAccessed < this.MAX_CACHE_AGE) {
            // Update last accessed time
            cached.lastAccessed = Date.now();
            return {
                content: cached.content,
                title: cached.title
            };
        }

        // If not in cache or expired, fetch from storage
        try {
            const data = await this.autoDriveService.downloadText(cid);
            if (data) {
                let messageData: MessageData;
                try {
                    messageData = JSON.parse(data);
                } catch {
                    // If the data is not JSON, treat it as plain content
                    messageData = { content: data };
                }
                this.updateCache(userId, cid, messageData);
                return messageData;
            }
            return null;
        } catch (error) {
            console.error('Error fetching message:', error);
            return null;
        }
    }

    /**
     * Add a new message to storage and cache
     * @param userId Telegram user ID
     * @param content Message content
     * @param title Optional message title
     * @returns Content identifier if successful, null otherwise
     */
    public async addMessage(userId: number, content: string, title?: string): Promise<string | null> {
        try {
            const messageData: MessageData = { content, title };
            
            let filename = title || `${Date.now()}`;
            const cid = await this.autoDriveService.uploadText(JSON.stringify(messageData) , `${filename}.json`);
            if (!cid) return null;

            await this.db.read();
            if (!this.db.data!.store[userId]) {
                this.db.data!.store[userId] = { messages: [] };
            }
            this.db.data!.store[userId].messages.push(cid);
            await this.db.write();

            this.updateCache(userId, cid, messageData);
            return cid;
        } catch (error) {
            console.error('Error adding message:', error);
            return null;
        }
    }

    /**
     * Retrieve a specific message by its content identifier
     * @param userId Telegram user ID
     * @param cid Content identifier from auto drive
     * @returns MessageData object if found, null otherwise
     */
    public async getMessage(userId: number, cid: string): Promise<MessageData | null> {
        return this.getMessageWithCache(userId, cid);
    }

    /**
     * Retrieve all messages for a specific user
     * Uses asyncPool to limit concurrent requests to auto drive
     * @param userId Telegram user ID
     * @returns Array of MessageData objects
     */
    public async getUserMessages(userId: number): Promise<MessageData[]> {
        await this.db.read();
        const userStore = this.db.data!.store[userId];
        if (!userStore) return [];

        const messages = await asyncPool(
            this.MAX_CONCURRENT_REQUESTS,
            userStore.messages,
            cid => this.getMessageWithCache(userId, cid)
        );

         return messages.filter((msg): msg is MessageData => msg !== null);
    }

    /**
     * Clear the cache for a specific user or all users
     * @param userId Optional Telegram user ID
     */
    public clearCache(userId?: number): void {
        if (userId) {
            delete this.cache[userId];
        } else {
            this.cache = {};
        }
    }

    /**
     * Get cache statistics for a specific user
     * @param userId Telegram user ID
     * @returns Cache statistics object or null if user not found
     */
    public getCacheStats(userId: number): { size: number; lastUpdated: number } | null {
        const userCache = this.cache[userId];
        if (!userCache) return null;

        return {
            size: userCache.messages.size,
            lastUpdated: userCache.lastUpdated
        };
    }
}
