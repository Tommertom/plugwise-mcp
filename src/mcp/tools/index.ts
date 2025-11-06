/**
 * Tools Index
 * Aggregates and registers all MCP tools
 */

import { registerAddHubTool } from './add-hub.tool.js';
import { registerListHubsTool } from './list-hubs.tool.js';
import { registerConnectionTool } from './connection.tool.js';
import { registerDeviceTools } from './device.tool.js';
import { registerTemperatureTools } from './temperature.tool.js';
import { registerSwitchTools } from './switch.tool.js';
import { registerGatewayTools } from './gateway.tool.js';
import { ConnectionService } from '../../services/connection.service.js';
import { HubDiscoveryService } from '../../services/hub-discovery.service.js';
import { DeviceStorageService } from '../../services/device-storage.service.js';

/**
 * Register all MCP tools with the server
 */
export function registerAllTools(
    server: any,
    connectionService: ConnectionService,
    discoveryService: HubDiscoveryService,
    deviceStorage: DeviceStorageService
): void {
    // Network and connection tools
    registerAddHubTool(server, discoveryService);
    registerListHubsTool(server, discoveryService);
    registerConnectionTool(server, connectionService, discoveryService);

    // Device tools
    registerDeviceTools(server, connectionService, deviceStorage, discoveryService);

    // Control tools
    registerTemperatureTools(server, connectionService);
    registerSwitchTools(server, connectionService);
    registerGatewayTools(server, connectionService);
}
