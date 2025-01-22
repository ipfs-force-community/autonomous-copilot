/// store put data into auto-drive and vec-database

import { uploadFileFromFilepath, createAutoDriveApi } from '@autonomys/auto-drive'

interface UserStore {
    messages: string[];
}

interface Store {
    [userId: number]: UserStore;
}

const store: Store = {};

export function addMessage(userId: number, text: string): string {
    if (!store[userId]) {
        store[userId] = {
            messages: []
        };
    }
    
    store[userId].messages.push(text);
    return text;
}

export function getUserMessages(userId: number): string[] {
    return store[userId]?.messages || [];
}

export function clearUserMessages(userId: number): void {
    if (store[userId]) {
        store[userId].messages = [];
    }
}

async function test_upload() {
    const api = createAutoDriveApi({ apiKey: 'ce7ccac700d14ff7b45d526939a76b04' })
    const filePath = '/tmp/hello'
    const options = {
        onProgress: (progress: number) => {
            console.log(`The upload is completed is ${progress}% completed`)
        }
    }

    const cid = await uploadFileFromFilepath(api, filePath, options).then((cid) => {
        console.log(`The file is uploaded and its cid is ${cid}`)
        return cid
    })

    console.log(`The file is uploaded and its cid is ${cid}`)
}
