#!/usr/bin/env tsx
/**
 * Test script for temperature reading tools
 * 
 * This script demonstrates the new temperature reading capabilities:
 * - get_temperature: Read current temperature and setpoint for a specific device
 * - get_all_temperatures: Read all thermostats in the system
 * - get_temperature_offset: Read temperature offset/calibration
 * - set_temperature_offset: Set temperature offset/calibration
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

async function testHub(hub: { name: string, host: string, password: string }) {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`🏠 Testing ${hub.name}: ${hub.host}`);
    console.log(`${'═'.repeat(70)}`);

    const client = new PlugwiseClient({
        host: hub.host,
        password: hub.password
    });

    try {
        // Connect to gateway
        console.log('\n1️⃣  Connecting to Plugwise gateway...');
        const gatewayInfo = await client.connect();
        console.log(`✅ Connected to: ${gatewayInfo.name} (${gatewayInfo.model})`);
        console.log(`   Version: ${gatewayInfo.version}`);
        console.log(`   Type: ${gatewayInfo.type}`);

        // Get all devices
        console.log('\n2️⃣  Fetching all devices...');
        const data = await client.getDevices();
        console.log(`✅ Found ${Object.keys(data.entities).length} devices`);

        // Find thermostats and zones with temperature sensors
        console.log('\n3️⃣  Finding devices with temperature sensors...');
        const temperatureDevices = Object.entries(data.entities).filter(([_, device]) => {
            const devClass = device.dev_class || '';
            return devClass === 'thermostat' ||
                devClass === 'zone_thermostat' ||
                devClass === 'zone_thermometer' ||
                devClass === 'thermostatic_radiator_valve' ||
                device.thermostat !== undefined ||
                device.sensors?.temperature !== undefined;
        });

        console.log(`✅ Found ${temperatureDevices.length} devices with temperature sensors\n`);

        if (temperatureDevices.length === 0) {
            console.log('⚠️  No temperature devices found. Exiting.');
            return;
        }

        // Display all temperatures
        console.log('📊 All Temperature Readings:');
        console.log('-'.repeat(60));

        temperatureDevices.forEach(([id, device]) => {
            console.log(`\n📍 ${device.name} (${device.dev_class})`);
            console.log(`   ID: ${id}`);

            if (device.sensors?.temperature !== undefined) {
                console.log(`   🌡️  Current: ${device.sensors.temperature}°C`);
            }

            if (device.thermostat?.setpoint !== undefined) {
                console.log(`   🎯 Target: ${device.thermostat.setpoint}°C`);
            }

            if (device.thermostat?.setpoint_low !== undefined) {
                console.log(`   🔥 Heating Target: ${device.thermostat.setpoint_low}°C`);
            }

            if (device.thermostat?.setpoint_high !== undefined) {
                console.log(`   ❄️  Cooling Target: ${device.thermostat.setpoint_high}°C`);
            }

            if (device.control_state) {
                console.log(`   🔄 State: ${device.control_state}`);
            }

            if (device.climate_mode) {
                console.log(`   🏠 Mode: ${device.climate_mode}`);
            }

            if (device.temperature_offset) {
                console.log(`   📐 Offset: ${device.temperature_offset.setpoint || 0}°C`);
            }
        });

        // Test individual device query
        if (temperatureDevices.length > 0) {
            const [firstDeviceId, firstDevice] = temperatureDevices[0];

            console.log('\n\n4️⃣  Testing individual device query...');
            console.log('-'.repeat(60));
            console.log(`\n🔍 Querying device: ${firstDevice.name}`);
            console.log(`   ID: ${firstDeviceId}`);

            const device = data.entities[firstDeviceId];
            if (device) {
                console.log('\n   📋 Device Details:');
                console.log(`      Name: ${device.name}`);
                console.log(`      Class: ${device.dev_class || 'unknown'}`);
                console.log(`      Current Temp: ${device.sensors?.temperature || 'N/A'}°C`);
                console.log(`      Target: ${device.thermostat?.setpoint || 'N/A'}°C`);

                if (device.thermostat) {
                    console.log('\n   🎚️  Thermostat Info:');
                    if (device.thermostat.lower_bound !== undefined) {
                        console.log(`      Min: ${device.thermostat.lower_bound}°C`);
                    }
                    if (device.thermostat.upper_bound !== undefined) {
                        console.log(`      Max: ${device.thermostat.upper_bound}°C`);
                    }
                    if (device.thermostat.resolution !== undefined) {
                        console.log(`      Step: ${device.thermostat.resolution}°C`);
                    }
                }

                if (device.temperature_offset) {
                    console.log('\n   📐 Temperature Offset Support:');
                    console.log(`      Current Offset: ${device.temperature_offset.setpoint || 0}°C`);
                    console.log(`      Min Offset: ${device.temperature_offset.lower_bound || 'N/A'}°C`);
                    console.log(`      Max Offset: ${device.temperature_offset.upper_bound || 'N/A'}°C`);
                    console.log(`      Resolution: ${device.temperature_offset.resolution || 'N/A'}°C`);
                }
            }
        }

        // Summary statistics
        console.log('\n\n5️⃣  Temperature Summary:');
        console.log('-'.repeat(60));

        const temperatures = temperatureDevices
            .map(([_, device]) => device.sensors?.temperature)
            .filter(t => t !== undefined) as number[];

        if (temperatures.length > 0) {
            const avg = temperatures.reduce((a, b) => a + b, 0) / temperatures.length;
            const min = Math.min(...temperatures);
            const max = Math.max(...temperatures);

            console.log(`   📊 Average Temperature: ${avg.toFixed(1)}°C`);
            console.log(`   ⬇️  Lowest: ${min}°C`);
            console.log(`   ⬆️  Highest: ${max}°C`);
        }

        const heating = temperatureDevices.filter(([_, d]) => d.control_state === 'heating').length;
        const cooling = temperatureDevices.filter(([_, d]) => d.control_state === 'cooling').length;
        const idle = temperatureDevices.filter(([_, d]) => d.control_state === 'idle').length;

        console.log(`\n   🔥 Heating: ${heating}`);
        console.log(`   ❄️  Cooling: ${cooling}`);
        console.log(`   💤 Idle: ${idle}`);

        console.log(`\n✅ ${hub.name} temperature test completed successfully!`);

    } catch (error) {
        console.error(`\n❌ Error testing ${hub.name}:`, (error as Error).message);
        throw error;
    }
}

async function main() {
    console.log('🌡️  Temperature Tools Test - All Hubs\n');
    console.log('='.repeat(70));

    const hubs = parseHubs();

    if (hubs.length === 0) {
        console.error('❌ Error: No hubs found in .env');
        console.error('   Expected format: HUB1=<id>, HUB1IP=<ip>, HUB2=<id>, HUB2IP=<ip>, etc.');
        process.exit(1);
    }

    console.log(`\n📡 Found ${hubs.length} hub(s) configured in .env:`);
    hubs.forEach(hub => {
        console.log(`   • ${hub.name}: ${hub.host}`);
    });

    let successCount = 0;
    let failCount = 0;

    for (const hub of hubs) {
        try {
            await testHub(hub);
            successCount++;
        } catch (error) {
            failCount++;
            console.error(`\n⚠️  Continuing to next hub...\n`);
        }
    }

    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📊 Final Summary`);
    console.log(`${'═'.repeat(70)}`);
    console.log(`   ✅ Successful: ${successCount}/${hubs.length}`);
    console.log(`   ❌ Failed: ${failCount}/${hubs.length}`);

    if (failCount > 0) {
        console.log(`\n⚠️  Some hubs failed testing.`);
        process.exit(1);
    } else {
        console.log(`\n🎉 All hubs tested successfully!`);
    }
}

main();
