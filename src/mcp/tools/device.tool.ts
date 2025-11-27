/**
 * Device Tools
 * Tools for retrieving device information
 */

import { ConnectionService } from '../../services/connection.service.js';
import { DeviceStorageService } from '../../services/device-storage.service.js';
import { HubDiscoveryService } from '../../services/hub-discovery.service.js';
import { ToolRegistry } from '../tool-registry.js';
import { successResponse, errorResponse } from './tool-helpers.js';

export function registerDeviceTools(
    registry: ToolRegistry, 
    connectionService: ConnectionService,
    deviceStorage: DeviceStorageService,
    discoveryService: HubDiscoveryService
) {
    registry.registerTool(
        'get_devices',
        {
            title: 'Get All Devices',
            description: 'Retrieve all Plugwise devices and their current states, sensors, and capabilities. Returns comprehensive information for all connected devices including thermostats, switches, sensors, and other appliances. Includes current readings, capabilities, and operational states.',
            inputSchema: {
                type: 'object',
                properties: {}
            }
        },
        async () => {
            try {
                const client = connectionService.ensureConnected();
                const data = await client.getDevices();

                // Try to determine hub name from connected client
                const gatewayInfo = client.getGatewayInfo();
                const hubName = gatewayInfo?.name || 'unknown';

                // Get password from connection config
                const config = connectionService.getConfig();
                const password = config?.password;

                // Save devices to storage
                try {
                    await deviceStorage.saveDevices(hubName, data.entities, password);
                } catch (saveError) {
                    console.error('Failed to save devices:', saveError);
                }

                return successResponse(data);
            } catch (error) {
                return errorResponse(error as Error);
            }
        }
    );
}
