/**
 * Tool Registry
 * 
 * Provides a registry for MCP tools that bridges between the modular tool
 * definitions and the MCP SDK's request handler pattern.
 */

import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';

export interface ToolDefinition {
    name: string;
    title: string;
    description: string;
    inputSchema: any;
    outputSchema?: any;
    handler: (args: any) => Promise<any>;
}

export class ToolRegistry {
    private tools: Map<string, ToolDefinition> = new Map();

    registerTool(
        name: string,
        definition: {
            title: string;
            description: string;
            inputSchema: any;
            outputSchema?: any;
        },
        handler: (args: any) => Promise<any>
    ): void {
        this.tools.set(name, {
            name,
            ...definition,
            handler
        });
    }

    getToolDefinitions(): ToolDefinition[] {
        return Array.from(this.tools.values());
    }

    getToolList(): Array<{ name: string; description: string; inputSchema: any }> {
        return Array.from(this.tools.values()).map(tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema
        }));
    }

    async handleToolCall(request: CallToolRequest): Promise<any> {
        const { name, arguments: args } = request.params;
        
        const tool = this.tools.get(name);
        if (!tool) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Unknown tool: ${name}`
                    }
                ],
                isError: true
            };
        }

        try {
            return await tool.handler(args || {});
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error in ${name}: ${error instanceof Error ? error.message : String(error)}`
                    }
                ],
                isError: true
            };
        }
    }

    hasTool(name: string): boolean {
        return this.tools.has(name);
    }
}
