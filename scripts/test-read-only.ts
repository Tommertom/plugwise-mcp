#!/usr/bin/env node
/**
 * Read-Only API Tests for Plugwise MCP Server
 * 
 * Tests the following read-only features:
 * - Network Scanning (discover Plugwise hubs)
 * - Gateway Connection (connect and get gateway info)
 * - Device Discovery (get all devices and their states)
 * - Device State Reading (sensors, switches, thermostats)
 * - Gateway Information Reading
 * 
 * Usage:
 * - With device discovery: npm run test:read-only
 * - With manual device IP: PLUGWISE_HOST=192.168.1.100 PLUGWISE_PASSWORD=yourpass npm run test:read-only
 * - With mock mode (no real devices): npm run test:read-only -- --mock
 * - With mock mode (env var): MOCK_DEVICES=true npm run test:read-only
 * 
 * Note: This test performs ONLY read operations - no state changes are made.
 */

import { spawn, type ChildProcess } from 'child_process';
import {
    initializeMcpConnection,
    listHubs,
    callTool,
    runTest,
    wait,
} from './test-utils.js';

let mcpProcess: ChildProcess;
let gatewayHost: string;
let gatewayPassword: string;
let mockMode = false;

/**
 * Helper function to call tools with mock support
 */
async function callToolSafe(toolCall: any): Promise<any> {
    if (mockMode) {
        // Return mock data based on tool name
        const toolName = toolCall.name;

        if (toolName === 'list_hubs') {
            return {
                hubs: [
                    { ip: '192.168.1.100', name: 'Mock Plugwise Gateway', model: 'Adam' },
                ],
            };
        }

        if (toolName === 'connect') {
            return {
                success: true,
                gateway_info: {
                    name: 'Mock Plugwise Gateway',
                    type: 'thermostat',
                    model: 'Adam',
                    version: '3.7.6',
                    hostname: 'smile000000',
                    mac_address: '00:00:00:00:00:00',
                },
            };
        }

        if (toolName === 'get_devices') {
            return {
                gateway_id: 'mock-gateway-id',
                heater_id: 'mock-heater-id',
                gateway_info: {
                    name: 'Mock Plugwise Gateway',
                    type: 'thermostat',
                    model: 'Adam',
                    version: '3.7.6',
                },
                entities: {
                    'mock-zone-1': {
                        name: 'Living Room',
                        dev_class: 'zone',
                        available: true,
                        sensors: {
                            temperature: 21.5,
                        },
                        thermostat: {
                            setpoint: 20.0,
                            lower_bound: 4.0,
                            upper_bound: 30.0,
                            resolution: 0.5,
                        },
                        active_preset: 'home',
                    },
                    'mock-device-1': {
                        name: 'Radiator Valve',
                        dev_class: 'valve',
                        model: 'Tom/Floor',
                        available: true,
                        sensors: {
                            temperature: 21.2,
                            valve_position: 45,
                        },
                    },
                    'mock-relay-1': {
                        name: 'Smart Plug',
                        dev_class: 'relay',
                        available: true,
                        switches: {
                            relay: true,
                        },
                    },
                },
            };
        }

        if (toolName === 'get_gateway_info') {
            return {
                name: 'Mock Plugwise Gateway',
                type: 'thermostat',
                model: 'Adam',
                version: '3.7.6',
                hostname: 'smile000000',
                connected: true,
            };
        }

        return { success: true };
    }

    return await callTool(mcpProcess, toolCall);
}

async function startMcpServer(): Promise<void> {
    console.log('🚀 Starting Plugwise MCP Server in stdio mode...\n');

    mcpProcess = spawn('node', ['dist/index.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false,
    });

    // Log server output
    mcpProcess.stdout?.on('data', (data) => {
        const output = data.toString().trim();
        if (output && !output.includes('"jsonrpc"')) {
            console.log('[Server]', output);
        }
    });

    mcpProcess.stderr?.on('data', (data) => {
        console.error('[Server Error]', data.toString());
    });

    // Give server time to start
    await wait(1000);
}

async function initializeAndDiscover(): Promise<void> {
    console.log('🔌 Initializing MCP connection...\n');
    await initializeMcpConnection(mcpProcess);

    // Check for manual device configuration via environment variables
    const manualHost = process.env.PLUGWISE_HOST;
    const manualPassword = process.env.PLUGWISE_PASSWORD;

    if (manualHost && manualPassword) {
        console.log(`📍 Using manual gateway configuration: ${manualHost}\n`);
        gatewayHost = manualHost;
        gatewayPassword = manualPassword;
        console.log(`✅ Configured gateway: ${gatewayHost}\n`);
        return;
    }

    console.log('🔍 Discovering Plugwise hubs on the network...\n');

    // Check if mock mode is enabled via environment variable or command line
    mockMode = process.env.MOCK_DEVICES === 'true' || process.argv.includes('--mock');

    if (mockMode) {
        console.log('⚠️  Running in MOCK MODE (no real devices required)\n');
        gatewayHost = '192.168.1.100';
        gatewayPassword = 'mock-password';
        console.log(`✅ Created mock gateway: ${gatewayHost}\n`);
        return;
    }

    const hubs = await listHubs(mcpProcess);

    if (hubs.length === 0) {
        console.log('\n⚠️  No Plugwise hubs found on the network.\n');
        console.log('To run this test, you need:');
        console.log('  1. At least one Plugwise gateway powered on');
        console.log('  2. This computer on the same network as the gateway');
        console.log('  3. Gateway password configured in environment\n');
        console.log('Alternatively, you can:');
        console.log('  • Use manual configuration: PLUGWISE_HOST=192.168.1.100 PLUGWISE_PASSWORD=yourpass npm run test:read-only');
        console.log('  • Run in mock mode: npm run test:read-only -- --mock');
        console.log('  • Or use environment variable: MOCK_DEVICES=true npm run test:read-only\n');
        throw new Error(
            'No Plugwise hubs found. Please ensure gateway is on the network, use manual configuration, or use --mock flag.'
        );
    }

    gatewayHost = (hubs[0] as any).ip || (hubs[0] as any).host;
    gatewayPassword = process.env.PLUGWISE_PASSWORD || '';

    if (!gatewayPassword) {
        throw new Error('PLUGWISE_PASSWORD environment variable is required for discovered gateways');
    }

    console.log(`✅ Found ${hubs.length} hub(s)`);
    console.log(`   Using hub: ${hubs[0].name || gatewayHost}\n`);
}

async function testNetworkScanning(): Promise<void> {
    console.log('🔍 Testing Hub Listing\n');

    await runTest('List Hubs', async () => {
        const result = await callToolSafe({
            name: 'list_hubs',
            arguments: {},
        });

        if (!result || !Array.isArray(result.hubs)) {
            throw new Error('Invalid list response');
        }

        console.log(`   Found ${result.hubs.length} hub(s)`);
        if (result.hubs.length > 0) {
            console.log(`   First hub: ${result.hubs[0].name || result.hubs[0].host}`);
        }
    });
}

async function testGatewayConnection(): Promise<void> {
    console.log('\n🔌 Testing Gateway Connection\n');

    await runTest('Connect to Gateway', async () => {
        const result = await callToolSafe({
            name: 'connect',
            arguments: {
                host: gatewayHost,
                password: gatewayPassword,
            },
        });

        if (!result || !result.gateway_info) {
            throw new Error('Invalid connection response');
        }

        console.log(`   Gateway: ${result.gateway_info.name}`);
        console.log(`   Type: ${result.gateway_info.type}`);
        console.log(`   Model: ${result.gateway_info.model}`);
        console.log(`   Version: ${result.gateway_info.version}`);
    });

    await runTest('Get Gateway Info', async () => {
        const result = await callToolSafe({
            name: 'get_gateway_info',
            arguments: {
                host: gatewayHost,
                password: gatewayPassword,
            },
        });

        if (!result) {
            throw new Error('Invalid gateway info response');
        }

        console.log(`   Name: ${result.name || 'Unknown'}`);
        console.log(`   Connected: ${result.connected ? 'Yes' : 'No'}`);
    });
}

async function testDeviceDiscovery(): Promise<void> {
    console.log('\n📱 Testing Device Discovery\n');

    let devicesData: any;

    await runTest('Get All Devices', async () => {
        const result = await callToolSafe({
            name: 'get_devices',
            arguments: {
                host: gatewayHost,
                password: gatewayPassword,
            },
        });

        if (!result || !result.entities) {
            throw new Error('Invalid devices response');
        }

        devicesData = result;

        const entityCount = Object.keys(result.entities).length;
        console.log(`   Total entities: ${entityCount}`);
        console.log(`   Gateway ID: ${result.gateway_id || 'Unknown'}`);
        if (result.heater_id) {
            console.log(`   Heater ID: ${result.heater_id}`);
        }
    });

    // Analyze device types
    await runTest('Analyze Device Types', async () => {
        if (!devicesData) {
            throw new Error('No devices data available');
        }

        const entities = devicesData.entities;
        const deviceTypes: Record<string, number> = {};

        for (const [id, entity] of Object.entries(entities)) {
            const dev_class = (entity as any).dev_class || 'unknown';
            deviceTypes[dev_class] = (deviceTypes[dev_class] || 0) + 1;
        }

        console.log(`   Device types found:`);
        for (const [type, count] of Object.entries(deviceTypes)) {
            console.log(`     - ${type}: ${count}`);
        }
    });

    return devicesData;
}

async function testSensorReading(devicesData: any): Promise<void> {
    console.log('\n🌡️  Testing Sensor Reading\n');

    await runTest('Read Temperature Sensors', async () => {
        if (!devicesData || !devicesData.entities) {
            throw new Error('No devices data available');
        }

        const entities = devicesData.entities;
        let tempSensorCount = 0;
        let tempValues: number[] = [];

        for (const [id, entity] of Object.entries(entities)) {
            const sensors = (entity as any).sensors;
            if (sensors && sensors.temperature !== undefined) {
                tempSensorCount++;
                tempValues.push(sensors.temperature);
            }
        }

        console.log(`   Temperature sensors: ${tempSensorCount}`);
        if (tempValues.length > 0) {
            const avg = tempValues.reduce((a, b) => a + b, 0) / tempValues.length;
            console.log(`   Average temperature: ${avg.toFixed(1)}°C`);
            console.log(`   Range: ${Math.min(...tempValues).toFixed(1)}°C - ${Math.max(...tempValues).toFixed(1)}°C`);
        }
    });

    await runTest('Read Other Sensors', async () => {
        if (!devicesData || !devicesData.entities) {
            throw new Error('No devices data available');
        }

        const entities = devicesData.entities;
        const sensorTypes: Record<string, number> = {};

        for (const [id, entity] of Object.entries(entities)) {
            const sensors = (entity as any).sensors;
            if (sensors) {
                for (const sensorType of Object.keys(sensors)) {
                    sensorTypes[sensorType] = (sensorTypes[sensorType] || 0) + 1;
                }
            }
        }

        console.log(`   Sensor types found:`);
        for (const [type, count] of Object.entries(sensorTypes)) {
            console.log(`     - ${type}: ${count} device(s)`);
        }
    });
}

async function testThermostatReading(devicesData: any): Promise<void> {
    console.log('\n🌡️  Testing Thermostat Reading\n');

    await runTest('Read Thermostat States', async () => {
        if (!devicesData || !devicesData.entities) {
            throw new Error('No devices data available');
        }

        const entities = devicesData.entities;
        let thermostatCount = 0;

        for (const [id, entity] of Object.entries(entities)) {
            const thermostat = (entity as any).thermostat;
            if (thermostat) {
                thermostatCount++;
                console.log(`     ${(entity as any).name}:`);
                if (thermostat.setpoint !== undefined) {
                    console.log(`       Setpoint: ${thermostat.setpoint}°C`);
                }
                if (thermostat.lower_bound !== undefined && thermostat.upper_bound !== undefined) {
                    console.log(`       Range: ${thermostat.lower_bound}°C - ${thermostat.upper_bound}°C`);
                }
            }
        }

        console.log(`   Total thermostats: ${thermostatCount}`);
    });

    await runTest('Read Active Presets', async () => {
        if (!devicesData || !devicesData.entities) {
            throw new Error('No devices data available');
        }

        const entities = devicesData.entities;
        const presets: Record<string, number> = {};

        for (const [id, entity] of Object.entries(entities)) {
            const preset = (entity as any).active_preset;
            if (preset) {
                presets[preset] = (presets[preset] || 0) + 1;
            }
        }

        if (Object.keys(presets).length > 0) {
            console.log(`   Active presets:`);
            for (const [preset, count] of Object.entries(presets)) {
                console.log(`     - ${preset}: ${count} zone(s)`);
            }
        } else {
            console.log(`   No preset information available`);
        }
    });
}

async function testSwitchReading(devicesData: any): Promise<void> {
    console.log('\n🔌 Testing Switch Reading\n');

    await runTest('Read Switch States', async () => {
        if (!devicesData || !devicesData.entities) {
            throw new Error('No devices data available');
        }

        const entities = devicesData.entities;
        let switchCount = 0;
        let onCount = 0;
        let offCount = 0;

        for (const [id, entity] of Object.entries(entities)) {
            const switches = (entity as any).switches;
            if (switches && switches.relay !== undefined) {
                switchCount++;
                if (switches.relay) {
                    onCount++;
                } else {
                    offCount++;
                }
            }
        }

        console.log(`   Total switches: ${switchCount}`);
        if (switchCount > 0) {
            console.log(`   On: ${onCount}, Off: ${offCount}`);
        }
    });
}

async function testDeviceAvailability(devicesData: any): Promise<void> {
    console.log('\n✅ Testing Device Availability\n');

    await runTest('Check Device Availability', async () => {
        if (!devicesData || !devicesData.entities) {
            throw new Error('No devices data available');
        }

        const entities = devicesData.entities;
        let availableCount = 0;
        let unavailableCount = 0;

        for (const [id, entity] of Object.entries(entities)) {
            const available = (entity as any).available;
            if (available === true) {
                availableCount++;
            } else if (available === false) {
                unavailableCount++;
            }
        }

        const total = availableCount + unavailableCount;
        console.log(`   Available: ${availableCount}/${total}`);
        if (unavailableCount > 0) {
            console.log(`   ⚠️  Unavailable: ${unavailableCount}`);
        }
    });
}

async function cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up...\n');

    if (mcpProcess && !mcpProcess.killed) {
        mcpProcess.kill('SIGTERM');

        await new Promise<void>((resolve) => {
            mcpProcess.on('exit', () => resolve());
            setTimeout(() => {
                if (!mcpProcess.killed) {
                    mcpProcess.kill('SIGKILL');
                }
                resolve();
            }, 3000);
        });
    }
}

async function main(): Promise<void> {
    const isMockMode = process.env.MOCK_DEVICES === 'true' || process.argv.includes('--mock');
    const mockSuffix = isMockMode ? ' (MOCK MODE)' : '';

    console.log('╔══════════════════════════════════════════╗');
    console.log(`║  Plugwise Read-Only Test Suite${mockSuffix.padEnd(10)}║`);
    console.log('║  Network, Devices, Sensors, States       ║');
    console.log('╚══════════════════════════════════════════╝\n');

    try {
        await startMcpServer();
        await initializeAndDiscover();

        await testNetworkScanning();
        await testGatewayConnection();
        const devicesData = await testDeviceDiscovery();
        await testSensorReading(devicesData);
        await testThermostatReading(devicesData);
        await testSwitchReading(devicesData);
        await testDeviceAvailability(devicesData);

        console.log('\n╔══════════════════════════════════════════╗');
        console.log('║    Read-Only Tests Complete! ✅          ║');
        console.log('╚══════════════════════════════════════════╝\n');
    } catch (error) {
        console.error('\n❌ Test suite failed:', error);
        process.exit(1);
    } finally {
        await cleanup();
    }
}

// Handle cleanup on exit
process.on('SIGINT', async () => {
    await cleanup();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await cleanup();
    process.exit(0);
});

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
