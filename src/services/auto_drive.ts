import { createAutoDriveApi, uploadFile, downloadFile } from '@autonomys/auto-drive';
import { autoDriveConfig } from '../config/index';

/**
 * Service for interacting with auto-drive storage system
 * Handles file upload and download operations
 */
export class AutoDriveService {
    private static instance: AutoDriveService;
    private api;

    /**
     * Private constructor to enforce singleton pattern
     * Initializes the auto-drive API with configured API key
     */
    private constructor() {
        this.api = createAutoDriveApi({ apiKey: autoDriveConfig.apiKey });
    }

    /**
     * Returns the singleton instance of AutoDriveService
     * @returns AutoDriveService instance
     */
    public static getInstance(): AutoDriveService {
        if (!AutoDriveService.instance) {
            AutoDriveService.instance = new AutoDriveService();
        }
        return AutoDriveService.instance;
    }

    /**
     * Upload text content as a file to auto-drive
     * @param content Text content to upload
     * @param path Virtual file path in auto-drive
     * @returns CID of the uploaded file
     * @throws Error if upload fails
     */
    public async uploadText(content: string, path: string): Promise<string> {
        const buffer = Buffer.from(content, 'utf-8');
        const file = {
            read: async function* () {
                yield buffer;
            },
            name: path.split('/').pop() || 'text.txt',
            mimeType: 'text/plain',
            size: buffer.length,
            path
        };

        try {
            const cid = await uploadFile(this.api, file, {
                compression: true,
                onProgress: (progress: number) => {
                    console.log(`Upload progress: ${progress}%`);
                }
            });
            return cid;
        } catch (error) {
            console.error('Error uploading text:', error);
            throw new Error('Failed to upload text to auto-drive');
        }
    }

    /**
     * Download text content from auto-drive using CID
     * @param cid Content identifier
     * @returns Text content of the file
     * @throws Error if download fails or content cannot be decoded
     */
    public async downloadText(cid: string): Promise<string> {
        try {
            const stream = await downloadFile(this.api, cid);
            let file = Buffer.alloc(0);

            for await (const chunk of stream) {
                file = Buffer.concat([file, chunk]);
            }

            return file.toString('utf-8');
        } catch (error) {
            console.error('Error downloading text:', error);
            throw new Error('Failed to download text from auto-drive');
        }
    }
}

/**
 * Example function demonstrating text upload to auto-drive
 */
async function example_upload() {
    const autoDriveService = AutoDriveService.getInstance();
    const cid = await autoDriveService.uploadText("Hello, World!", "example.txt");
    console.log(`The file is uploaded and its cid is ${cid}`);
}

/**
 * Example function demonstrating text download from auto-drive
 */
async function example_download() {
    const autoDriveService = AutoDriveService.getInstance();
    const cid = '..'
    const text = await autoDriveService.downloadText(cid);
    console.log('Text downloaded successfully:', text);
}
