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

export class PlugwiseMcpServer {
    private server: Server;
    private discoveryService: HubDiscoveryService;
    private connectionService: ConnectionService;

    constructor() {
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

        // Initialize services
        this.discoveryService = new HubDiscoveryService();
        this.connectionService = new ConnectionService();

        this.setupHandlers();
    }

    private setupHandlers(): void {
        // Set up tool list handler
        this.server.setRequestHandler(ListToolsRequestSchema, async (_request: ListToolsRequest) => ({
            tools: [
                {
                    name: 'scan_network',
                    description: 'Scan the local network for Plugwise hubs using passwords from .env file (HUB1, HUB2, etc.). Discovered hubs are stored in the server for quick connection.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            network: {
                                type: 'string',
                                description: 'Network to scan in CIDR notation (e.g., 192.168.1.0/24). If not provided, auto-detects local network.'
                            }
                        }
                    }
                },
                {
                    name: 'add_hub',
                    description: 'Add a new Plugwise hub by providing its name (used as password). Scans the network to find the hub and stores it in the /hubs folder.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            hubName: {
                                type: 'string',
                                description: 'The hub name/ID (e.g., glmpuuxg) which is also used as the password'
                            }
                        },
                        required: ['hubName']
                    }
                },
                {
                    name: 'list_hubs',
                    description: 'List all registered Plugwise hubs from the /hubs folder and in-memory registry',
                    inputSchema: {
                        type: 'object',
                        properties: {}
                    }
                },
                {
                    name: 'connect',
                    description: 'Connect to a Plugwise gateway using host and password',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            host: {
                                type: 'string',
                                description: 'Gateway host (IP address or hostname)'
                            },
                            password: {
                                type: 'string',
                                description: 'Gateway password (smile ID)'
                            }
                        },
                        required: ['host', 'password']
                    }
                },
                {
                    name: 'get_devices',
                    description: 'Get all devices and their current states from the connected gateway',
                    inputSchema: {
                        type: 'object',
                        properties: {}
                    }
                },
                {
                    name: 'set_temperature',
                    description: 'Set thermostat target temperature',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            device_id: {
                                type: 'string',
                                description: 'Device ID of the thermostat'
                            },
                            temperature: {
                                type: 'number',
                                description: 'Target temperature in Celsius'
                            }
                        },
                        required: ['device_id', 'temperature']
                    }
                },
                {
                    name: 'set_preset',
                    description: 'Set thermostat preset mode (home, away, vacation, etc.)',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            device_id: {
                                type: 'string',
                                description: 'Device ID of the thermostat'
                            },
                            preset: {
                                type: 'string',
                                description: 'Preset mode to set'
                            }
                        },
                        required: ['device_id', 'preset']
                    }
                },
                {
                    name: 'control_switch',
                    description: 'Control switches and relays (turn on/off)',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            device_id: {
                                type: 'string',
                                description: 'Device ID of the switch/relay'
                            },
                            state: {
                                type: 'boolean',
                                description: 'True to turn on, false to turn off'
                            }
                        },
                        required: ['device_id', 'state']
                    }
                },
                {
                    name: 'set_gateway_mode',
                    description: 'Set gateway mode (home/away/vacation)',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            mode: {
                                type: 'string',
                                description: 'Gateway mode to set',
                                enum: ['home', 'away', 'vacation']
                            }
                        },
                        required: ['mode']
                    }
                },
                {
                    name: 'set_dhw_mode',
                    description: 'Set domestic hot water mode',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            mode: {
                                type: 'string',
                                description: 'DHW mode to set'
                            }
                        },
                        required: ['mode']
                    }
                },
                {
                    name: 'set_regulation_mode',
                    description: 'Set heating regulation mode',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            mode: {
                                type: 'string',
                                description: 'Regulation mode to set'
                            }
                        },
                        required: ['mode']
                    }
                },
                {
                    name: 'delete_notification',
                    description: 'Clear gateway notifications',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            notification_id: {
                                type: 'string',
                                description: 'Notification ID to delete (optional - if not provided, clears all)'
                            }
                        }
                    }
                },
                {
                    name: 'reboot_gateway',
                    description: 'Reboot the Plugwise gateway',
                    inputSchema: {
                        type: 'object',
                        properties: {}
                    }
                }
            ]
        }));

        // Set up tool call handler
        this.server.setRequestHandler(
            CallToolRequestSchema,
            async (request: CallToolRequest) => this.handleToolCall(request)
        );
    }

    private async handleToolCall(request: CallToolRequest) {
        const { name, arguments: args } = request.params;

        try {
            switch (name) {
                case 'scan_network':
                    return await this.handleScanNetwork(args);
                case 'add_hub':
                    return await this.handleAddHub(args);
                case 'list_hubs':
                    return await this.handleListHubs(args);
                case 'connect':
                    return await this.handleConnect(args);
                case 'get_devices':
                    return await this.handleGetDevices(args);
                case 'set_temperature':
                    return await this.handleSetTemperature(args);
                case 'set_preset':
                    return await this.handleSetPreset(args);
                case 'control_switch':
                    return await this.handleControlSwitch(args);
                case 'set_gateway_mode':
                    return await this.handleSetGatewayMode(args);
                case 'set_dhw_mode':
                    return await this.handleSetDhwMode(args);
                case 'set_regulation_mode':
                    return await this.handleSetRegulationMode(args);
                case 'delete_notification':
                    return await this.handleDeleteNotification(args);
                case 'reboot_gateway':
                    return await this.handleRebootGateway(args);
                default:
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Unknown tool: ${name}`
                            }
                        ]
                    };
            }
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error: ${error instanceof Error ? error.message : String(error)}`
                    }
                ],
                isError: true
            };
        }
    }

    // Tool handlers
    private async handleScanNetwork(args: unknown) {
        const network = typeof args === 'object' && args !== null && 'network' in args
            ? (args.network as string)
            : undefined;

        try {
            const result = await this.discoveryService.scanNetwork(network);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            discovered: result.discovered.map(hub => ({
                                name: hub.name,
                                ip: hub.ip,
                                model: hub.model,
                                discovered_at: hub.discoveredAt
                            })),
                            scanned_count: result.scannedCount
                        }, null, 2)
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: error instanceof Error ? error.message : String(error)
                        }, null, 2)
                    }
                ],
                isError: true
            };
        }
    }

    private async handleAddHub(args: unknown) {
        const hubName = typeof args === 'object' && args !== null && 'hubName' in args
            ? (args.hubName as string)
            : undefined;

        // Validate input
        if (!hubName || hubName.trim() === '') {
            const syntaxMessage = `❌ Hub name is required.

Usage: Call add_hub tool with hubName parameter

Example: { "hubName": "glmpuuxg" }

The hub name is the unique identifier/password for your Plugwise hub.`;

            return {
                content: [
                    {
                        type: 'text',
                        text: syntaxMessage
                    }
                ]
            };
        }

        try {
            const result = await this.discoveryService.addHubByName(hubName.trim());

            if (result.success && result.hub) {
                const successMessage = `✅ Hub found and added successfully!

Hub Details:
  Name: ${result.hub.name}
  IP: ${result.hub.ip}
  Model: ${result.hub.model || 'Unknown'}
  Firmware: ${result.hub.firmware || 'Unknown'}

The hub has been saved to: /hubs/${hubName}.json`;

                return {
                    content: [
                        {
                            type: 'text',
                            text: successMessage
                        }
                    ]
                };
            } else {
                const errorMessage = result.error || 'Hub not found on the network';
                return {
                    content: [
                        {
                            type: 'text',
                            text: `❌ ${errorMessage}`
                        }
                    ],
                    isError: true
                };
            }
        } catch (error) {
            const errorMessage = `Error adding hub: ${(error as Error).message}`;
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ ${errorMessage}`
                    }
                ],
                isError: true
            };
        }
    }

    private async handleListHubs(args: unknown) {
        try {
            // Load hubs from files if not already loaded
            await this.discoveryService.loadAllHubsFromFiles();

            const hubs = this.discoveryService.getDiscoveredHubs();

            if (hubs.length === 0) {
                const message = `📋 No hubs registered yet.\n\nUse /addhub <hub-name> to add a new hub.`;

                return {
                    content: [
                        {
                            type: 'text',
                            text: message
                        }
                    ]
                };
            }

            // Format hub list
            const hubList = hubs.map((hub, index) =>
                `  ${index + 1}. ${hub.name}\n     IP: ${hub.ip}\n     Model: ${hub.model || 'Unknown'}\n     Firmware: ${hub.firmware || 'Unknown'}`
            ).join('\n\n');

            const message = `📋 Registered Hubs (${hubs.length})\n\n${hubList}\n\nUse /connect with the IP address to connect to a hub.`;

            return {
                content: [
                    {
                        type: 'text',
                        text: message
                    }
                ]
            };
        } catch (error) {
            const errorMessage = `Error listing hubs: ${(error as Error).message}`;
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ ${errorMessage}`
                    }
                ],
                isError: true
            };
        }
    }

    private async handleConnect(args: unknown) {
        if (typeof args !== 'object' || args === null || !('host' in args) || !('password' in args)) {
            throw new Error('Host and password are required');
        }

        const host = args.host as string;
        const password = args.password as string;

        try {
            const config = { host, password };
            const client = await this.connectionService.connect(config);
            const gatewayInfo = client.getGatewayInfo();

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: 'Connected successfully',
                            gateway_info: gatewayInfo
                        }, null, 2)
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: error instanceof Error ? error.message : String(error)
                        }, null, 2)
                    }
                ],
                isError: true
            };
        }
    }

    private async handleGetDevices(args: unknown) {
        try {
            const client = this.connectionService.getClient();
            if (!client) {
                throw new Error('Not connected to gateway. Use connect tool first.');
            }

            const devices = await client.getDevices();
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            devices: devices
                        }, null, 2)
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: error instanceof Error ? error.message : String(error)
                        }, null, 2)
                    }
                ],
                isError: true
            };
        }
    }

    private async handleSetTemperature(args: unknown) {
        if (typeof args !== 'object' || args === null || !('device_id' in args) || !('temperature' in args)) {
            throw new Error('Device ID and temperature are required');
        }

        const deviceId = args.device_id as string;
        const temperature = args.temperature as number;

        try {
            const client = this.connectionService.getClient();
            if (!client) {
                throw new Error('Not connected to gateway. Use connect tool first.');
            }

            await client.setTemperature({
                location_id: deviceId,
                setpoint: temperature
            });

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: `Temperature set to ${temperature}°C for device ${deviceId}`
                        }, null, 2)
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: error instanceof Error ? error.message : String(error)
                        }, null, 2)
                    }
                ],
                isError: true
            };
        }
    }

    private async handleSetPreset(args: unknown) {
        if (typeof args !== 'object' || args === null || !('device_id' in args) || !('preset' in args)) {
            throw new Error('Device ID and preset are required');
        }

        const deviceId = args.device_id as string;
        const preset = args.preset as string;

        try {
            const client = this.connectionService.getClient();
            if (!client) {
                throw new Error('Not connected to gateway. Use connect tool first.');
            }

            await client.setPreset(deviceId, preset);

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: `Preset set to ${preset} for device ${deviceId}`
                        }, null, 2)
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: error instanceof Error ? error.message : String(error)
                        }, null, 2)
                    }
                ],
                isError: true
            };
        }
    }

    private async handleControlSwitch(args: unknown) {
        if (typeof args !== 'object' || args === null || !('device_id' in args) || !('state' in args)) {
            throw new Error('Device ID and state are required');
        }

        const deviceId = args.device_id as string;
        const state = args.state as boolean;

        try {
            const client = this.connectionService.getClient();
            if (!client) {
                throw new Error('Not connected to gateway. Use connect tool first.');
            }

            await client.setSwitchState({
                appliance_id: deviceId,
                state: state ? 'on' : 'off'
            });

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: `Switch ${state ? 'turned on' : 'turned off'} for device ${deviceId}`
                        }, null, 2)
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: error instanceof Error ? error.message : String(error)
                        }, null, 2)
                    }
                ],
                isError: true
            };
        }
    }

    private async handleSetGatewayMode(args: unknown) {
        if (typeof args !== 'object' || args === null || !('mode' in args)) {
            throw new Error('Mode is required');
        }

        const mode = args.mode as string;
        const validModes = ['home', 'away', 'vacation'];

        if (!validModes.includes(mode)) {
            throw new Error(`Invalid mode. Must be one of: ${validModes.join(', ')}`);
        }

        try {
            const client = this.connectionService.getClient();
            if (!client) {
                throw new Error('Not connected to gateway. Use connect tool first.');
            }

            await client.setGatewayMode(mode as 'home' | 'away' | 'vacation');

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: `Gateway mode set to ${mode}`
                        }, null, 2)
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: error instanceof Error ? error.message : String(error)
                        }, null, 2)
                    }
                ],
                isError: true
            };
        }
    }

    private async handleSetDhwMode(args: unknown) {
        if (typeof args !== 'object' || args === null || !('mode' in args)) {
            throw new Error('Mode is required');
        }

        const mode = args.mode as string;
        const validModes = ['auto', 'boost', 'comfort', 'off'];

        if (!validModes.includes(mode)) {
            throw new Error(`Invalid mode. Must be one of: ${validModes.join(', ')}`);
        }

        try {
            const client = this.connectionService.getClient();
            if (!client) {
                throw new Error('Not connected to gateway. Use connect tool first.');
            }

            await client.setDHWMode(mode as 'auto' | 'boost' | 'comfort' | 'off');

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: `DHW mode set to ${mode}`
                        }, null, 2)
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: error instanceof Error ? error.message : String(error)
                        }, null, 2)
                    }
                ],
                isError: true
            };
        }
    }

    private async handleSetRegulationMode(args: unknown) {
        if (typeof args !== 'object' || args === null || !('mode' in args)) {
            throw new Error('Mode is required');
        }

        const mode = args.mode as string;
        const validModes = ['heating', 'off', 'bleeding_cold', 'bleeding_hot'];

        if (!validModes.includes(mode)) {
            throw new Error(`Invalid mode. Must be one of: ${validModes.join(', ')}`);
        }

        try {
            const client = this.connectionService.getClient();
            if (!client) {
                throw new Error('Not connected to gateway. Use connect tool first.');
            }

            await client.setRegulationMode(mode as 'heating' | 'off' | 'bleeding_cold' | 'bleeding_hot');

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: `Regulation mode set to ${mode}`
                        }, null, 2)
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: error instanceof Error ? error.message : String(error)
                        }, null, 2)
                    }
                ],
                isError: true
            };
        }
    }

    private async handleDeleteNotification(args: unknown) {
        // The client's deleteNotifications() method doesn't take parameters
        try {
            const client = this.connectionService.getClient();
            if (!client) {
                throw new Error('Not connected to gateway. Use connect tool first.');
            }

            await client.deleteNotification();

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: 'All notifications cleared'
                        }, null, 2)
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: error instanceof Error ? error.message : String(error)
                        }, null, 2)
                    }
                ],
                isError: true
            };
        }
    }

    private async handleRebootGateway(args: unknown) {
        try {
            const client = this.connectionService.getClient();
            if (!client) {
                throw new Error('Not connected to gateway. Use connect tool first.');
            }

            await client.rebootGateway();

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: 'Gateway reboot initiated'
                        }, null, 2)
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: error instanceof Error ? error.message : String(error)
                        }, null, 2)
                    }
                ],
                isError: true
            };
        }
    }

    async run(): Promise<void> {
        const config = getServerConfig();

        // Load HUB configurations from .env
        await this.discoveryService.loadFromEnvironment();

        console.error('\n🚀 Plugwise MCP Server started!');
        console.error('\nAvailable Tools:');
        console.error('  - scan_network: Scan network for Plugwise hubs using .env passwords');
        console.error('  - add_hub: Add a new hub by name (scans network and saves to /hubs folder)');
        console.error('  - list_hubs: List all registered hubs');
        console.error('  - connect: Connect to Plugwise gateway');
        console.error('  - get_devices: Get all devices and their states');
        console.error('  - set_temperature: Set thermostat temperature');
        console.error('  - set_preset: Set thermostat preset mode');
        console.error('  - control_switch: Control switches/relays');
        console.error('  - set_gateway_mode: Set gateway mode (home/away/vacation)');
        console.error('  - set_dhw_mode: Set domestic hot water mode');
        console.error('  - set_regulation_mode: Set heating regulation mode');
        console.error('  - delete_notification: Clear gateway notifications');
        console.error('  - reboot_gateway: Reboot the gateway');
        console.error('\nAvailable Resources:');
        console.error('  - plugwise://devices: Current device states');
        console.error('\nAvailable Prompts:');
        console.error('  - setup_guide: Get setup instructions');

        const transport = new StdioServerTransport();
        await this.server.connect(transport);
    }
}
