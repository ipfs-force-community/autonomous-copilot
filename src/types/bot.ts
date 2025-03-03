import { UserId } from "./index";

export interface BotUser {
    id: UserId;
    username?: string;
}

export interface BotMessage {
    text: string;
    user: BotUser;
}

export interface BotContext {
    message: BotMessage;
    reply: (text: string) => Promise<void>;
    sendAction: (action: string) => Promise<void>;
    platform: string;
}
