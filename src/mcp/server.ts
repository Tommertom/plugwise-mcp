/**
 * Plugwise MCP Server
 * 
 * Main entry point for the Plugwise MCP server.
 * This MCP server provides tools and resources for interacting with Plugwise
 * smart home devices (Adam, Anna, Smile P1, Stretch) via their HTTP XML API.
 * 
 * Based on: https://github.com/plugwise/python-plugwise
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    type CallToolRequest,
    type ListToolsRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { getServerConfig } from '../config/environment.js';
import { HubDiscoveryService } from '../services/hub-discovery.service.js';
import { DeviceStorageService } from '../services/device-storage.service.js';
import { ConnectionService } from '../services/connection.service.js';
import { ToolRegistry } from './tool-registry.js';
import { registerAllTools } from './tools/index.js';

export class PlugwiseMcpServer {
    private server: Server;
    private discoveryService: HubDiscoveryService;
    private deviceStorage: DeviceStorageService;
    private connectionService: ConnectionService;
    private toolRegistry: ToolRegistry;

    constructor() {
        this.discoveryService = new HubDiscoveryService();
        this.deviceStorage = new DeviceStorageService();
        this.connectionService = new ConnectionService();
        this.toolRegistry = new ToolRegistry();

        this.server = new Server(
            {
                name: 'plugwise-mcp-server',
                version: '1.0.0',
            },
            {
                capabilities: {
                    tools: {},
                    resources: {},
                    prompts: {},
                },
            }
        );

        console.error('Plugwise MCP Server initialized - Smart Home Automation Control for AI Agents');
        console.error('Supports: Climate control, energy monitoring, switch automation, gateway management');
        console.error('Optimized for: Home automation workflows, energy optimization, comfort control');

        registerAllTools(this.toolRegistry, this.connectionService, this.discoveryService, this.deviceStorage);
        this.setupHandlers();
    }

    private setupHandlers(): void {
        this.server.setRequestHandler(ListToolsRequestSchema, async (_request: ListToolsRequest) => ({
            tools: this.toolRegistry.getToolList()
        }));

        this.server.setRequestHandler(
            CallToolRequestSchema,
            async (request: CallToolRequest) => this.toolRegistry.handleToolCall(request)
        );
    }

    private async scanAndRefreshHubs(): Promise<void> {
        console.error('\n🔄 Starting startup hub scan and device refresh...');
        
        await this.discoveryService.loadAllHubsFromFiles();
        const hubs = this.discoveryService.getDiscoveredHubs();

        if (hubs.length === 0) {
            console.error('ℹ️  No hubs found to scan.');
            return;
        }

        for (const hub of hubs) {
            console.error(`\n📍 Processing hub: ${hub.name}`);
            
            const verifiedHub = await this.discoveryService.verifyHub(hub);
            
            if (verifiedHub) {
                try {
                    console.error(`🔌 Connecting to ${verifiedHub.name} at ${verifiedHub.ip}...`);
                    const client = await this.connectionService.connect({
                        host: verifiedHub.ip,
                        password: verifiedHub.password,
                        username: 'smile'
                    });
                    
                    console.error('📥 Fetching devices...');
                    const devices = await client.getDevices();
                    
                    console.error('💾 Saving devices...');
                    await this.deviceStorage.saveDevices(verifiedHub.name, devices.entities, verifiedHub.password);
                    
                    this.connectionService.disconnect();
                    console.error(`✅ Hub ${verifiedHub.name} refreshed successfully`);
                    
                } catch (error) {
                    console.error(`❌ Failed to refresh devices for hub ${verifiedHub.name}:`, error);
                }
            } else {
                console.error(`❌ Failed to verify hub ${hub.name}`);
            }
        }
        
        console.error('\n✨ Startup scan and refresh completed.\n');
    }

    async run(): Promise<void> {
        const config = getServerConfig();

        await this.discoveryService.loadFromEnvironment();
        await this.deviceStorage.loadAllDevices();

        await this.scanAndRefreshHubs();

        console.error('\n🚀 Plugwise MCP Server started!');
        console.error('\nAvailable Tools:');
        const tools = this.toolRegistry.getToolDefinitions();
        tools.forEach(tool => {
            console.error(`  - ${tool.name}: ${tool.title}`);
        });
        console.error('\nAvailable Resources:');
        console.error('  - plugwise://devices: Current device states');
        console.error('\nAvailable Prompts:');
        console.error('  - setup_guide: Get setup instructions');

        const transport = new StdioServerTransport();
        await this.server.connect(transport);
    }
}
