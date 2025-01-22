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
