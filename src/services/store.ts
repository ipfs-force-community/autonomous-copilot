import { Store } from '../types/index.ts';
import { AutoDriveService } from './auto_drive.ts';

const store: Store = {};

export class StoreService {
    private static instance: StoreService;
    private autoDriveService: AutoDriveService;

    private constructor() {
        this.autoDriveService = AutoDriveService.getInstance();
    }

    public static getInstance(): StoreService {
        if (!StoreService.instance) {
            StoreService.instance = new StoreService();
        }
        return StoreService.instance;
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
            return cid;
        } catch (error) {
            console.error('Error storing message:', error);
            throw new Error('Failed to store message');
        }
    }

    public async getMessage(userId: number, cid: string): Promise<string | null> {
        const userStore = store[userId];
        if (!userStore || !userStore.messages.includes(cid)) return null;

        try {
            return await this.autoDriveService.downloadText(cid);
        } catch (error) {
            console.error('Error retrieving message:', error);
            return null;
        }
    }

    public async getUserMessages(userId: number): Promise<string[]> {
        const userStore = store[userId];
        if (!userStore) return [];

        const messages: string[] = [];
        for (const cid of userStore.messages) {
            const message = await this.getMessage(userId, cid);
            if (message) messages.push(message);
        }

        return messages;
    }
}
