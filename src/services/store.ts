import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { Store, Cache, MessageCache } from '../types/index';
import { AutoDriveService } from './auto_drive';
import path from 'path';
import fs from 'fs';

// 定义数据库结构
type Data = {
    store: Store;
};

export class StoreService {
    private static instance: StoreService;
    private autoDriveService: AutoDriveService;
    private db: Low<Data>;
    private cache: Cache = {};
    private readonly MAX_CACHE_AGE = 60 * 60 * 1000; // 1 hour
    private readonly MAX_CACHE_SIZE = 100; // per user

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

        // If not in cache or expired, fetch from storage
        try {
            const content = await this.autoDriveService.downloadText(cid);
            if (content) {
                this.updateCache(userId, cid, content);
            }
            return content;
        } catch (error) {
            console.error('Error fetching message:', error);
            return null;
        }
    }

    public async addMessage(userId: number, text: string): Promise<string> {
        if (!this.db.data.store[userId]) {
            this.db.data.store[userId] = {
                messages: []
            };
        }
        try {
            const cid = await this.autoDriveService.uploadText(text, `${userId}/${Date.now()}.txt`);
            this.db.data.store[userId].messages.push(cid);
            
            // Add to cache immediately
            this.updateCache(userId, cid, text);
            await this.db.write();
            return cid;
        } catch (error) {
            console.error('Error storing message:', error);
            throw error;
        }
    }

    public async getMessage(userId: number, cid: string): Promise<string | null> {
        const userStore = this.db.data.store[userId];
        if (!userStore || !userStore.messages.includes(cid)) return null;

        return await this.getMessageWithCache(userId, cid);
    }

    public async getUserMessages(userId: number): Promise<string[]> {
        const userStore = this.db.data.store[userId];
        if (!userStore) return [];

        const messages: string[] = [];
        for (const cid of userStore.messages) {
            const content = await this.getMessageWithCache(userId, cid);
            if (content) {
                messages.push(content);
            }
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
