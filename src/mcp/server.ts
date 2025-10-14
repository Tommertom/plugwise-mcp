/**
 * Plugwise MCP Server
 * 
 * Main entry point for the Plugwise MCP server.
 * This MCP server provides tools and resources for interacting with Plugwise
 * smart home devices (Adam, Anna, Smile P1, Stretch) via their HTTP XML API.
 * 
 * Based on: https://github.com/plugwise/python-plugwise
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { getServerConfig } from './config/environment.js';
import { HubDiscoveryService } from './services/hub-discovery.service.js';
import { ConnectionService } from './services/connection.service.js';
import { registerAllTools } from './tools/index.js';
import { registerAllResources } from './resources/index.js';
import { registerAllPrompts } from './prompts/index.js';

// Initialize services
const discoveryService = new HubDiscoveryService();
const connectionService = new ConnectionService();

// Create the MCP server instance
const server = new McpServer({
    name: 'plugwise-mcp-server',
    version: '1.0.0'
});

// Register all tools, resources, and prompts
registerAllTools(server, connectionService, discoveryService);
registerAllResources(server, connectionService);
registerAllPrompts(server);

// Set up Express server
const app = express();
app.use(express.json());

// MCP endpoint handler
app.post('/mcp', async (req, res) => {
    // Create a new transport for each request to prevent request ID collisions
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true
    });

    res.on('close', () => {
        transport.close();
    });

    try {
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
    } catch (error) {
        console.error('Error handling MCP request:', error);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: '2.0',
                error: {
                    code: -32603,
                    message: 'Internal server error'
                },
                id: null
            });
        }
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    const client = connectionService.getClient();
    res.json({
        status: 'ok',
        server: 'plugwise-mcp-server',
        version: '1.0.0',
        connected: connectionService.isConnected(),
        gateway: client?.getGatewayInfo() || null,
        discovered_hubs: discoveryService.getDiscoveredHubs().map(h => ({
            name: h.name,
            ip: h.ip,
            model: h.model,
            discovered_at: h.discoveredAt
        }))
    });
});

// Start the server
async function startServer(): Promise<void> {
    const config = getServerConfig();

    // Load HUB configurations from .env
    await discoveryService.loadFromEnvironment();

    app.listen(config.port, config.host, () => {
        console.log('\n🚀 Plugwise MCP Server started!');
        console.log(`📡 MCP endpoint: http://${config.host}:${config.port}/mcp`);
        console.log(`💚 Health check: http://${config.host}:${config.port}/health`);
        console.log('\nAvailable Tools:');
        console.log('  - scan_network: Scan network for Plugwise hubs using .env passwords');
        console.log('  - connect: Connect to Plugwise gateway');
        console.log('  - get_devices: Get all devices and their states');
        console.log('  - set_temperature: Set thermostat temperature');
        console.log('  - set_preset: Set thermostat preset mode');
        console.log('  - control_switch: Control switches/relays');
        console.log('  - set_gateway_mode: Set gateway mode (home/away/vacation)');
        console.log('  - set_dhw_mode: Set domestic hot water mode');
        console.log('  - set_regulation_mode: Set heating regulation mode');
        console.log('  - delete_notification: Clear gateway notifications');
        console.log('  - reboot_gateway: Reboot the gateway');
        console.log('\nAvailable Resources:');
        console.log('  - plugwise://devices: Current device states');
        console.log('\nAvailable Prompts:');
        console.log('  - setup_guide: Get setup instructions');
        console.log('\nPress Ctrl+C to stop the server');
    }).on('error', (error) => {
        console.error('❌ Server error:', error);
        process.exit(1);
    });
}

// Start the server
startServer().catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});
