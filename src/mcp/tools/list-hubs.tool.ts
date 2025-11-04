/**
 * List Hubs Tool
 * Tool for listing all registered Plugwise hubs
 */

import { HubDiscoveryService } from '../../services/hub-discovery.service.js';
import { ToolRegistry } from '../tool-registry.js';

export function registerListHubsTool(registry: ToolRegistry, discoveryService: HubDiscoveryService) {
    registry.registerTool(
        'list_hubs',
        {
            title: 'List Registered Hubs',
            description: 'List all registered Plugwise hubs from the /hubs folder and in-memory registry. Returns hub information including name, IP address, model, and firmware version for each discovered hub.',
            inputSchema: {
                type: 'object',
                properties: {}
            }
        },
        async () => {
            try {
                await discoveryService.loadAllHubsFromFiles();
                
                const hubs = discoveryService.getDiscoveredHubs();

                if (hubs.length === 0) {
                    const message = `📋 No hubs registered yet.

Use /addhub <hub-name> to add a new hub.`;

                    return {
                        content: [
                            {
                                type: 'text',
                                text: message
                            }
                        ],
                        structuredContent: {
                            success: true,
                            hubs: [],
                            count: 0,
                            message: 'No hubs registered'
                        }
                    };
                }

                const hubList = hubs.map((hub, index) => 
                    `  ${index + 1}. ${hub.name}
     IP: ${hub.ip}
     Model: ${hub.model || 'Unknown'}
     Firmware: ${hub.firmware || 'Unknown'}`
                ).join('\n\n');

                const message = `📋 Registered Hubs (${hubs.length})

${hubList}

Use /connect with the IP address to connect to a hub.`;

                return {
                    content: [
                        {
                            type: 'text',
                            text: message
                        }
                    ],
                    structuredContent: {
                        success: true,
                        hubs: hubs.map(hub => ({
                            name: hub.name,
                            ip: hub.ip,
                            model: hub.model || 'Unknown',
                            firmware: hub.firmware || 'Unknown'
                        })),
                        count: hubs.length,
                        message: `Found ${hubs.length} hub(s)`
                    }
                };
            } catch (error) {
                const errorMessage = `Error listing hubs: ${(error as Error).message}`;
                return {
                    content: [
                        {
                            type: 'text',
                            text: `❌ ${errorMessage}`
                        }
                    ],
                    structuredContent: {
                        success: false,
                        hubs: [],
                        count: 0,
                        message: errorMessage
                    },
                    isError: true
                };
            }
        }
    );
}
