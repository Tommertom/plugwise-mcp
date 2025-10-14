/**
 * Devices Resource
 * Provides access to device data as an MCP resource
 */

import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ConnectionService } from '../../services/connection.service.js';

export function registerDevicesResource(server: any, connectionService: ConnectionService): void {
    server.registerResource(
        'devices',
        new ResourceTemplate('plugwise://devices', { list: undefined }),
        {
            title: 'Plugwise Devices',
            description: 'Access current state and data of all Plugwise devices'
        },
        async (uri: URL) => {
            try {
                const client = connectionService.ensureConnected();
                const data = await client.getDevices();

                return {
                    contents: [
                        {
                            uri: uri.href,
                            text: JSON.stringify(data, null, 2),
                            mimeType: 'application/json'
                        }
                    ]
                };
            } catch (error) {
                return {
                    contents: [
                        {
                            uri: uri.href,
                            text: JSON.stringify({ error: (error as Error).message }, null, 2),
                            mimeType: 'application/json'
                        }
                    ]
                };
            }
        }
    );
}
