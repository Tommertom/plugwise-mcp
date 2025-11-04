/**
 * Connection Tool
 * Tool for connecting to Plugwise gateways
 */

import { ConnectionService } from '../../services/connection.service.js';
import { HubDiscoveryService } from '../../services/hub-discovery.service.js';
import { PlugwiseConfig } from '../../types/plugwise-types.js';
import { ToolRegistry } from '../tool-registry.js';

export function registerConnectionTool(
    registry: ToolRegistry,
    connectionService: ConnectionService,
    discoveryService: HubDiscoveryService
) {
    registry.registerTool(
        'connect',
        {
            title: 'Connect to Plugwise Gateway',
            description: 'Connect to a Plugwise gateway (Adam, Anna, Smile P1, or Stretch) and retrieve gateway information. If no host is provided, automatically connects to the first discovered hub. Returns detailed gateway information including model, type, version, hostname, and MAC address.',
            inputSchema: {
                type: 'object',
                properties: {
                    host: {
                        type: 'string',
                        description: 'IP address or hostname of the Plugwise gateway. If omitted, connects to first discovered hub from registry.'
                    },
                    password: {
                        type: 'string',
                        description: 'Password for the Plugwise gateway (typically the hub name). If omitted and host matches a discovered hub, uses stored password.'
                    },
                    port: {
                        type: 'number',
                        description: 'Port number (default: 80)'
                    },
                    username: {
                        type: 'string',
                        description: 'Username (default: smile)'
                    }
                }
            }
        },
        async ({ host, password, port, username }: {
            host?: string;
            password?: string;
            port?: number;
            username?: string;
        }) => {
            try {
                let finalHost = host;
                let finalPassword = password;

                if (!finalHost && discoveryService.hasDiscoveredHubs()) {
                    const firstHub = discoveryService.getFirstHub();
                    if (firstHub) {
                        finalHost = firstHub.ip;
                        finalPassword = firstHub.password;
                    }
                } else if (finalHost && !finalPassword) {
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
