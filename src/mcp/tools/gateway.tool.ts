/**
 * Gateway Tools
 * Tools for controlling gateway settings and operations
 */

import { z } from 'zod';
import { ConnectionService } from '../../services/connection.service.js';
import { GatewayMode, DHWMode, RegulationMode } from '../../types/plugwise-types.js';

export function registerGatewayTools(server: any, connectionService: ConnectionService) {
    // Set Gateway Mode Tool
    server.registerTool(
        'set_gateway_mode',
        {
            title: 'Set Gateway Mode',
            description: 'Set the gateway mode (home, away, vacation)',
            inputSchema: {
                mode: z.enum(['home', 'away', 'vacation']).describe('Gateway mode')
            },
            outputSchema: {
                success: z.boolean(),
                error: z.string().optional()
            }
        },
        async ({ mode }: { mode: 'home' | 'away' | 'vacation' }) => {
            try {
                const client = connectionService.ensureConnected();
                await client.setGatewayMode(mode as GatewayMode);

                const output = { success: true };

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

    // Set DHW Mode Tool
    server.registerTool(
        'set_dhw_mode',
        {
            title: 'Set DHW Mode',
            description: 'Set the domestic hot water (DHW) heating mode',
            inputSchema: {
                mode: z.enum(['auto', 'boost', 'comfort', 'off']).describe('DHW mode')
            },
            outputSchema: {
                success: z.boolean(),
                error: z.string().optional()
            }
        },
        async ({ mode }: { mode: 'auto' | 'boost' | 'comfort' | 'off' }) => {
            try {
                const client = connectionService.ensureConnected();
                await client.setDHWMode(mode as DHWMode);

                const output = { success: true };

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

    // Set Regulation Mode Tool
    server.registerTool(
        'set_regulation_mode',
        {
            title: 'Set Regulation Mode',
            description: 'Set the heating regulation mode',
            inputSchema: {
                mode: z.enum(['heating', 'off', 'bleeding_cold', 'bleeding_hot']).describe('Regulation mode')
            },
            outputSchema: {
                success: z.boolean(),
                error: z.string().optional()
            }
        },
        async ({ mode }: { mode: 'heating' | 'off' | 'bleeding_cold' | 'bleeding_hot' }) => {
            try {
                const client = connectionService.ensureConnected();
                await client.setRegulationMode(mode as RegulationMode);

                const output = { success: true };

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

    // Delete Notification Tool
    server.registerTool(
        'delete_notification',
        {
            title: 'Delete Notification',
            description: 'Delete the active notification from the Plugwise gateway',
            inputSchema: {},
            outputSchema: {
                success: z.boolean(),
                error: z.string().optional()
            }
        },
        async () => {
            try {
                const client = connectionService.ensureConnected();
                await client.deleteNotification();

                const output = { success: true };

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

    // Reboot Gateway Tool
    server.registerTool(
        'reboot_gateway',
        {
            title: 'Reboot Gateway',
            description: 'Reboot the Plugwise gateway (use with caution)',
            inputSchema: {},
            outputSchema: {
                success: z.boolean(),
                error: z.string().optional()
            }
        },
        async () => {
            try {
                const client = connectionService.ensureConnected();
                await client.rebootGateway();

                const output = { success: true };

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
