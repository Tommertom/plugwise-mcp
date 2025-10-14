/**
 * Switch Tools
 * Tools for controlling switches and relays
 */

import { z } from 'zod';
import { ConnectionService } from '../../services/connection.service.js';

export function registerSwitchTools(server: any, connectionService: ConnectionService) {
    server.registerTool(
        'control_switch',
        {
            title: 'Control Switch',
            description: 'Turn a switch or relay on or off',
            inputSchema: {
                appliance_id: z.string().describe('ID of the appliance/device'),
                state: z.enum(['on', 'off']).describe('Desired state'),
                model: z.string().optional().describe('Switch model type (default: relay)')
            },
            outputSchema: {
                success: z.boolean(),
                new_state: z.boolean().optional(),
                error: z.string().optional()
            }
        },
        async ({ appliance_id, state, model }: {
            appliance_id: string;
            state: 'on' | 'off';
            model?: string;
        }) => {
            try {
                const client = connectionService.ensureConnected();

                const newState = await client.setSwitchState({
                    appliance_id,
                    state,
                    model
                });

                const output = {
                    success: true,
                    new_state: newState
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
