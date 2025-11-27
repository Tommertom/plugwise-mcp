/**
 * Tool Helper Utilities
 * Common functions for MCP tool responses and error handling
 */

import { ConnectionService } from '../../services/connection.service.js';
import { PlugwiseClient } from '../../client/plugwise-client.js';

export interface ToolResponse {
    content: Array<{ type: string; text: string }>;
    structuredContent?: any;
    isError?: boolean;
}

/**
 * Create a success response
 */
export function successResponse<T>(data: T): ToolResponse {
    const output = { success: true, data };
    return {
        content: [{ 
            type: 'text', 
            text: JSON.stringify(output, null, 2) 
        }],
        structuredContent: output
    };
}

/**
 * Create an error response
 */
export function errorResponse(error: Error | string): ToolResponse {
    const output = { 
        success: false, 
        error: error instanceof Error ? error.message : error 
    };
    return {
        content: [{ 
            type: 'text', 
            text: JSON.stringify(output, null, 2) 
        }],
        structuredContent: output,
        isError: true
    };
}

/**
 * Execute an operation with connection validation and error handling
 */
export async function withConnection<T>(
    connectionService: ConnectionService,
    operation: (client: PlugwiseClient) => Promise<T>
): Promise<ToolResponse> {
    try {
        const client = connectionService.ensureConnected();
        const data = await operation(client);
        return successResponse(data);
    } catch (error) {
        return errorResponse(error as Error);
    }
}
