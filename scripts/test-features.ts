#!/usr/bin/env node
/**
 * Detailed Feature Tests for Plugwise MCP Server
 * 
 * Tests individual MCP tools and features in detail:
 * - Tool listing and discovery
 * - Resource enumeration
 * - Prompt availability
 * - Individual tool validation
 * - Error handling
 * - Edge cases
 * 
 * Usage:
 * - With manual configuration: PLUGWISE_HOST=192.168.1.100 PLUGWISE_PASSWORD=yourpass npm run test:features
 * - With mock mode: npm run test:features -- --mock
 * 
 * Note: This test performs ONLY read operations.
 */

import { spawn, type ChildProcess } from 'child_process';
import {
    initializeMcpConnection,
    listTools,
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
        const toolName = toolCall.name;

        // Mock responses for different tools
        const mockResponses: Record<string, any> = {
            list_hubs: {
                hubs: [
                    { host: '192.168.1.100', name: 'Mock Adam', model: 'Adam' },
                    { host: '192.168.1.101', name: 'Mock Anna', model: 'Anna' },
                ],
            },
            connect: {
                success: true,
                gateway_info: {
                    name: 'Mock Plugwise Gateway',
                    type: 'thermostat',
                    model: 'Adam',
                    version: '3.7.6',
                    hostname: 'smile000000',
                },
            },
            get_devices: {
                gateway_id: 'mock-gateway-id',
                heater_id: 'mock-heater-id',
                entities: {
                    'zone-1': { name: 'Living Room', dev_class: 'zone', available: true, sensors: { temperature: 21.5 } },
                    'zone-2': { name: 'Bedroom', dev_class: 'zone', available: true, sensors: { temperature: 19.0 } },
                },
            },
            get_gateway_info: {
                name: 'Mock Gateway',
                connected: true,
                type: 'thermostat',
            },
        };

        return mockResponses[toolName] || { success: true };
    }

    return await callTool(mcpProcess, toolCall);
}

async function startMcpServer(): Promise<void> {
    console.log('🚀 Starting Plugwise MCP Server...\n');

    mcpProcess = spawn('node', ['dist/index.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false,
    });

    mcpProcess.stdout?.on('data', (data) => {
        const output = data.toString().trim();
        if (output && !output.includes('"jsonrpc"')) {
            console.log('[Server]', output);
        }
    });

    mcpProcess.stderr?.on('data', (data) => {
        console.error('[Server Error]', data.toString());
    });

    await wait(1000);
}

async function setupTestEnvironment(): Promise<void> {
    console.log('🔧 Setting up test environment...\n');

    await initializeMcpConnection(mcpProcess);

    mockMode = process.env.MOCK_DEVICES === 'true' || process.argv.includes('--mock');

    if (mockMode) {
        console.log('⚠️  Running in MOCK MODE\n');
        gatewayHost = '192.168.1.100';
        gatewayPassword = 'mock-password';
    } else {
        gatewayHost = process.env.PLUGWISE_HOST || '';
        gatewayPassword = process.env.PLUGWISE_PASSWORD || '';

        if (!gatewayHost || !gatewayPassword) {
            throw new Error('PLUGWISE_HOST and PLUGWISE_PASSWORD required (or use --mock)');
        }

        console.log(`📍 Using gateway: ${gatewayHost}\n`);
    }
}

async function testMcpProtocol(): Promise<void> {
    console.log('🔌 Testing MCP Protocol Features\n');

    let tools: any[] = [];

    await runTest('List Available Tools', async () => {
        tools = await listTools(mcpProcess);

        if (!Array.isArray(tools) || tools.length === 0) {
            throw new Error('No tools returned');
        }

        console.log(`   Found ${tools.length} tools`);
    });

    await runTest('Validate Tool Schemas', async () => {
        const requiredTools = [
            'list_hubs',
            'connect',
            'get_devices',
        ];

        const toolNames = tools.map(t => t.name);

        for (const requiredTool of requiredTools) {
            if (!toolNames.includes(requiredTool)) {
                throw new Error(`Missing required tool: ${requiredTool}`);
            }
        }

        console.log(`   All ${requiredTools.length} required tools present`);
    });

    await runTest('Check Tool Descriptions', async () => {
        let missingDescriptions = 0;

        for (const tool of tools) {
            if (!tool.description || tool.description.trim().length === 0) {
                missingDescriptions++;
            }
        }

        if (missingDescriptions > 0) {
            throw new Error(`${missingDescriptions} tools missing descriptions`);
        }

        console.log(`   All tools have descriptions`);
    });

    await runTest('Verify Input Schemas', async () => {
        for (const tool of tools) {
            if (!tool.inputSchema) {
                throw new Error(`Tool ${tool.name} missing input schema`);
            }

            if (tool.inputSchema.type !== 'object') {
                throw new Error(`Tool ${tool.name} has invalid schema type`);
            }
        }

        console.log(`   All tools have valid input schemas`);
    });
}

async function testNetworkScanning(): Promise<void> {
    console.log('\n🔍 Testing Hub Listing Tool\n');

    await runTest('List Hubs', async () => {
        const result = await callToolSafe({
            name: 'list_hubs',
            arguments: {},
        });

        if (!result || !Array.isArray(result.hubs)) {
            throw new Error('Invalid list result');
        }

        console.log(`   Found ${result.hubs.length} hub(s)`);
    });

    await runTest('Verify Hub Data Structure', async () => {
        const result = await callToolSafe({
            name: 'list_hubs',
            arguments: {},
        });

        if (result.hubs.length > 0) {
            const hub = result.hubs[0];

            if (!hub.ip) {
                throw new Error('Hub missing ip property');
            }

            console.log(`   Hub data structure valid`);
            console.log(`     Host: ${hub.host}`);
            if (hub.name) console.log(`     Name: ${hub.name}`);
            if (hub.model) console.log(`     Model: ${hub.model}`);
        }
    });
}

async function testGatewayConnection(): Promise<void> {
    console.log('\n🔌 Testing Gateway Connection Tool\n');

    await runTest('Connect to Gateway', async () => {
        const result = await callToolSafe({
            name: 'connect',
            arguments: {
                host: gatewayHost,
                password: gatewayPassword,
            },
        });

        if (!result || !result.gateway_info) {
            throw new Error('Invalid connection result');
        }

        console.log(`   Connected to: ${result.gateway_info.name}`);
        console.log(`   Type: ${result.gateway_info.type}`);
    });

    await runTest('Verify Gateway Info Structure', async () => {
        const result = await callToolSafe({
            name: 'connect',
            arguments: {
                host: gatewayHost,
                password: gatewayPassword,
            },
        });

        const info = result.gateway_info;
        const requiredFields = ['name', 'type', 'model', 'version'];

        for (const field of requiredFields) {
            if (!info[field]) {
                throw new Error(`Gateway info missing field: ${field}`);
            }
        }

        console.log(`   All required fields present`);
    });

    await runTest('Get Gateway Info (Standalone)', async () => {
        const result = await callToolSafe({
            name: 'get_gateway_info',
            arguments: {
                host: gatewayHost,
                password: gatewayPassword,
            },
        });

        if (!result || !result.name) {
            throw new Error('Invalid gateway info result');
        }

        console.log(`   Gateway: ${result.name}`);
    });
}

async function testDeviceRetrieval(): Promise<void> {
    console.log('\n📱 Testing Device Retrieval Tool\n');

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
            throw new Error('Invalid devices result');
        }

        devicesData = result;

        console.log(`   Entities: ${Object.keys(result.entities).length}`);
    });

    await runTest('Verify Entity Structure', async () => {
        const entities = devicesData.entities;

        for (const [id, entity] of Object.entries(entities)) {
            const e = entity as any;

            if (!e.name) {
                throw new Error(`Entity ${id} missing name`);
            }

            if (!e.dev_class) {
                throw new Error(`Entity ${id} missing dev_class`);
            }
        }

        console.log(`   All entities have valid structure`);
    });

    await runTest('Check Entity Types', async () => {
        const entities = devicesData.entities;
        const types = new Set<string>();

        for (const entity of Object.values(entities)) {
            types.add((entity as any).dev_class);
        }

        console.log(`   Entity types: ${Array.from(types).join(', ')}`);
    });

    await runTest('Verify Sensor Data', async () => {
        const entities = devicesData.entities;
        let sensorCount = 0;

        for (const entity of Object.values(entities)) {
            const e = entity as any;
            if (e.sensors && Object.keys(e.sensors).length > 0) {
                sensorCount++;
            }
        }

        console.log(`   Entities with sensors: ${sensorCount}`);
    });
}

async function testDataConsistency(): Promise<void> {
    console.log('\n🔍 Testing Data Consistency\n');

    await runTest('Multiple Device Reads Consistency', async () => {
        const result1 = await callToolSafe({
            name: 'get_devices',
            arguments: { host: gatewayHost, password: gatewayPassword },
        });

        await wait(100);

        const result2 = await callToolSafe({
            name: 'get_devices',
            arguments: { host: gatewayHost, password: gatewayPassword },
        });

        const count1 = Object.keys(result1.entities).length;
        const count2 = Object.keys(result2.entities).length;

        if (count1 !== count2) {
            throw new Error(`Inconsistent entity count: ${count1} vs ${count2}`);
        }

        console.log(`   Consistent across reads: ${count1} entities`);
    });

    await runTest('Gateway Info Consistency', async () => {
        const result1 = await callToolSafe({
            name: 'get_gateway_info',
            arguments: { host: gatewayHost, password: gatewayPassword },
        });

        await wait(100);

        const result2 = await callToolSafe({
            name: 'get_gateway_info',
            arguments: { host: gatewayHost, password: gatewayPassword },
        });

        if (result1.name !== result2.name) {
            throw new Error('Inconsistent gateway name');
        }

        console.log(`   Gateway info consistent`);
    });
}

async function testErrorHandling(): Promise<void> {
    console.log('\n⚠️  Testing Error Handling\n');

    if (mockMode) {
        console.log('   ⏭️  Skipping error tests in mock mode\n');
        return;
    }

    await runTest('Invalid Host Error', async () => {
        try {
            await callTool(mcpProcess, {
                name: 'connect',
                arguments: {
                    host: '192.168.255.255',
                    password: 'test',
                },
            });
            throw new Error('Should have failed with invalid host');
        } catch (error) {
            const msg = (error as Error).message;
            if (!msg.includes('connect') && !msg.includes('timeout') && !msg.includes('failed')) {
                throw error;
            }
            console.log(`   Correctly handles invalid host`);
        }
    });

    await runTest('Invalid Password Error', async () => {
        try {
            await callTool(mcpProcess, {
                name: 'connect',
                arguments: {
                    host: gatewayHost,
                    password: 'wrong-password-12345',
                },
            });
            throw new Error('Should have failed with invalid password');
        } catch (error) {
            const msg = (error as Error).message;
            if (!msg.includes('auth') && !msg.includes('credentials') && !msg.includes('401')) {
                throw error;
            }
            console.log(`   Correctly handles invalid password`);
        }
    });
}

async function testPerformance(): Promise<void> {
    console.log('\n⚡ Testing Performance\n');

    await runTest('Device Retrieval Speed', async () => {
        const start = Date.now();

        await callToolSafe({
            name: 'get_devices',
            arguments: { host: gatewayHost, password: gatewayPassword },
        });

        const duration = Date.now() - start;
        console.log(`   Retrieved devices in ${duration}ms`);

        if (duration > 5000) {
            throw new Error(`Too slow: ${duration}ms`);
        }
    });

    await runTest('Connection Speed', async () => {
        const start = Date.now();

        await callToolSafe({
            name: 'connect',
            arguments: { host: gatewayHost, password: gatewayPassword },
        });

        const duration = Date.now() - start;
        console.log(`   Connected in ${duration}ms`);

        if (duration > 3000) {
            throw new Error(`Too slow: ${duration}ms`);
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
    const mockSuffix = isMockMode ? ' (MOCK)' : '';

    console.log('╔══════════════════════════════════════════╗');
    console.log(`║  Plugwise Feature Test Suite${mockSuffix.padEnd(12)}║`);
    console.log('║  Detailed Tool & Protocol Testing       ║');
    console.log('╚══════════════════════════════════════════╝\n');

    try {
        await startMcpServer();
        await setupTestEnvironment();

        await testMcpProtocol();
        await testNetworkScanning();
        await testGatewayConnection();
        await testDeviceRetrieval();
        await testDataConsistency();
        await testErrorHandling();
        await testPerformance();

        console.log('\n╔══════════════════════════════════════════╗');
        console.log('║    Feature Tests Complete! ✅            ║');
        console.log('╚══════════════════════════════════════════╝\n');
    } catch (error) {
        console.error('\n❌ Test suite failed:', error);
        process.exit(1);
    } finally {
        await cleanup();
    }
}

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
