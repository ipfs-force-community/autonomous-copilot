import axios from 'axios';
import * as crypto from 'crypto';
import { pdpConfig } from '../config';
import { Logger } from './tools';

const logger = new Logger('PDPService');

/**
 * Service for interacting with PDP (Piece Data Protocol) storage system
 * Handles data upload and retrieval operations
 */
export class PdpService {
    private static instance: PdpService;
    private url: string;
    private token: string;
    private delayMs: number = 2000; // Default delay before retrieval requests
    private maxRetries: number = 3; // Default max retries for retrieval

    /**
     * Private constructor to enforce singleton pattern
     * Initializes the PDP service with configured API key and base URL
     */
    private constructor(config: { token: string; url: string; }) {
        this.token = config.token;
        this.url = config.url;
    }

    /**
     * Returns the singleton instance of PdpService
     * @param config Configuration object with API key and base URL (only used on first instantiation)
     * @returns PdpService instance
     */
    public static getInstance(): PdpService {
        if (!PdpService.instance) {
            const config = pdpConfig;
            if (!config.token) {
                throw new Error('PDP token is need');
            }
            PdpService.instance = new PdpService({
                token: config.token,
                url: config.url,
            });
        }
        return PdpService.instance;
    }

    /**
     * Upload data to the PDP service
     * @param data String content to upload
     * @returns CID of the uploaded data if successful, null otherwise
     */
    public async put(data: string): Promise<string | null> {
        try {
            // Convert string to buffer for SHA-256 calculation
            const buffer = Buffer.from(data, 'utf-8');
            const size = buffer.length;
            const hash = crypto.createHash('sha256').update(buffer).digest('hex');

            logger.info(`Initiating PDP upload for data of size ${size} bytes`);

            // Step 1: Initiate upload
            const initiateResponse = await axios({
                method: 'post',
                url: `${this.url}/pdp/piece`,
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                data: {
                    check: {
                        name: 'sha2-256',
                        hash: hash,
                        size: size
                    }
                }
            });

            // If piece already exists
            if (initiateResponse.status === 200 && initiateResponse.data.pieceCID) {
                logger.info(`Data already exists in PDP storage with CID: ${initiateResponse.data.pieceCID}`);
                return initiateResponse.data.pieceCID;
            }

            // If upload is required
            if (initiateResponse.status === 201) {
                const uploadUrl = initiateResponse.headers.location;
                if (!uploadUrl) {
                    throw new Error('PDP server did not return upload URL');
                }

                // Step 2: Upload data
                const uploadResponse = await axios({
                    method: 'put',
                    url: `${this.url}${uploadUrl}`,
                    headers: {
                        'Content-Type': 'application/octet-stream',
                        'Content-Length': size.toString()
                    },
                    data: buffer
                });

                if (uploadResponse.status === 204) {
                    // Step 3: Get the piece CID after successful upload
                    return this.getPieceCID(size, hash);
                } else {
                    throw new Error(`Unexpected upload response status: ${uploadResponse.status}`);
                }
            }

            throw new Error(`Unexpected initiate response status: ${initiateResponse.status}`);
        } catch (error) {
            logger.error('Error uploading data to PDP:', error);
            return null;
        }
    }

    /**
     * Retrieve data from the PDP service by its CID
     * @param cid Content identifier
     * @returns Retrieved data string if successful, null otherwise
     */
    public async get(cid: string): Promise<string | null> {
        try {
            logger.info(`Retrieving data from PDP with CID: ${cid}`);

            const response = await axios({
                method: 'get',
                url: `${this.url}/piece/${cid}`,
                responseType: 'arraybuffer'  // Use arraybuffer to handle binary data
            });

            if (response.status === 200) {
                // Convert binary data to string
                return Buffer.from(response.data).toString('utf-8');
            }

            throw new Error(`Failed to retrieve data: Unexpected response status ${response.status}`);
        } catch (error) {
            logger.error('Error retrieving data from PDP:', error);
            return null;
        }
    }

    /**
     * Helper method to delay execution
     * @param ms Milliseconds to delay
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Retrieve the CID for a piece by its hash and size
     * Includes delay and retry logic
     */
    private async getPieceCID(
        size: number,
        hash: string,
        retries: number = this.maxRetries
    ): Promise<string> {
        // Add delay before checking
        await this.delay(this.delayMs);

        try {
            const response = await axios({
                method: 'get',
                url: `${this.url}/pdp/piece?size=${size}&name=sha2-256&hash=${hash}`,
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.status === 200) {
                if (response.data && response.data.piece_cid) {
                    logger.info(`Successfully retrieved piece CID: ${response.data.piece_cid}`);
                    return response.data.piece_cid;
                } else {

                    throw new Error('Failed to get piece CID: Unexpected response format' +
                        ` - Expected piece_cid in response, got: ${JSON.stringify(response.data)}`);
                }
            }
            throw new Error(`Failed to get piece CID: Unexpected response status ${response.status}`);

        } catch (error) {
            if (retries > 0) {
                logger.warn(`Failed to get piece CID, retrying... (${retries} attempts left)`);
                await this.delay(this.delayMs);
                return this.getPieceCID(size, hash, retries - 1);
            }

            logger.error('Failed to get piece CID after multiple attempts');
            throw error;
        }
    }

    /**
     * Set the delay time for CID retrieval attempts
     * @param ms Milliseconds to delay
     */
    public setRetrievalDelay(ms: number): void {
        this.delayMs = ms;
    }

    /**
     * Set the maximum number of retry attempts
     * @param retries Number of retry attempts
     */
    public setMaxRetries(retries: number): void {
        this.maxRetries = retries;
    }
}
