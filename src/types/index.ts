import OpenAI from "openai";
import { ChatMessage } from "./model";

export interface NoteCache {
    note: Note;
    lastAccessed: number;
}

export interface UserCache {
    notes: Map<string, NoteCache>;
    lastUpdated: number;
}

export type UserId = string;

export interface Cache {
    [userId: UserId]: UserCache;
}

export interface UserStore {
    [cid: string]: NoteMeta;
}

export interface Store {
    [userId: UserId]: UserStore;
}

export interface BotConfig {
    telegram?: {
        token: string;
    };
    discord?: {
        token: string;
    };
}

export interface PdpConfig {
    url: string;
    token?: string;
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

export const TASK_COMPLETE_SIGNAL = "TASK_COMPLETE";
