/**
 * Gateway Tools
 * Tools for controlling gateway settings and operations
 */

import { ConnectionService } from '../../services/connection.service.js';
import { GatewayMode, DHWMode, RegulationMode } from '../../types/plugwise-types.js';
import { ToolRegistry } from '../tool-registry.js';

export function registerGatewayTools(registry: ToolRegistry, connectionService: ConnectionService) {
    registry.registerTool(
        'set_gateway_mode',
        {
            title: 'Set Gateway Mode',
            description: 'Set the gateway mode (home, away, vacation). This is a system-wide setting that affects all zones and presets. Home mode uses normal schedules, away mode uses reduced temperatures, and vacation mode provides minimal heating/cooling.',
            inputSchema: {
                type: 'object',
                properties: {
                    mode: {
                        type: 'string',
                        enum: ['home', 'away', 'vacation'],
                        description: 'Gateway mode: "home" for normal operation, "away" for temporary absence, "vacation" for extended absence'
                    }
                },
                required: ['mode']
            }
        },
        async ({ mode }: { mode: 'home' | 'away' | 'vacation' }) => {
            try {
                const client = connectionService.ensureConnected();
                await client.setGatewayMode(mode as GatewayMode);

                const output = { success: true };

                return {
                    content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
                    structuredContent: output
                };
            } catch (error) {
                const output = { success: false, error: (error as Error).message };
                return {
                    content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
                    structuredContent: output
                };
            }
        }
    );

    registry.registerTool(
        'set_dhw_mode',
        {
            title: 'Set DHW Mode',
            description: 'Set the domestic hot water (DHW) heating mode for systems with hot water control. Auto mode follows the schedule, boost mode provides immediate hot water heating, comfort mode maintains higher temperature, and off mode disables DHW heating.',
            inputSchema: {
                type: 'object',
                properties: {
                    mode: {
                        type: 'string',
                        enum: ['auto', 'boost', 'comfort', 'off'],
                        description: 'DHW mode: "auto" follows schedule, "boost" for immediate heating, "comfort" for higher temperature, "off" to disable'
                    }
                },
                required: ['mode']
            }
        },
        async ({ mode }: { mode: 'auto' | 'boost' | 'comfort' | 'off' }) => {
            try {
                const client = connectionService.ensureConnected();
                await client.setDHWMode(mode as DHWMode);

                const output = { success: true };
                return {
                    content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
                    structuredContent: output
                };
            } catch (error) {
                const output = { success: false, error: (error as Error).message };
                return {
                    content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
                    structuredContent: output
                };
            }
        }
    );

    registry.registerTool(
        'set_regulation_mode',
        {
            title: 'Set Regulation Mode',
            description: 'Set the heating regulation mode. Controls the overall heating system behavior. Use "heating" for normal operation, "off" to disable heating, or bleeding modes for system maintenance.',
            inputSchema: {
                type: 'object',
                properties: {
                    mode: {
                        type: 'string',
                        enum: ['heating', 'off', 'bleeding_cold', 'bleeding_hot'],
                        description: 'Regulation mode: "heating" for normal operation, "off" to disable, "bleeding_cold"/"bleeding_hot" for maintenance'
                    }
                },
                required: ['mode']
            }
        },
        async ({ mode }: { mode: 'heating' | 'off' | 'bleeding_cold' | 'bleeding_hot' }) => {
            try {
                const client = connectionService.ensureConnected();
                await client.setRegulationMode(mode as RegulationMode);

                const output = { success: true };
                return {
                    content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
                    structuredContent: output
                };
            } catch (error) {
                const output = { success: false, error: (error as Error).message };
                return {
                    content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
                    structuredContent: output
                };
            }
        }
    );

    registry.registerTool(
        'delete_notification',
        {
            title: 'Delete Notification',
            description: 'Delete the active notification from the Plugwise gateway. Use this to clear system notifications, alerts, or warnings displayed on the gateway.',
            inputSchema: {
                type: 'object',
                properties: {}
            }
        },
        async () => {
            try {
                const client = connectionService.ensureConnected();
                await client.deleteNotification();

                const output = { success: true };
                return {
                    content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
                    structuredContent: output
                };
            } catch (error) {
                const output = { success: false, error: (error as Error).message };
                return {
                    content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
                    structuredContent: output
                };
            }
        }
    );

    registry.registerTool(
        'reboot_gateway',
        {
            title: 'Reboot Gateway',
            description: 'Reboot the Plugwise gateway (use with caution). This will restart the gateway, temporarily interrupting all control and monitoring. The gateway will be offline for 1-2 minutes. Only use when necessary for troubleshooting.',
            inputSchema: {
                type: 'object',
                properties: {}
            }
        },
        async () => {
            try {
                const client = connectionService.ensureConnected();
                await client.rebootGateway();

                const output = { success: true };
                return {
                    content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
                    structuredContent: output
                };
            } catch (error) {
                const output = { success: false, error: (error as Error).message };
                return {
                    content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
                    structuredContent: output
                };
            }
        }
    );
}
