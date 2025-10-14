/**
 * Device Tools
 * Tools for retrieving device information
 */

import { z } from 'zod';
import { ConnectionService } from '../../services/connection.service.js';

export function registerDeviceTools(server: any, connectionService: ConnectionService) {
    server.registerTool(
        'get_devices',
        {
            title: 'Get All Devices',
            description: 'Retrieve all Plugwise devices and their current states, sensors, and capabilities',
            inputSchema: {},
            outputSchema: {
                success: z.boolean(),
                data: z.any().optional(),
                error: z.string().optional()
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
