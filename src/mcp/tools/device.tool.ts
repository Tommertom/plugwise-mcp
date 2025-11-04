/**
 * Device Tools
 * Tools for retrieving device information
 */

import { ConnectionService } from '../../services/connection.service.js';
import { ToolRegistry } from '../tool-registry.js';

export function registerDeviceTools(registry: ToolRegistry, connectionService: ConnectionService) {
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

                const output = {
                    success: true,
                    data
                };

                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(output, null, 2)
                        }
                    ],
                    structuredContent: output
                };
            } catch (error) {
                const output = {
                    success: false,
                    error: (error as Error).message
                };

                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(output, null, 2)
                        }
                    ],
                    structuredContent: output
                };
            }
        }
    );
}
