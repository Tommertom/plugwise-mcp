/**
 * Connection Tool
 * Tool for connecting to Plugwise gateways
 */

import { z } from 'zod';
import { ConnectionService } from '../../services/connection.service.js';
import { HubDiscoveryService } from '../../services/hub-discovery.service.js';
import { PlugwiseConfig } from '../../types/plugwise-types.js';

export function registerConnectionTool(
    server: any,
    connectionService: ConnectionService,
    discoveryService: HubDiscoveryService
) {
    server.registerTool(
        'connect',
        {
            title: 'Connect to Plugwise Gateway',
            description: 'Connect to a Plugwise gateway (Adam, Anna, Smile P1, or Stretch) and retrieve gateway information',
            inputSchema: {
                host: z.string().optional().describe('IP address or hostname of the Plugwise gateway. If omitted, connects to first discovered hub from scan.'),
                password: z.string().optional().describe('Password for the Plugwise gateway. If omitted and host matches a discovered hub, uses stored password.'),
                port: z.number().optional().describe('Port number (default: 80)'),
                username: z.string().optional().describe('Username (default: smile)')
            },
            outputSchema: {
                success: z.boolean(),
                gateway_info: z.object({
                    name: z.string(),
                    model: z.string(),
                    type: z.string(),
                    version: z.string(),
                    hostname: z.string().optional(),
                    mac_address: z.string().optional()
                }).optional(),
                error: z.string().optional()
            }
        },
        async ({ host, password, port, username }: {
            host?: string;
            password?: string;
            port?: number;
            username?: string;
        }) => {
            try {
                // If no host provided, use first discovered hub
                let finalHost = host;
                let finalPassword = password;

                if (!finalHost && discoveryService.hasDiscoveredHubs()) {
                    const firstHub = discoveryService.getFirstHub();
                    if (firstHub) {
                        finalHost = firstHub.ip;
                        finalPassword = firstHub.password;
                    }
                } else if (finalHost && !finalPassword) {
                    // Check if this host was discovered
                    const discoveredHub = discoveryService.getHub(finalHost);
                    if (discoveredHub) {
                        finalPassword = discoveredHub.password;
                    }
                }

                if (!finalHost || !finalPassword) {
                    throw new Error('Host and password are required. Use list_hubs to find hubs or provide credentials.');
                }

                const config: PlugwiseConfig = {
                    host: finalHost,
                    password: finalPassword,
                    port,
                    username
                };

                const client = await connectionService.connect(config);
                const gatewayInfo = client.getGatewayInfo();

                if (!gatewayInfo) {
                    throw new Error('Failed to retrieve gateway information');
                }

                const output = {
                    success: true,
                    gateway_info: {
                        name: gatewayInfo.name,
                        model: gatewayInfo.model,
                        type: gatewayInfo.type,
                        version: gatewayInfo.version,
                        hostname: gatewayInfo.hostname,
                        mac_address: gatewayInfo.mac_address
                    }
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
