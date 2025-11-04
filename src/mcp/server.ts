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
import { ConnectionService } from '../services/connection.service.js';
import { ToolRegistry } from './tool-registry.js';
import { registerAllTools } from './tools/index.js';
import * as fs from 'fs';
import * as path from 'path';

export class PlugwiseMcpServer {
    private server: Server;
    private discoveryService: HubDiscoveryService;
    private connectionService: ConnectionService;
    private toolRegistry: ToolRegistry;

    constructor() {
        this.discoveryService = new HubDiscoveryService();
        this.connectionService = new ConnectionService();
        this.toolRegistry = new ToolRegistry();

        const hubs = this.getKnownHubsSync();
        const hubsDescription = this.formatHubsDescription(hubs);

        this.server = new Server(
            {
                name: 'plugwise-mcp-server',
                version: '1.0.0',
                description: `Smart home automation control server for Plugwise devices. Specifically designed for coding agents and AI-driven home automation workflows. Provides comprehensive tools for discovering, connecting to, and controlling Plugwise climate control systems (Adam, Anna thermostats), power monitoring (Smile P1), and smart switches (Stretch). Enables coding agents to build intelligent heating schedules, energy monitoring dashboards, automation routines, and integration with other smart home platforms. Supports network discovery, persistent hub management, real-time device state monitoring, and programmatic control of temperature, presets, and appliances.
                
                Always requires the hub name or IP to run tools, so research these with the list_hubs tool. When the user refers to a location, room or device, try the device tool first for all the hubs to find the right hub id and device id. Put this in your plan.\n ${hubsDescription}`,
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

        registerAllTools(this.toolRegistry, this.connectionService, this.discoveryService);
        this.setupHandlers();
    }

    private getKnownHubsSync(): Array<{ name: string; ip: string }> {
        try {
            const hubsDirectory = path.join(process.cwd(), 'hubs');

            if (!fs.existsSync(hubsDirectory)) {
                return [];
            }

            const files = fs.readdirSync(hubsDirectory);
            const hubs: Array<{ name: string; ip: string }> = [];

            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const filePath = path.join(hubsDirectory, file);
                        const content = fs.readFileSync(filePath, 'utf-8');
                        const hubData = JSON.parse(content);
                        hubs.push({
                            name: hubData.name || file.replace('.json', ''),
                            ip: hubData.ip || 'unknown'
                        });
                    } catch (error) {
                        console.error(`Failed to load hub from ${file}:`, error);
                    }
                }
            }

            return hubs;
        } catch (error) {
            console.error('Error loading hubs:', error);
            return [];
        }
    }

    private formatHubsDescription(hubs: Array<{ name: string; ip: string }>): string {
        if (hubs.length === 0) {
            return '\n\nNo hubs configured yet. Ask the user to provide the name of the hub and then use the add_hub tool to add and scan it.\n- ';
        }

        const hubList = hubs.map(hub => `- ${hub.name} (${hub.ip})`).join('\n');
        return `\n\nThe hubs known now are listed below. If you are missing a hub, ask the user for the name of the hub and then use the add_hub tool to add it.\n${hubList}`;
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

    async run(): Promise<void> {
        const config = getServerConfig();

        await this.discoveryService.loadFromEnvironment();

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
