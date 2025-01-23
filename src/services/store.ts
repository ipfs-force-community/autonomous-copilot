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

    public async getMessage(userId: number, cid: string): Promise<MessageData | null> {
        return this.getMessageWithCache(userId, cid);
    }

    public async getUserMessages(userId: number): Promise<MessageData[]> {
        await this.db.read();
        const userStore = this.db.data!.store[userId];
        if (!userStore) return [];

        const messages = await Promise.all(
            userStore.messages.map(cid => this.getMessageWithCache(userId, cid))
        );

        return messages.filter((msg): msg is MessageData => msg !== null);
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
