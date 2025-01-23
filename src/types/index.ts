export interface MessageCache {
    content: string;
    lastAccessed: number;
}

export interface UserCache {
    messages: Map<string, MessageCache>;
    lastUpdated: number;
}

export interface Cache {
    [userId: number]: UserCache;
}

export interface UserStore {
    messages: string[]; // Array of CIDs
}

export interface Store {
    [userId: number]: UserStore;
}

export interface BotConfig {
    token: string;
}

export interface AutoDriveConfig {
    apiKey: string;
}

export interface OpenAIConfig {
    apiKey: string;
    baseUrl: string;
    projectId: string;
}