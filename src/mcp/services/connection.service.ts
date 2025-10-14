/**
 * Connection Service
 * Manages the active Plugwise client connection
 */

import { PlugwiseClient } from '../plugwise-client.js';
import { PlugwiseConfig } from '../plugwise-types.js';

/**
 * Connection Service
 * Maintains a single active connection to a Plugwise gateway
 */
export class ConnectionService {
    private client: PlugwiseClient | null = null;

    /**
     * Get the active client instance
     */
    getClient(): PlugwiseClient | null {
        return this.client;
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.client !== null && this.client.isConnected();
    }

    /**
     * Connect to a Plugwise gateway
     */
    async connect(config: PlugwiseConfig): Promise<PlugwiseClient> {
        this.client = new PlugwiseClient(config);
        await this.client.connect();
        return this.client;
    }

    /**
     * Disconnect from the current gateway
     */
    disconnect(): void {
        this.client = null;
    }

    /**
     * Ensure a connection exists, throw if not
     */
    ensureConnected(): PlugwiseClient {
        if (!this.client || !this.client.isConnected()) {
            throw new Error('Not connected. Use the connect tool first.');
        }
        return this.client;
    }
}
