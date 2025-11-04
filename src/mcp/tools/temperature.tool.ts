/**
 * Temperature Tools
 * Tools for controlling temperature and presets
 */

import { ConnectionService } from '../../services/connection.service.js';
import { ToolRegistry } from '../tool-registry.js';

export function registerTemperatureTools(registry: ToolRegistry, connectionService: ConnectionService) {
    // Set Temperature Tool
    registry.registerTool(
        'set_temperature',
        {
            title: 'Set Temperature',
            description: 'Set the temperature setpoint on a thermostat or zone. Supports single setpoint for heating/cooling systems, or separate low/high setpoints for heat pump systems. Changes take effect immediately.',
            inputSchema: {
                type: 'object',
                properties: {
                    location_id: {
                        type: 'string',
                        description: 'ID of the location/zone to control'
                    },
                    setpoint: {
                        type: 'number',
                        description: 'Temperature setpoint in Celsius for single-setpoint systems'
                    },
                    setpoint_low: {
                        type: 'number',
                        description: 'Low temperature setpoint (heating) in Celsius for heat pump systems'
                    },
                    setpoint_high: {
                        type: 'number',
                        description: 'High temperature setpoint (cooling) in Celsius for heat pump systems'
                    }
                },
                required: ['location_id']
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

    // Set Preset Tool
    registry.registerTool(
        'set_preset',
        {
            title: 'Set Preset',
            description: 'Set the preset mode on a thermostat or zone (e.g., home, away, sleep, vacation). Presets apply predefined temperature settings and behaviors configured in your Plugwise system.',
            inputSchema: {
                type: 'object',
                properties: {
                    location_id: {
                        type: 'string',
                        description: 'ID of the location/zone to control'
                    },
                    preset: {
                        type: 'string',
                        description: 'Preset name (e.g., home, away, sleep, vacation, no_frost)'
                    }
                },
                required: ['location_id', 'preset']
            }
        },
        async ({ location_id, preset }: { location_id: string; preset: string }) => {
            try {
                const client = connectionService.ensureConnected();
                await client.setPreset(location_id, preset);

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

    // Get Temperature Tool
    registry.registerTool(
        'get_temperature',
        {
            title: 'Get Temperature',
            description: 'Get current room temperature and setpoint for a specific thermostat or zone. Returns both the measured temperature and the target setpoint.',
            inputSchema: {
                type: 'object',
                properties: {
                    device_id: {
                        type: 'string',
                        description: 'ID of the device/zone to read temperature from'
                    }
                },
                required: ['device_id']
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

                const output = { success: true, data: result };

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

    // Get All Temperatures Tool
    registry.registerTool(
        'get_all_temperatures',
        {
            title: 'Get All Temperatures',
            description: 'Get current temperatures and setpoints for all thermostats and zones in the system. Returns comprehensive temperature data including measured values, setpoints, control states, and climate modes for every temperature-capable device.',
            inputSchema: {
                type: 'object',
                properties: {}
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

                const output = { success: true, data: thermostats };

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

    // Get Temperature Offset Tool
    registry.registerTool(
        'get_temperature_offset',
        {
            title: 'Get Temperature Offset',
            description: 'Get the temperature offset (calibration) for a thermostat device. The offset is used to calibrate the temperature sensor if it reads incorrectly. Returns the current offset value and its valid range.',
            inputSchema: {
                type: 'object',
                properties: {
                    device_id: {
                        type: 'string',
                        description: 'ID of the thermostat device to query'
                    }
                },
                required: ['device_id']
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

                const output = { success: true, data: result };

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

    // Set Temperature Offset Tool
    registry.registerTool(
        'set_temperature_offset',
        {
            title: 'Set Temperature Offset',
            description: 'Set the temperature offset (calibration) for a thermostat device. This adjusts the measured temperature by a fixed offset.',
            inputSchema: {
                type: 'object',
                properties: {
                    device_id: {
                        type: 'string',
                        description: 'ID of the thermostat device'
                    },
                    offset: {
                        type: 'number',
                        description: 'Temperature offset in °C (can be positive or negative)'
                    }
                },
                required: ['device_id', 'offset']
            }
        },
        async ({ device_id, offset }: { device_id: string; offset: number }) => {
            try {
                const client = connectionService.ensureConnected();
                await client.setTemperatureOffset(device_id, offset);

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
