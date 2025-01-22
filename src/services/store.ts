import { Store, Cache, MessageCache } from '../types/index.ts';
import { AutoDriveService } from './auto_drive.ts';

const store: Store = {};

export class StoreService {
    private static instance: StoreService;
    private autoDriveService: AutoDriveService;
    private cache: Cache = {};
    private readonly MAX_CACHE_AGE = 60 * 60 * 1000; // 1 hour
    private readonly MAX_CACHE_SIZE = 100; // per user

    private constructor() {
        this.autoDriveService = AutoDriveService.getInstance();
    }

    public static getInstance(): StoreService {
        if (!StoreService.instance) {
            StoreService.instance = new StoreService();
        }
        return StoreService.instance;
    }

    private initializeUserCache(userId: number): void {
        if (!this.cache[userId]) {
            this.cache[userId] = {
                messages: new Map(),
                lastUpdated: Date.now()
            };
        }
    }

    private updateCache(userId: number, cid: string, content: string): void {
        this.initializeUserCache(userId);
        const userCache = this.cache[userId].messages;
        
        // Check cache size and remove oldest if needed
        if (userCache.size >= this.MAX_CACHE_SIZE) {
            let oldestCid = null;
            let oldestTime = Infinity;
            
            for (const [msgCid, msg] of userCache.entries()) {
                if (msg.lastAccessed < oldestTime) {
                    oldestTime = msg.lastAccessed;
                    oldestCid = msgCid;
                }
            }
            
            if (oldestCid) {
                userCache.delete(oldestCid);
            }
        }

        // Add new cache entry
        userCache.set(cid, {
            content,
            lastAccessed: Date.now()
        });
    }

    private async getMessageWithCache(userId: number, cid: string): Promise<string | null> {
        const userCache = this.cache[userId]?.messages;
        const cached = userCache?.get(cid);

        if (cached && Date.now() - cached.lastAccessed < this.MAX_CACHE_AGE) {
            // Update last accessed time
            cached.lastAccessed = Date.now();
            return cached.content;
        }

        try {
            const content = await this.autoDriveService.downloadText(cid);
            if (content) {
                this.updateCache(userId, cid, content);
            }
            return content;
        } catch (error) {
            console.error('Error retrieving message from auto-drive:', error);
            return null;
        }
    }

    public async addMessage(userId: number, text: string): Promise<string> {
        if (!store[userId]) {
            store[userId] = {
                messages: []
            };
        }

        try {
            const cid = await this.autoDriveService.uploadText(text, `${userId}/${Date.now()}.txt`);
            store[userId].messages.push(cid);
            
            // Add to cache immediately
            this.updateCache(userId, cid, text);
            
            return cid;
        } catch (error) {
            console.error('Error storing message:', error);
            throw new Error('Failed to store message');
        }
    }

    public async getMessage(userId: number, cid: string): Promise<string | null> {
        const userStore = store[userId];
        if (!userStore || !userStore.messages.includes(cid)) return null;

        return await this.getMessageWithCache(userId, cid);
    }

    public async getUserMessages(userId: number): Promise<string[]> {
        const userStore = store[userId];
        if (!userStore) return [];

        const messages: string[] = [];
        for (const cid of userStore.messages) {
            const message = await this.getMessageWithCache(userId, cid);
            if (message) messages.push(message);
        }

        return messages;
    }

    // Optional: Add cache management methods
    public clearCache(userId?: number): void {
        if (userId) {
            delete this.cache[userId];
        } else {
            this.cache = {};
        }
    }

    public getCacheStats(userId: number): { size: number; lastUpdated: number } | null {
        const userCache = this.cache[userId];
        if (!userCache) return null;

        return {
            size: userCache.messages.size,
            lastUpdated: userCache.lastUpdated
        };
    }
}
