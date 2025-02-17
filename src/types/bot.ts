export interface BotUser {
    id: number;
    username?: string;
}

export interface BotMessage {
    text: string;
    user: BotUser;
}

export interface BotContext {
    message: BotMessage;
    reply: (text: string) => Promise<void>;
    platform: string;
}
