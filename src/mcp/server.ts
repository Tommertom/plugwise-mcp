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
import * as fs from 'fs';
import * as path from 'path';

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

        const hubs = this.getKnownHubsSync();
        const devices = this.getKnownDevicesSync();
        const hubsDescription = this.formatHubsDescription(hubs);
        const devicesDescription = this.formatDevicesDescription(devices);

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

    private getKnownHubsSync(): Array<{ name: string; ip: string; password: string }> {
        try {
            const hubsDirectory = path.join(process.cwd(), 'mcp_data', 'plugwise', 'hubs');

            if (!fs.existsSync(hubsDirectory)) {
                fs.mkdirSync(hubsDirectory, { recursive: true });
            }

            const files = fs.readdirSync(hubsDirectory);
            const hubs: Array<{ name: string; ip: string; password: string }> = [];

            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const filePath = path.join(hubsDirectory, file);
                        const content = fs.readFileSync(filePath, 'utf-8');
                        const hubData = JSON.parse(content);
                        hubs.push({
                            name: hubData.name || file.replace('.json', ''),
                            ip: hubData.ip || 'unknown',
                            password: file.replace('.json', '')
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

    private formatHubsDescription(hubs: Array<{ name: string; ip: string; password: string }>): string {
        if (hubs.length === 0) {
            return '\n\nNo hubs configured yet. Ask the user to provide the name of the hub and then use the add_hub tool to add and scan it.\n- ';
        }

        const hubList = hubs.map(hub => `- ${hub.name} (${hub.ip}) - password: ${hub.password}`).join('\n');
        return `\n\nThe hubs known now are listed below. If you are missing a hub, ask the user for the name of the hub and then use the add_hub tool to add it.\n${hubList}`;
    }

    private getKnownDevicesSync(): Array<{ hubName: string; password?: string; devices: Array<{ id: string; name: string; type: string; location?: string }> }> {
        try {
            const devicesDirectory = path.join(process.cwd(), 'mcp_data', 'plugwise', 'devices');

            if (!fs.existsSync(devicesDirectory)) {
                fs.mkdirSync(devicesDirectory, { recursive: true });
            }

            const files = fs.readdirSync(devicesDirectory);
            const devicesByHubMap: Map<string, { password?: string; devices: Array<{ id: string; name: string; type: string; location?: string }> }> = new Map();

            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const filePath = path.join(devicesDirectory, file);
                        const content = fs.readFileSync(filePath, 'utf-8');
                        const deviceData = JSON.parse(content);

                        // Handle individual device files (new format)
                        if (deviceData.device && deviceData.hubName) {
                            const device = deviceData.device;
                            const hubName = deviceData.hubName;
                            const password = deviceData.password;

                            if (!devicesByHubMap.has(hubName)) {
                                devicesByHubMap.set(hubName, { password, devices: [] });
                            }

                            // Update password if it wasn't set before
                            if (password && !devicesByHubMap.get(hubName)!.password) {
                                devicesByHubMap.get(hubName)!.password = password;
                            }

                            devicesByHubMap.get(hubName)!.devices.push({
                                id: device.id || deviceData.deviceId,
                                name: device.name || deviceData.humanReadableName || 'unknown',
                                type: device.type || device.dev_class || 'unknown',
                                location: device.location
                            });
                        }
                        // Handle legacy format with devices array (if any exist)
                        else if (deviceData.devices && Array.isArray(deviceData.devices)) {
                            const devices = deviceData.devices.map((d: any) => ({
                                id: d.id,
                                name: d.name,
                                type: d.type || d.dev_class || 'unknown',
                                location: d.location
                            }));

                            const hubName = deviceData.hubName || file.replace('.json', '');
                            if (!devicesByHubMap.has(hubName)) {
                                devicesByHubMap.set(hubName, { devices: [] });
                            }
                            devicesByHubMap.get(hubName)!.devices.push(...devices);
                        }
                    } catch (error) {
                        console.error(`Failed to load devices from ${file}:`, error);
                    }
                }
            }

            // Convert map to array
            const devicesByHub: Array<{ hubName: string; password?: string; devices: Array<{ id: string; name: string; type: string; location?: string }> }> = [];
            for (const [hubName, data] of devicesByHubMap.entries()) {
                devicesByHub.push({ hubName, password: data.password, devices: data.devices });
            }

            return devicesByHub;
        } catch (error) {
            console.error('Error loading devices:', error);
            return [];
        }
    }

    private formatDevicesDescription(devicesByHub: Array<{ hubName: string; password?: string; devices: Array<{ id: string; name: string; type: string; location?: string }> }>): string {
        if (devicesByHub.length === 0) {
            return '\n\nNo devices cached yet. Connect to a hub and use get_devices to scan and cache devices.';
        }

        let description = '\n\nKnown devices (use get_devices to refresh):';

        for (const hub of devicesByHub) {
            const passwordInfo = hub.password ? ` - password: ${hub.password}` : '';
            description += `\n\nHub: ${hub.hubName}${passwordInfo}`;
            const deviceList = hub.devices
                .map(d => {
                    const location = d.location ? ` in ${d.location}` : '';
                    return `- ${d.name}${location} (${d.type}) [ID: ${d.id}]`;
                })
                .join('\n');
            description += `\n${deviceList}`;
        }

        return description;
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

        // Load hubs from files to ensure we have all known hubs
        await this.discoveryService.loadAllHubsFromFiles();
        const hubs = this.discoveryService.getDiscoveredHubs();

        if (hubs.length === 0) {
            console.error('ℹ️  No hubs found to scan.');
            return;
        }

        for (const hub of hubs) {
            console.error(`\n📍 Processing hub: ${hub.name}`);

            // Verify/Update IP using verifyHub
            const verifiedHub = await this.discoveryService.verifyHub(hub);

            if (verifiedHub) {
                const currentHub = verifiedHub;

                // Connect and fetch devices
                try {
                    console.error(`🔌 Connecting to ${currentHub.name} at ${currentHub.ip}...`);
                    const client = await this.connectionService.connect({
                        host: currentHub.ip,
                        password: currentHub.password,
                        username: 'smile'
                    });

                    console.error('📥 Fetching devices...');
                    const devices = await client.getDevices();

                    console.error('💾 Saving devices...');
                    await this.deviceStorage.saveDevices(currentHub.name, devices.entities, currentHub.password);

                    // Disconnect to avoid holding resources
                    this.connectionService.disconnect();
                    console.error(`✅ Hub ${currentHub.name} refreshed successfully`);

                } catch (error) {
                    console.error(`❌ Failed to refresh devices for hub ${currentHub.name}:`, error);
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

        // Scan and refresh hubs on startup
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
