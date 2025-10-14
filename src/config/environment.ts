/**
 * Environment Configuration Module
 * Handles loading and managing environment variables
 */

import { config } from 'dotenv';

// Load environment variables
config();

export interface ServerConfig {
    port: number;
    host: string;
}

export interface HubCredentials {
    password: string;
    ip?: string;
}

/**
 * Get server configuration from environment
 */
export function getServerConfig(): ServerConfig {
    return {
        port: parseInt(process.env.PORT || '3000'),
        host: process.env.HOST || 'localhost'
    };
}

/**
 * Load all HUB credentials from environment variables
 * Reads HUBx and HUBxIP variables (where x is 1-10)
 */
export function loadHubCredentials(): Map<number, HubCredentials> {
    const credentials = new Map<number, HubCredentials>();

    for (let i = 1; i <= 10; i++) {
        const password = process.env[`HUB${i}`];
        const ip = process.env[`HUB${i}IP`];

        if (password) {
            credentials.set(i, { password, ip });
        }
    }

    return credentials;
}

/**
 * Get a specific hub credential by index
 */
export function getHubCredential(index: number): HubCredentials | undefined {
    const password = process.env[`HUB${index}`];
    const ip = process.env[`HUB${index}IP`];

    if (password) {
        return { password, ip };
    }

    return undefined;
}
