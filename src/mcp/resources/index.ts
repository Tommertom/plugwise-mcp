/**
 * Resources Index
 * Aggregates and registers all MCP resources
 */

import { registerDevicesResource } from './devices.resource.js';
import { ConnectionService } from '../../services/connection.service.js';

/**
 * Register all MCP resources with the server
 */
export function registerAllResources(
    server: any,
    connectionService: ConnectionService
): void {
    registerDevicesResource(server, connectionService);
}
