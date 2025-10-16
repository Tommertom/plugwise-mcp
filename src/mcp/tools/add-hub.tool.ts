/**
 * Add Hub Tool
 * Tool for adding a new Plugwise hub by scanning the network with a specific hub name/password
 */

import { HubDiscoveryService } from '../../services/hub-discovery.service.js';

export function registerAddHubTool(server: any, discoveryService: HubDiscoveryService) {
    server.registerTool(
        'add_hub',
        {
            title: 'Add Plugwise Hub',
            description: 'Add a new Plugwise hub by providing its name (used as password). Scans the network to find the hub and stores it in the /hubs folder.',
            inputSchema: {
                hubName: {
                    type: 'string',
                    description: 'The hub name/ID (e.g., glmpuuxg) which is also used as the password'
                }
            },
            outputSchema: {
                success: {
                    type: 'boolean'
                },
                hub: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        ip: { type: 'string' },
                        model: { type: 'string' },
                        firmware: { type: 'string' }
                    },
                    optional: true
                },
                message: {
                    type: 'string'
                },
                error: {
                    type: 'string',
                    optional: true
                }
            }
        },
        async ({ hubName }: { hubName?: string }) => {
            // Validate input
            if (!hubName || hubName.trim() === '') {
                const syntaxMessage = `❌ Hub name is required.

Syntax: /addhub <hub-name>

Example: /addhub glmpuuxg

The hub name is the unique identifier/password for your Plugwise hub.`;

                return {
                    content: [
                        {
                            type: 'text',
                            text: syntaxMessage
                        }
                    ],
                    structuredContent: {
                        success: false,
                        message: syntaxMessage
                    }
                };
            }

            try {
                console.log(`🔍 Searching for hub: ${hubName}`);
                
                // Scan the network for the hub using the provided name as password
                const result = await discoveryService.addHubByName(hubName.trim());

                if (result.success && result.hub) {
                    const successMessage = `✅ Hub found and added successfully!

Hub Details:
  Name: ${result.hub.name}
  IP: ${result.hub.ip}
  Model: ${result.hub.model || 'Unknown'}
  Firmware: ${result.hub.firmware || 'Unknown'}

The hub has been saved to: /hubs/${hubName}.json`;

                    return {
                        content: [
                            {
                                type: 'text',
                                text: successMessage
                            }
                        ],
                        structuredContent: {
                            success: true,
                            hub: {
                                name: result.hub.name,
                                ip: result.hub.ip,
                                model: result.hub.model,
                                firmware: result.hub.firmware
                            },
                            message: successMessage
                        }
                    };
                } else {
                    const errorMessage = result.error || 'Hub not found on the network';
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `❌ ${errorMessage}`
                            }
                        ],
                        structuredContent: {
                            success: false,
                            message: errorMessage,
                            error: errorMessage
                        }
                    };
                }
            } catch (error) {
                const errorMessage = `Error adding hub: ${(error as Error).message}`;
                return {
                    content: [
                        {
                            type: 'text',
                            text: `❌ ${errorMessage}`
                        }
                    ],
                    structuredContent: {
                        success: false,
                        message: errorMessage,
                        error: errorMessage
                    }
                };
            }
        }
    );
}
