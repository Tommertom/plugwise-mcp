/**
 * Temperature Tools
 * Tools for controlling temperature and presets
 */

import { z } from 'zod';
import { ConnectionService } from '../services/connection.service.js';

export function registerTemperatureTools(server: any, connectionService: ConnectionService) {
    // Set Temperature Tool
    server.registerTool(
        'set_temperature',
        {
            title: 'Set Temperature',
            description: 'Set the temperature setpoint on a thermostat or zone',
            inputSchema: {
                location_id: z.string().describe('ID of the location/zone'),
                setpoint: z.number().optional().describe('Temperature setpoint in Celsius'),
                setpoint_low: z.number().optional().describe('Low temperature setpoint (heating) in Celsius'),
                setpoint_high: z.number().optional().describe('High temperature setpoint (cooling) in Celsius')
            },
            outputSchema: {
                success: z.boolean(),
                error: z.string().optional()
            }
        },
        async ({ location_id, setpoint, setpoint_low, setpoint_high }: {
            location_id: string;
            setpoint?: number;
            setpoint_low?: number;
            setpoint_high?: number;
        }) => {
            try {
                const client = connectionService.ensureConnected();

                await client.setTemperature({
                    location_id,
                    setpoint,
                    setpoint_low,
                    setpoint_high
                });

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

    // Set Preset Tool
    server.registerTool(
        'set_preset',
        {
            title: 'Set Preset',
            description: 'Set the preset mode on a thermostat (e.g., home, away, sleep)',
            inputSchema: {
                location_id: z.string().describe('ID of the location/zone'),
                preset: z.string().describe('Preset name (e.g., home, away, sleep, vacation)')
            },
            outputSchema: {
                success: z.boolean(),
                error: z.string().optional()
            }
        },
        async ({ location_id, preset }: { location_id: string; preset: string }) => {
            try {
                const client = connectionService.ensureConnected();
                await client.setPreset(location_id, preset);

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

    // Get Temperature Tool
    server.registerTool(
        'get_temperature',
        {
            title: 'Get Temperature',
            description: 'Get current room temperature and setpoint for a specific thermostat or zone. Returns both the measured temperature and the target setpoint.',
            inputSchema: {
                device_id: z.string().describe('ID of the device/zone to read temperature from')
            },
            outputSchema: {
                success: z.boolean(),
                data: z.object({
                    device_id: z.string(),
                    device_name: z.string(),
                    current_temperature: z.number().optional().describe('Current measured room temperature in °C'),
                    target_setpoint: z.number().optional().describe('Target temperature setpoint in °C'),
                    setpoint_low: z.number().optional().describe('Heating setpoint for heat pump systems in °C'),
                    setpoint_high: z.number().optional().describe('Cooling setpoint for heat pump systems in °C'),
                    control_state: z.string().optional().describe('Current state: idle, heating, cooling, or preheating'),
                    climate_mode: z.string().optional().describe('Climate mode: heat, cool, auto, etc.')
                }).optional(),
                error: z.string().optional()
            }
        },
        async ({ device_id }: { device_id: string }) => {
            try {
                const client = connectionService.ensureConnected();
                const data = await client.getDevices();

                const device = data.entities[device_id];
                if (!device) {
                    throw new Error(`Device ${device_id} not found`);
                }

                const result = {
                    device_id,
                    device_name: device.name,
                    current_temperature: device.sensors?.temperature,
                    target_setpoint: device.thermostat?.setpoint,
                    setpoint_low: device.thermostat?.setpoint_low,
                    setpoint_high: device.thermostat?.setpoint_high,
                    control_state: device.control_state,
                    climate_mode: device.climate_mode
                };

                const output = {
                    success: true,
                    data: result
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

    // Get All Temperatures Tool
    server.registerTool(
        'get_all_temperatures',
        {
            title: 'Get All Temperatures',
            description: 'Get current temperatures and setpoints for all thermostats and zones in the system',
            inputSchema: {},
            outputSchema: {
                success: z.boolean(),
                data: z.array(z.object({
                    device_id: z.string(),
                    device_name: z.string(),
                    device_class: z.string(),
                    current_temperature: z.number().optional(),
                    target_setpoint: z.number().optional(),
                    setpoint_low: z.number().optional(),
                    setpoint_high: z.number().optional(),
                    control_state: z.string().optional(),
                    climate_mode: z.string().optional()
                })).optional(),
                error: z.string().optional()
            }
        },
        async () => {
            try {
                const client = connectionService.ensureConnected();
                const data = await client.getDevices();

                const thermostats = Object.entries(data.entities)
                    .filter(([_, device]) => {
                        const devClass = device.dev_class || '';
                        return devClass === 'thermostat' ||
                            devClass === 'zone_thermostat' ||
                            devClass === 'zone_thermometer' ||
                            devClass === 'thermostatic_radiator_valve' ||
                            device.thermostat !== undefined ||
                            device.sensors?.temperature !== undefined;
                    })
                    .map(([id, device]) => ({
                        device_id: id,
                        device_name: device.name,
                        device_class: device.dev_class || 'unknown',
                        current_temperature: device.sensors?.temperature,
                        target_setpoint: device.thermostat?.setpoint,
                        setpoint_low: device.thermostat?.setpoint_low,
                        setpoint_high: device.thermostat?.setpoint_high,
                        control_state: device.control_state,
                        climate_mode: device.climate_mode
                    }));

                const output = {
                    success: true,
                    data: thermostats
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

    // Get Temperature Offset Tool
    server.registerTool(
        'get_temperature_offset',
        {
            title: 'Get Temperature Offset',
            description: 'Get the temperature offset (calibration) for a thermostat device',
            inputSchema: {
                device_id: z.string().describe('ID of the thermostat device')
            },
            outputSchema: {
                success: z.boolean(),
                data: z.object({
                    device_id: z.string(),
                    device_name: z.string(),
                    offset: z.number().optional().describe('Temperature offset in °C'),
                    lower_bound: z.number().optional(),
                    upper_bound: z.number().optional(),
                    resolution: z.number().optional()
                }).optional(),
                error: z.string().optional()
            }
        },
        async ({ device_id }: { device_id: string }) => {
            try {
                const client = connectionService.ensureConnected();
                const data = await client.getDevices();

                const device = data.entities[device_id];
                if (!device) {
                    throw new Error(`Device ${device_id} not found`);
                }

                if (!device.temperature_offset) {
                    throw new Error(`Device ${device.name} does not support temperature offset`);
                }

                const result = {
                    device_id,
                    device_name: device.name,
                    offset: device.temperature_offset.setpoint,
                    lower_bound: device.temperature_offset.lower_bound,
                    upper_bound: device.temperature_offset.upper_bound,
                    resolution: device.temperature_offset.resolution
                };

                const output = {
                    success: true,
                    data: result
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

    // Set Temperature Offset Tool
    server.registerTool(
        'set_temperature_offset',
        {
            title: 'Set Temperature Offset',
            description: 'Set the temperature offset (calibration) for a thermostat device. This adjusts the measured temperature by a fixed offset.',
            inputSchema: {
                device_id: z.string().describe('ID of the thermostat device'),
                offset: z.number().describe('Temperature offset in °C (can be positive or negative)')
            },
            outputSchema: {
                success: z.boolean(),
                error: z.string().optional()
            }
        },
        async ({ device_id, offset }: { device_id: string; offset: number }) => {
            try {
                const client = connectionService.ensureConnected();
                await client.setTemperatureOffset(device_id, offset);

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
