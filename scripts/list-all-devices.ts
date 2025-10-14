#!/usr/bin/env tsx
/**
 * List All Devices Script
 * 
 * This script scans all configured Plugwise hubs and displays
 * all devices in a nicely formatted, organized view.
 * 
 * Features:
 * - Scans all hubs from .env (HUB1, HUB2, etc.)
 * - Groups devices by type/class
 * - Shows key device information
 * - Provides summary statistics
 */

import { PlugwiseClient } from '../src/mcp/plugwise-client.js';
import dotenv from 'dotenv';

dotenv.config();

// Parse all hubs from environment variables
function parseHubs(): Array<{ name: string, host: string, password: string }> {
    const hubs: Array<{ name: string, host: string, password: string }> = [];
    let hubNum = 1;

    while (true) {
        const hubId = process.env[`HUB${hubNum}`];
        const hubIp = process.env[`HUB${hubNum}IP`];

        if (!hubId || !hubIp) {
            break;
        }

        hubs.push({
            name: `HUB${hubNum}`,
            host: hubIp,
            password: hubId
        });

        hubNum++;
    }

    return hubs;
}

// Device type icons
const deviceIcons: Record<string, string> = {
    'gateway': '🌐',
    'thermostat': '🌡️',
    'zone_thermostat': '🎯',
    'zone_thermometer': '📊',
    'thermostatic_radiator_valve': '🔥',
    'central_heating_pump': '💧',
    'heater_central': '🏠',
    'switch': '🔌',
    'relay': '⚡',
    'sensor': '📡',
    'unknown': '❓'
};

function getDeviceIcon(devClass: string | undefined): string {
    if (!devClass) return deviceIcons.unknown;
    return deviceIcons[devClass] || deviceIcons.unknown;
}

// Format device capabilities
function getDeviceCapabilities(device: any): string[] {
    const capabilities: string[] = [];

    if (device.sensors?.temperature !== undefined) {
        capabilities.push('🌡️ Temperature');
    }
    if (device.thermostat) {
        capabilities.push('🎯 Thermostat');
    }
    if (device.switches) {
        capabilities.push('🔌 Switch');
    }
    if (device.lock) {
        capabilities.push('🔒 Lock');
    }
    if (device.regulation_mode) {
        capabilities.push('⚙️ Regulation');
    }
    if (device.available_schedules) {
        capabilities.push('📅 Schedules');
    }
    if (device.sensors?.dhw_temperature !== undefined) {
        capabilities.push('🚿 Hot Water');
    }
    if (device.sensors?.outdoor_temperature !== undefined) {
        capabilities.push('🌤️ Outdoor Temp');
    }

    return capabilities;
}

async function scanHub(hub: { name: string, host: string, password: string }) {
    console.log(`\n${'═'.repeat(80)}`);
    console.log(`🏠 ${hub.name}: ${hub.host}`);
    console.log(`${'═'.repeat(80)}`);

    const client = new PlugwiseClient({
        host: hub.host,
        password: hub.password
    });

    try {
        // Connect to gateway
        console.log('\n⚡ Connecting...');
        const gatewayInfo = await client.connect();
        console.log(`✅ Connected: ${gatewayInfo.name} (${gatewayInfo.model} v${gatewayInfo.version})`);

        // Get all devices
        const data = await client.getDevices();
        const devices = Object.entries(data.entities);

        console.log(`📦 Total Devices: ${devices.length}\n`);

        // Group devices by class
        const devicesByClass = new Map<string, Array<[string, any]>>();
        devices.forEach(([id, device]) => {
            const devClass = device.dev_class || 'unknown';
            if (!devicesByClass.has(devClass)) {
                devicesByClass.set(devClass, []);
            }
            devicesByClass.get(devClass)!.push([id, device]);
        });

        // Display devices grouped by class
        const sortedClasses = Array.from(devicesByClass.keys()).sort();

        for (const devClass of sortedClasses) {
            const classDevices = devicesByClass.get(devClass)!;
            const icon = getDeviceIcon(devClass);

            console.log(`\n${icon} ${devClass.toUpperCase().replace(/_/g, ' ')} (${classDevices.length})`);
            console.log('─'.repeat(80));

            classDevices.forEach(([id, device]) => {
                console.log(`\n  📌 ${device.name}`);
                console.log(`     ID: ${id}`);

                // Device class specific information
                if (device.vendor_name || device.vendor_model) {
                    console.log(`     Model: ${device.vendor_name || ''} ${device.vendor_model || ''}`.trim());
                }

                if (device.zigbee_mac_address) {
                    console.log(`     MAC: ${device.zigbee_mac_address}`);
                }

                // Always show temperature for zone thermometers
                if (devClass === 'zone_thermometer') {
                    if (device.sensors?.temperature !== undefined) {
                        console.log(`     🌡️  Temperature: ${device.sensors.temperature}°C`);
                    } else {
                        console.log(`     🌡️  Temperature: N/A`);
                    }
                } else if (device.sensors?.temperature !== undefined) {
                    // For all other device types, show temperature if available
                    console.log(`     🌡️  Temperature: ${device.sensors.temperature}°C`);
                }

                if (device.thermostat?.setpoint !== undefined) {
                    console.log(`     🎯 Setpoint: ${device.thermostat.setpoint}°C`);
                }

                if (device.sensors?.dhw_temperature !== undefined) {
                    console.log(`     🚿 Hot Water: ${device.sensors.dhw_temperature}°C`);
                }

                if (device.sensors?.outdoor_temperature !== undefined) {
                    console.log(`     🌤️  Outdoor: ${device.sensors.outdoor_temperature}°C`);
                }

                if (device.control_state) {
                    console.log(`     🔄 State: ${device.control_state}`);
                }

                if (device.climate_mode) {
                    console.log(`     🏠 Mode: ${device.climate_mode}`);
                }

                // Always show switch state(s) for switches
                if (devClass === 'switch' || devClass === 'relay' || (device.switches && Object.keys(device.switches).length > 0)) {
                    if (device.switches && Object.keys(device.switches).length > 0) {
                        const switchStates = Object.entries(device.switches).map(([name, state]) => {
                            return `${name}: ${state ? '✅ ON' : '❌ OFF'}`;
                        }).join(', ');
                        console.log(`     🔌 Switches: ${switchStates}`);
                    } else {
                        console.log(`     🔌 Switches: N/A`);
                    }
                }

                // Capabilities
                const capabilities = getDeviceCapabilities(device);
                if (capabilities.length > 0) {
                    console.log(`     💡 Capabilities: ${capabilities.join(', ')}`);
                }

                // Location
                if (device.location) {
                    console.log(`     📍 Location: ${device.location}`);
                }
            });
        }

        // Statistics
        console.log(`\n\n📊 ${hub.name} Statistics:`);
        console.log('─'.repeat(80));
        
        const stats = {
            total: devices.length,
            withTemp: devices.filter(([_, d]) => d.sensors?.temperature !== undefined).length,
            thermostats: devices.filter(([_, d]) => d.thermostat !== undefined).length,
            switches: devices.filter(([_, d]) => d.switches !== undefined).length,
            heating: devices.filter(([_, d]) => d.control_state === 'heating').length,
            cooling: devices.filter(([_, d]) => d.control_state === 'cooling').length,
            idle: devices.filter(([_, d]) => d.control_state === 'idle').length,
        };

        console.log(`   Total Devices: ${stats.total}`);
        console.log(`   Temperature Sensors: ${stats.withTemp}`);
        console.log(`   Thermostats: ${stats.thermostats}`);
        console.log(`   Switches: ${stats.switches}`);
        if (stats.heating > 0 || stats.cooling > 0 || stats.idle > 0) {
            console.log(`   Status: 🔥 ${stats.heating} heating, ❄️ ${stats.cooling} cooling, 💤 ${stats.idle} idle`);
        }

        // Temperature overview
        const temperatures = devices
            .map(([_, device]) => device.sensors?.temperature)
            .filter(t => t !== undefined) as number[];

        if (temperatures.length > 0) {
            const avg = temperatures.reduce((a, b) => a + b, 0) / temperatures.length;
            const min = Math.min(...temperatures);
            const max = Math.max(...temperatures);

            console.log(`\n   🌡️  Temperature Range: ${min}°C - ${max}°C (avg: ${avg.toFixed(1)}°C)`);
        }

        return {
            success: true,
            hubName: hub.name,
            gatewayName: gatewayInfo.name,
            deviceCount: devices.length,
            stats
        };

    } catch (error) {
        console.error(`\n❌ Error scanning ${hub.name}:`, (error as Error).message);
        return {
            success: false,
            hubName: hub.name,
            error: (error as Error).message
        };
    }
}

async function main() {
    console.log('🔍 Plugwise Device Scanner - All Hubs\n');
    console.log('='.repeat(80));

    const hubs = parseHubs();

    if (hubs.length === 0) {
        console.error('\n❌ Error: No hubs found in .env');
        console.error('   Expected format: HUB1=<id>, HUB1IP=<ip>, HUB2=<id>, HUB2IP=<ip>, etc.');
        process.exit(1);
    }

    console.log(`\n📡 Found ${hubs.length} hub(s) configured:\n`);
    hubs.forEach(hub => {
        console.log(`   • ${hub.name}: ${hub.host}`);
    });

    const results = [];

    for (const hub of hubs) {
        const result = await scanHub(hub);
        results.push(result);
    }

    // Overall summary
    console.log(`\n\n${'═'.repeat(80)}`);
    console.log(`📊 Overall Summary`);
    console.log(`${'═'.repeat(80)}\n`);

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`Hubs Scanned: ${successful.length}/${hubs.length} successful`);

    if (successful.length > 0) {
        const totalDevices = successful.reduce((sum, r) => sum + (r.deviceCount || 0), 0);
        console.log(`Total Devices Found: ${totalDevices}`);

        console.log(`\nHub Details:`);
        successful.forEach(r => {
            console.log(`   ✅ ${r.hubName}: ${r.gatewayName} - ${r.deviceCount} devices`);
        });
    }

    if (failed.length > 0) {
        console.log(`\nFailed Hubs:`);
        failed.forEach(r => {
            console.log(`   ❌ ${r.hubName}: ${r.error}`);
        });
    }

    if (failed.length > 0) {
        console.log(`\n⚠️  Some hubs failed scanning.`);
        process.exit(1);
    } else {
        console.log(`\n🎉 All hubs scanned successfully!`);
    }
}

main();
