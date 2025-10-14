/**
 * Tools Index
 * Aggregates and registers all MCP tools
 */

import { registerScanNetworkTool } from './scan-network.tool.js';
import { registerConnectionTool } from './connection.tool.js';
import { registerDeviceTools } from './device.tool.js';
import { registerTemperatureTools } from './temperature.tool.js';
import { registerSwitchTools } from './switch.tool.js';
import { registerGatewayTools } from './gateway.tool.js';
import { ConnectionService } from '../services/connection.service.js';
import { HubDiscoveryService } from '../services/hub-discovery.service.js';

/**
 * Register all MCP tools with the server
 */
export function registerAllTools(
    server: any,
    connectionService: ConnectionService,
    discoveryService: HubDiscoveryService
): void {
    // Network and connection tools
    registerScanNetworkTool(server, discoveryService);
    registerConnectionTool(server, connectionService, discoveryService);

    // Device tools
    registerDeviceTools(server, connectionService);

    // Control tools
    registerTemperatureTools(server, connectionService);
    registerSwitchTools(server, connectionService);
    registerGatewayTools(server, connectionService);
}
