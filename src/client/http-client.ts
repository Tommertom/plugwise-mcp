/**
 * HTTP Client
 * Handles HTTP communication with Plugwise gateways
 */

import { ConnectionError, AuthenticationError } from '../types/plugwise-types.js';

export interface HttpClientConfig {
    host: string;
    password: string;
    port?: number;
    username?: string;
    timeout?: number;
}

const DEFAULT_PORT = 80;
const DEFAULT_USERNAME = 'smile';
const DEFAULT_TIMEOUT = 10000;

export class HttpClient {
    private config: Required<HttpClientConfig>;

    constructor(config: HttpClientConfig) {
        this.config = {
            host: config.host,
            password: config.password,
            port: config.port || DEFAULT_PORT,
            username: config.username || DEFAULT_USERNAME,
            timeout: config.timeout || DEFAULT_TIMEOUT
        };
    }

    /**
     * Make an HTTP request to the Plugwise gateway
     */
    async request(
        endpoint: string,
        method: 'GET' | 'PUT' | 'POST' | 'DELETE' = 'GET',
        data?: string
    ): Promise<string> {
        const url = `http://${this.config.host}:${this.config.port}${endpoint}`;
        const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.config.timeout);

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'text/xml',
                },
                body: data,
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (response.status === 401) {
                throw new AuthenticationError('Invalid credentials');
            }

            if (!response.ok) {
                throw new ConnectionError(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.text();
        } catch (error) {
            clearTimeout(timeout);
            if (error instanceof AuthenticationError || error instanceof ConnectionError) {
                throw error;
            }
            if ((error as Error).name === 'AbortError') {
                throw new ConnectionError('Request timeout');
            }
            throw new ConnectionError(`Failed to connect to Plugwise gateway: ${(error as Error).message}`);
        }
    }

    /**
     * Get the hostname being used
     */
    getHost(): string {
        return this.config.host;
    }

    /**
     * Get the full configuration
     */
    getConfig(): Required<HttpClientConfig> {
        return { ...this.config };
    }
}
