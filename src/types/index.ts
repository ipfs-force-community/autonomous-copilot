export interface MessageData {
    content: string;
    title?: string;
}

export interface MessageCache {
    content: string;
    title?: string;
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
    Notes: Note[]; // Array of CIDs
}
export interface Note {
    cid: string;
    title: string;
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

export interface ChromaConfig {
    url: string;
}