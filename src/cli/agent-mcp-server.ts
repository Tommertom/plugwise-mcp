/**
 * Agent MCP Server
 * 
 * A simplified MCP server that exposes the Plugwise agent as a single tool.
 * Instead of exposing all individual Plugwise tools, this server provides
 * one "manage_plugwise" tool that accepts natural language instructions.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    type CallToolRequest,
    type ListToolsRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { initializeMastra } from './lib/mastra-init.js';

export class AgentMcpServer {
    private server: Server;
    private mastraInstance: any;
    private cleanup: () => Promise<void>;

    constructor() {
        this.server = new Server(
            {
                name: 'plugwise-agent-mcp-server',
                version: '1.0.0',
                description: 'AI-powered Plugwise control through natural language instructions. Manage your Plugwise smart home devices using conversational commands.',
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        this.cleanup = async () => {};
        this.setupHandlers();
    }

    private setupHandlers(): void {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'manage_plugwise',
                    description: 'Control and manage Plugwise smart home devices using natural language instructions. This tool can discover hubs, list devices, control temperature, monitor energy usage, and manage all aspects of your Plugwise system. Simply provide instructions in plain English.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            instruction: {
                                type: 'string',
                                description: 'Natural language instruction for managing Plugwise devices. Examples: "List all my devices", "Set living room temperature to 21 degrees", "What is the current power usage?", "Turn on the kitchen lights"',
                            },
                        },
                        required: ['instruction'],
                    },
                },
            ],
        }));

        this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
            if (request.params.name !== 'manage_plugwise') {
                throw new Error(`Unknown tool: ${request.params.name}`);
            }

            const { instruction } = request.params.arguments as { instruction: string };

            if (!instruction || typeof instruction !== 'string') {
                throw new Error('Instruction parameter is required and must be a string');
            }

            try {
                console.error(`[Agent MCP] Processing instruction: "${instruction}"`);

                // Initialize Mastra with the Plugwise agent if not already done
                if (!this.mastraInstance) {
                    console.error('[Agent MCP] Initializing Plugwise agent...');
                    const initialized = await initializeMastra({
                        model: process.env.PLUGWISE_AGENT_MODEL || 'gpt-4o-mini',
                    });
                    this.mastraInstance = initialized.mastra;
                    this.cleanup = initialized.cleanup;
                    console.error('[Agent MCP] Agent initialized');
                }

                const agent = this.mastraInstance.getAgent('plugwiseAgent');

                const result = await agent.generate(instruction, {
                    maxSteps: 10,
                });

                console.error(`[Agent MCP] Completed with ${result.steps?.length || 0} steps`);

                return {
                    content: [
                        {
                            type: 'text',
                            text: result.text || 'No response from agent',
                        },
                    ],
                };
            } catch (error: any) {
                console.error('[Agent MCP] Error:', error);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error processing instruction: ${error.message || String(error)}`,
                        },
                    ],
                    isError: true,
                };
            }
        });
    }

    async run(): Promise<void> {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Plugwise Agent MCP Server running on stdio');
        console.error('Exposes one tool: manage_plugwise - for natural language control');

        // Handle cleanup on exit
        process.on('SIGINT', async () => {
            await this.cleanup();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            await this.cleanup();
            process.exit(0);
        });
    }
}
