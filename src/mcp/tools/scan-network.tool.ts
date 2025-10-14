/**
 * Scan Network Tool
 * Tool for discovering Plugwise hubs on the network
 */

import { z } from 'zod';
import { HubDiscoveryService } from '../services/hub-discovery.service.js';

export function registerScanNetworkTool(server: any, discoveryService: HubDiscoveryService) {
    server.registerTool(
        'scan_network',
        {
            title: 'Scan Network for Plugwise Hubs',
            description: 'Scan the local network for Plugwise hubs using passwords from .env file (HUB1, HUB2, etc.). Discovered hubs are stored in the server for quick connection.',
            inputSchema: {
                network: z.string().optional().describe('Network to scan in CIDR notation (e.g., 192.168.1.0/24). If not provided, auto-detects local network.')
            },
            outputSchema: {
                success: z.boolean(),
                discovered: z.array(z.object({
                    name: z.string(),
                    ip: z.string(),
                    password: z.string(),
                    model: z.string().optional(),
                    firmware: z.string().optional()
                })),
                scanned_ips: z.number(),
                error: z.string().optional()
            }
        },
        async ({ network }: { network?: string }) => {
            try {
                const result = await discoveryService.scanNetwork(network);

                const output = {
                    success: true,
                    discovered: result.discovered.map(h => ({
                        name: h.name,
                        ip: h.ip,
                        password: h.password,
                        model: h.model,
                        firmware: h.firmware
                    })),
                    scanned_ips: result.scannedCount
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
                    discovered: [],
                    scanned_ips: 0,
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
