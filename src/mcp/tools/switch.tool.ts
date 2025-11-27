/**
 * Switch Tools
 * Tools for controlling switches and relays
 */

import { ConnectionService } from '../../services/connection.service.js';
import { ToolRegistry } from '../tool-registry.js';
import { successResponse, errorResponse } from './tool-helpers.js';

export function registerSwitchTools(registry: ToolRegistry, connectionService: ConnectionService) {
    registry.registerTool(
        'control_switch',
        {
            title: 'Control Switch',
            description: 'Turn a switch or relay on or off. Works with Plugwise switches, relays, and smart plugs. Use this to control any switchable device in your Plugwise network.',
            inputSchema: {
                type: 'object',
                properties: {
                    appliance_id: {
                        type: 'string',
                        description: 'ID of the appliance/device to control'
                    },
                    state: {
                        type: 'string',
                        enum: ['on', 'off'],
                        description: 'Desired state: "on" to turn on, "off" to turn off'
                    },
                    model: {
                        type: 'string',
                        description: 'Switch model type (default: relay). Options: relay, switch, plug'
                    }
                },
                required: ['appliance_id', 'state']
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
                return successResponse({ success: true, new_state: newState });
            } catch (error) {
                return errorResponse(error as Error);
            }
        }
    );
}
