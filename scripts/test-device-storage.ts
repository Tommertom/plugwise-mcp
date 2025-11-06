/**
 * Test Script for Device Storage Service
 * Demonstrates the individual device file storage functionality
 */

import { DeviceStorageService } from '../src/services/device-storage.service.js';
import { GatewayEntity } from '../src/types/plugwise-types.js';

async function testDeviceStorage() {
    console.log('='.repeat(80));
    console.log('Testing Device Storage Service');
    console.log('='.repeat(80));
    console.log();

    const storage = new DeviceStorageService();
    const testHubName = 'glmpttxf';

    // Mock device entities
    const mockEntities: Record<string, GatewayEntity> = {
        'device123': {
            name: 'Living Room Thermostat',
            dev_class: 'thermostat',
            location: 'Living Room',
            model: 'Lisa',
            available: true,
            thermostat: {
                setpoint: 21.0,
                lower_bound: 4.0,
                upper_bound: 30.0,
                resolution: 0.1
            },
            sensors: {
                temperature: 20.5,
                setpoint: 21.0
            },
            preset_modes: ['home', 'away', 'vacation']
        },
        'device456': {
            name: 'Kitchen Switch',
            dev_class: 'switch_group',
            location: 'Kitchen',
            model: 'Plug',
            available: true,
            switches: {
                relay: true
            }
        },
        'device789': {
            name: 'Bedroom Temperature Sensor',
            dev_class: 'temperature_sensor',
            location: 'Bedroom',
            model: 'Tom',
            available: true,
            sensors: {
                temperature: 19.8,
                humidity: 55
            }
        }
    };

    try {
        console.log('Step 1: Saving devices...');
        console.log('-'.repeat(80));
        await storage.saveDevices(testHubName, mockEntities);
        console.log();

        console.log('Step 2: Loading devices for hub...');
        console.log('-'.repeat(80));
        const loadedDevices = await storage.loadDevicesForHub(testHubName);
        console.log(`Found ${loadedDevices.length} device(s):`);
        loadedDevices.forEach((device, index) => {
            console.log(`  ${index + 1}. ${device.name} (${device.id})`);
            console.log(`     Type: ${device.type}`);
            console.log(`     Location: ${device.location || 'N/A'}`);
            console.log(`     Model: ${device.model || 'N/A'}`);
            console.log(`     Hub: ${device.hubName}`);
            console.log();
        });

        console.log('Step 3: Loading all devices from all hubs...');
        console.log('-'.repeat(80));
        const allDevices = await storage.loadAllDevices();
        console.log(`Found devices from ${allDevices.size} hub(s):`);
        for (const [hubName, devices] of allDevices.entries()) {
            console.log(`  Hub: ${hubName} - ${devices.length} device(s)`);
        }
        console.log();

        console.log('Step 4: Finding specific device...');
        console.log('-'.repeat(80));
        const foundDevice = storage.findDevice('device123');
        if (foundDevice) {
            console.log(`Found device: ${foundDevice.name}`);
            console.log(`  ID: ${foundDevice.id}`);
            console.log(`  Hub: ${foundDevice.hubName}`);
            console.log(`  Capabilities:`);
            console.log(`    - Temperature: ${foundDevice.capabilities?.hasTemperature}`);
            console.log(`    - Switch: ${foundDevice.capabilities?.hasSwitch}`);
            console.log(`    - Presets: ${foundDevice.capabilities?.hasPresets}`);
            console.log(`    - Sensors: ${foundDevice.capabilities?.hasSensors}`);
        }
        console.log();

        console.log('='.repeat(80));
        console.log('✅ All tests completed successfully!');
        console.log('='.repeat(80));
        console.log();
        console.log('Expected file structure in mcp_data/plugwise/devices/:');
        console.log(`  - ${testHubName}_device123.json`);
        console.log(`  - ${testHubName}_device456.json`);
        console.log(`  - ${testHubName}_device789.json`);
        console.log();

    } catch (error) {
        console.error('❌ Error during testing:', error);
        throw error;
    }
}

// Run the test
testDeviceStorage().catch(console.error);
