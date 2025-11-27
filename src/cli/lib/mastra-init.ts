import { Mastra } from '@mastra/core/mastra';
import { Agent } from '@mastra/core/agent';
import { McpClient } from './mcp-client.js';
import { McpToolAdapter } from './tool-adapter.js';
import { createPlugwiseAgent } from './plugwise-agent.js';

export interface MastraConfigOptions {
    mcpServerPath?: string;
    model?: string;
    enableLogging?: boolean;
}

export interface InitializedMastra {
    mastra: Mastra;
    plugwiseAgent: Agent;
    mcpClient: McpClient;
    cleanup: () => Promise<void>;
}

export async function initializeMastra(options: MastraConfigOptions = {}): Promise<InitializedMastra> {
    const { mcpServerPath, model, enableLogging = true } = options;

    if (enableLogging) {
        console.error('[Mastra Config] Initializing Mastra with Plugwise MCP integration...');
    }

    const mcpClient = new McpClient(mcpServerPath);
    await mcpClient.connect();

    const toolAdapter = new McpToolAdapter(mcpClient);
    const tools = await toolAdapter.loadTools();

    if (enableLogging) {
        console.error(`[Mastra Config] Loaded ${Object.keys(tools).length} Plugwise tools`);
    }

    const plugwiseAgent = createPlugwiseAgent({ tools, model });

    const mastra = new Mastra({
        agents: {
            plugwiseAgent,
        },
    });

    const cleanup = async () => {
        if (enableLogging) {
            console.error('[Mastra Config] Cleaning up...');
        }
        await mcpClient.disconnect();
    };

    return {
        mastra,
        plugwiseAgent,
        mcpClient,
        cleanup,
    };
}
