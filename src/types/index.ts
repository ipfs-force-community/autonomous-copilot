import OpenAI from "openai";

export interface NoteCache {
    note: Note;
    lastAccessed: number;
}

export interface UserCache {
    notes: Map<string, NoteCache>;
    lastUpdated: number;
}

export interface Cache {
    [userId: number]: UserCache;
}

export interface UserStore {
    [cid: string]: NoteMeta;
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

export interface NoteMeta {
    title: string;
    tags: string[];
    createdAt: string;
}

export interface NoteMetaWithCid extends NoteMeta {
    cid: string;
}

export interface Note extends NoteMeta {
    content: string;
}

export interface Tool {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: Record<string, any>;
        required: string[];
    };
    execute: (params: Record<string, any>) => Promise<string>;
}

export type ChatCompletionMessageParam = OpenAI.Chat.ChatCompletionMessageParam;

export interface ConversationHistory {
    [userId: number]: ChatCompletionMessageParam[];
}

export const TASK_COMPLETE_SIGNAL = "TASK_COMPLETE";