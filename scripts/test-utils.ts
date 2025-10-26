/**
 * Test Utilities for Plugwise MCP Server Testing
 * 
 * This module provides utilities for:
 * - Spawning the MCP server in stdio mode
 * - Making JSON-RPC requests to the server
 * - Handling responses and errors
 */

import { spawn, type ChildProcess } from 'child_process';

export interface JsonRpcRequest {
    jsonrpc: '2.0';
    id: number | string;
    method: string;
    params?: unknown;
}

export interface JsonRpcResponse {
    jsonrpc: '2.0';
    id: number | string;
    result?: unknown;
    error?: {
        code: number;
        message: string;
        data?: unknown;
    };
}

export interface McpToolCall {
    name: string;
    arguments?: Record<string, unknown>;
}

export interface PlugwiseHub {
    host: string;
    name?: string;
    model?: string;
    [key: string]: unknown;
}

/**
 * Make a JSON-RPC request to the MCP server via stdio
 */
export async function makeStdioRequest(
    serverProcess: ChildProcess,
    request: JsonRpcRequest
): Promise<JsonRpcResponse> {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Request timeout'));
        }, 30000);

        let responseData = '';

        const onData = (data: Buffer) => {
            responseData += data.toString();

            // JSON-RPC over stdio uses newline-delimited JSON
            const lines = responseData.split('\n');

            for (let i = 0; i < lines.length - 1; i++) {
                const line = lines[i].trim();
                if (line) {
                    try {
                        const response = JSON.parse(line) as JsonRpcResponse;
                        if (response.id === request.id) {
                            clearTimeout(timeout);
                            serverProcess.stdout?.removeListener('data', onData);
                            resolve(response);
                            return;
                        }
                    } catch (error) {
                        // Not valid JSON, keep accumulating
                    }
                }
            }

            // Keep the last incomplete line
            responseData = lines[lines.length - 1];
        };

        serverProcess.stdout?.on('data', onData);

        // Send request
        const requestStr = JSON.stringify(request) + '\n';
        serverProcess.stdin?.write(requestStr);
    });
}

/**
 * Initialize the MCP server connection
 */
export async function initializeMcpConnection(
    serverProcess: ChildProcess
): Promise<void> {
    const initRequest: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
            protocolVersion: '2024-11-05',
            capabilities: {
                tools: {},
            },
            clientInfo: {
                name: 'test-client',
                version: '1.0.0',
            },
        },
    };

    const response = await makeStdioRequest(serverProcess, initRequest);

    if (response.error) {
        throw new Error(`Initialization failed: ${response.error.message}`);
    }

    // Send initialized notification
    const initializedNotification: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'notifications/initialized',
    };

    serverProcess.stdin?.write(JSON.stringify(initializedNotification) + '\n');
}

/**
 * List all available tools from the MCP server
 */
export async function listTools(serverProcess: ChildProcess): Promise<any[]> {
    const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/list',
    };

    const response = await makeStdioRequest(serverProcess, request);

    if (response.error) {
        throw new Error(`Failed to list tools: ${response.error.message}`);
    }

    return (response.result as any)?.tools || [];
}

/**
 * Call an MCP tool
 */
export async function callTool(
    serverProcess: ChildProcess,
    toolCall: McpToolCall
): Promise<any> {
    const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
            name: toolCall.name,
            arguments: toolCall.arguments || {},
        },
    };

    const response = await makeStdioRequest(serverProcess, request);

    if (response.error) {
        throw new Error(`Tool call failed: ${response.error.message}`);
    }

    // MCP tools return results in content array format
    // Parse the text content if it's JSON
    if (response.result && typeof response.result === 'object') {
        const result = response.result as any;
        if (result.content && Array.isArray(result.content) && result.content.length > 0) {
            const textContent = result.content[0].text;
            if (textContent) {
                try {
                    // Try to parse as JSON
                    return JSON.parse(textContent);
                } catch {
                    // If not JSON, return the raw text wrapped in an object
                    return { text: textContent };
                }
            }
        }
        return result;
    }

    return response.result;
}

/**
 * Helper to list hubs
 */
export async function listHubs(
    serverProcess: ChildProcess
): Promise<PlugwiseHub[]> {
    const result = await callTool(serverProcess, {
        name: 'list_hubs',
        arguments: {},
    });

    // Result has already been parsed by callTool
    if (result && result.hubs && Array.isArray(result.hubs)) {
        return result.hubs;
    }

    return [];
}

/**
 * Helper to format test results
 */
export function formatTestResult(
    testName: string,
    success: boolean,
    details?: string
): string {
    const status = success ? '✅' : '❌';
    const prefix = `${status} ${testName}`;
    return details ? `${prefix}\n   ${details}` : prefix;
}

/**
 * Helper to run a test with error handling
 */
export async function runTest(
    name: string,
    testFn: () => Promise<void>
): Promise<boolean> {
    try {
        await testFn();
        console.log(formatTestResult(name, true));
        return true;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(formatTestResult(name, false, message));
        return false;
    }
}

/**
 * Wait for a specified duration
 */
export function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
