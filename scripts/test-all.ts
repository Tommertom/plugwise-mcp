#!/usr/bin/env ts-node

/**
 * Comprehensive Read-Only Test Script for Plugwise MCP Server
 *
 * This script tests all read-only MCP tools that retrieve hub and device states
 * without making any state-changing operations.
 *
 * Safe tools tested:
 * - scan_network: Discover Plugwise hubs on the network
 * - connect: Connect to gateway and retrieve gateway info
 * - get_devices: Get all devices and their states
 * - resources/read: Read device states via resource URI
 * - health endpoint: Check server health
 *
 * State-changing tools NOT tested (by design):
 * - set_temperature, set_preset, control_switch
 * - set_gateway_mode, set_dhw_mode, set_regulation_mode
 * - delete_notification, reboot_gateway
 *
 * Usage: ts-node scripts/test-all.ts
 *
 * Optional environment variables:
 * - MCP_SERVER_URL: Server URL (default: http://localhost:3000/mcp)
 * - PLUGWISE_HOST: Specific gateway IP to test
 * - PLUGWISE_PASSWORD: Gateway password
 * - HUB1, HUB2, etc.: Passwords for network scanning
 */

import http from 'http';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

const SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3000/mcp';
const HEALTH_URL = SERVER_URL.replace('/mcp', '/health');

// Test results tracking
interface TestResult {
    name: string;
    passed: boolean;
    duration: number;
    details?: string;
    error?: string;
}

const testResults: TestResult[] = [];
let testCounter = 0;

/**
 * HTTP POST helper
 */
function httpPost(url: string, data: any): Promise<{
    ok: boolean;
    statusCode: number;
    data: any;
}> {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(data);
        const urlObj = new URL(url);

        const options: http.RequestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || 3000,
            path: urlObj.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/event-stream',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    resolve({
                        ok: res.statusCode! >= 200 && res.statusCode! < 300,
                        statusCode: res.statusCode!,
                        data: JSON.parse(responseData)
                    });
                } catch (e) {
                    resolve({
                        ok: res.statusCode! >= 200 && res.statusCode! < 300,
                        statusCode: res.statusCode!,
                        data: responseData
                    });
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

/**
 * HTTP GET helper
 */
function httpGet(url: string): Promise<{
    ok: boolean;
    statusCode: number;
    data: any;
}> {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);

        const options: http.RequestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || 3000,
            path: urlObj.pathname,
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    resolve({
                        ok: res.statusCode! >= 200 && res.statusCode! < 300,
                        statusCode: res.statusCode!,
                        data: JSON.parse(responseData)
                    });
                } catch (e) {
                    resolve({
                        ok: res.statusCode! >= 200 && res.statusCode! < 300,
                        statusCode: res.statusCode!,
                        data: responseData
                    });
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

/**
 * Send MCP JSON-RPC request
 */
async function sendRequest(method: string, params: any = {}, id?: number): Promise<any> {
    const requestId = id ?? ++testCounter;
    const request = {
        jsonrpc: '2.0',
        method,
        params,
        id: requestId
    };

    console.log(`\n📤 Request [${method}]:`);
    console.log(JSON.stringify(request, null, 2));

    const response = await httpPost(SERVER_URL, request);

    console.log(`\n📥 Response:`);
    console.log(JSON.stringify(response.data, null, 2));

    if (!response.ok) {
        throw new Error(`HTTP ${response.statusCode}: Request failed`);
    }

    if (response.data.error) {
        throw new Error(`MCP Error: ${response.data.error.message}`);
    }

    return response.data.result;
}

/**
 * Run a test and track results
 */
async function runTest(
    name: string,
    testFn: () => Promise<any>,
    optional: boolean = false
): Promise<boolean> {
    const startTime = Date.now();
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🧪 Test: ${name}`);
    console.log('='.repeat(70));

    try {
        const result = await testFn();
        const duration = Date.now() - startTime;

        testResults.push({
            name,
            passed: true,
            duration,
            details: typeof result === 'string' ? result : undefined
        });

        console.log(`\n✅ PASSED (${duration}ms)`);
        return true;
    } catch (error) {
        const duration = Date.now() - startTime;
        const errorMsg = (error as Error).message;

        testResults.push({
            name,
            passed: false,
            duration,
            error: errorMsg
        });

        if (optional) {
            console.log(`\n⚠️  SKIPPED: ${errorMsg} (${duration}ms)`);
            return false;
        } else {
            console.log(`\n❌ FAILED: ${errorMsg} (${duration}ms)`);
            return false;
        }
    }
}

/**
 * Test: Server Health Check
 */
async function testHealthCheck(): Promise<string> {
    const response = await httpGet(HEALTH_URL);

    if (!response.ok) {
        throw new Error('Server health check failed');
    }

    const health = response.data;
    console.log('\nHealth status:', JSON.stringify(health, null, 2));

    return `Server: ${health.server} v${health.version}, Connected: ${health.connected}`;
}

/**
 * Test: Initialize MCP Connection
 */
async function testInitialize(): Promise<string> {
    const result = await sendRequest('initialize', {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: {
            name: 'plugwise-test-all-client',
            version: '1.0.0'
        }
    });

    return `Connected to ${result.serverInfo.name} v${result.serverInfo.version}`;
}

/**
 * Test: List Available Tools
 */
async function testListTools(): Promise<string> {
    const result = await sendRequest('tools/list', {});

    console.log(`\nFound ${result.tools.length} tools:`);
    result.tools.forEach((tool: any) => {
        console.log(`  - ${tool.name}: ${tool.description}`);
    });

    return `Found ${result.tools.length} tools`;
}

/**
 * Test: Scan Network for Hubs
 */
async function testScanNetwork(): Promise<string> {
    const result = await sendRequest('tools/call', {
        name: 'scan_network',
        arguments: {}
    });

    const content = result.content[0];
    const data = JSON.parse(content.text);

    if (!data.success) {
        throw new Error(data.error || 'Scan failed');
    }

    console.log(`\nScanned ${data.scanned_ips} IPs`);
    console.log(`Found ${data.discovered.length} hubs:`);
    data.discovered.forEach((hub: any) => {
        console.log(`  - ${hub.name} at ${hub.ip} (${hub.model || 'unknown model'})`);
    });

    return `Scanned ${data.scanned_ips} IPs, found ${data.discovered.length} hubs`;
}

/**
 * Test: Connect to Gateway
 */
async function testConnectGateway(): Promise<string> {
    let host = process.env.PLUGWISE_HOST;
    let password = process.env.PLUGWISE_PASSWORD;

    // If no explicit host, use discovered hubs (connect will auto-select first one)
    if (!host && !password) {
        console.log('No PLUGWISE_HOST set, using auto-discovered hubs...');
    }

    // Only set host/password if explicitly provided
    const connectArgs: any = {};
    if (host) {
        connectArgs.host = host;
    }
    if (password) {
        connectArgs.password = password;
    }

    console.log(`Connecting to ${host || 'first discovered hub'}...`);

    const result = await sendRequest('tools/call', {
        name: 'connect',
        arguments: connectArgs
    });

    const content = result.content[0];
    const data = JSON.parse(content.text);

    if (!data.success) {
        throw new Error(data.error || 'Connection failed');
    }

    console.log('\nGateway Info:');
    console.log(`  Name: ${data.gateway_info.name}`);
    console.log(`  Model: ${data.gateway_info.model}`);
    console.log(`  Type: ${data.gateway_info.type}`);
    console.log(`  Version: ${data.gateway_info.version}`);
    if (data.gateway_info.hostname) {
        console.log(`  Hostname: ${data.gateway_info.hostname}`);
    }
    if (data.gateway_info.mac_address) {
        console.log(`  MAC: ${data.gateway_info.mac_address}`);
    }

    return `Connected to ${data.gateway_info.name} (${data.gateway_info.model})`;
}

/**
 * Test: Get All Devices
 */
async function testGetDevices(): Promise<string> {
    const result = await sendRequest('tools/call', {
        name: 'get_devices',
        arguments: {}
    });

    const content = result.content[0];
    const data = JSON.parse(content.text);

    if (!data.success) {
        throw new Error(data.error || 'Failed to get devices');
    }

    const entities = data.data.entities || {};
    const entityCount = Object.keys(entities).length;

    console.log(`\nFound ${entityCount} devices/zones:`);

    let deviceSummary = {
        thermostats: 0,
        switches: 0,
        sensors: 0,
        other: 0
    };

    for (const [id, entity] of Object.entries(entities)) {
        const e = entity as any;
        console.log(`\n  📍 ${e.name} (${e.dev_class || 'unknown'})`);
        console.log(`     ID: ${id}`);

        if (e.dev_class?.includes('thermostat') || e.dev_class?.includes('zone')) {
            deviceSummary.thermostats++;
            if (e.sensors?.temperature !== undefined) {
                console.log(`     🌡️  Temperature: ${e.sensors.temperature}°C`);
            }
            if (e.sensors?.setpoint !== undefined) {
                console.log(`     🎯 Setpoint: ${e.sensors.setpoint}°C`);
            }
            if (e.sensors?.temperature_difference !== undefined) {
                console.log(`     📊 Difference: ${e.sensors.temperature_difference}°C`);
            }
        } else if (e.dev_class?.includes('switch') || e.dev_class?.includes('relay')) {
            deviceSummary.switches++;
            if (e.switches?.relay !== undefined) {
                console.log(`     🔌 State: ${e.switches.relay ? 'ON' : 'OFF'}`);
            }
        } else if (e.dev_class?.includes('sensor')) {
            deviceSummary.sensors++;
        } else {
            deviceSummary.other++;
        }

        // Show all available sensors
        if (e.sensors) {
            const sensorKeys = Object.keys(e.sensors).filter(
                k => !['temperature', 'setpoint', 'temperature_difference'].includes(k)
            );
            if (sensorKeys.length > 0) {
                console.log(`     📡 Other sensors: ${sensorKeys.join(', ')}`);
            }
        }
    }

    console.log(`\nDevice Summary:`);
    console.log(`  Thermostats/Zones: ${deviceSummary.thermostats}`);
    console.log(`  Switches/Relays: ${deviceSummary.switches}`);
    console.log(`  Sensors: ${deviceSummary.sensors}`);
    console.log(`  Other: ${deviceSummary.other}`);

    return `Found ${entityCount} devices (${deviceSummary.thermostats} thermostats, ${deviceSummary.switches} switches)`;
}

/**
 * Test: List Resources
 */
async function testListResources(): Promise<string> {
    const result = await sendRequest('resources/list', {});

    console.log(`\nFound ${result.resources.length} resources:`);
    result.resources.forEach((resource: any) => {
        console.log(`  - ${resource.uri}: ${resource.description}`);
        if (resource.mimeType) {
            console.log(`    MIME: ${resource.mimeType}`);
        }
    });

    return `Found ${result.resources.length} resources`;
}

/**
 * Test: Read Devices Resource
 */
async function testReadDevicesResource(): Promise<string> {
    const result = await sendRequest('resources/read', {
        uri: 'plugwise://devices'
    });

    const content = result.contents[0];
    const data = JSON.parse(content.text);

    if (data.error) {
        throw new Error(data.error);
    }

    const entityCount = Object.keys(data.entities || {}).length;

    console.log('\nResource Data:');
    console.log(`  Gateway ID: ${data.gateway_id || 'N/A'}`);
    console.log(`  Entities: ${entityCount}`);

    return `Resource contains ${entityCount} entities`;
}

/**
 * Test: List Prompts
 */
async function testListPrompts(): Promise<string> {
    const result = await sendRequest('prompts/list', {});

    console.log(`\nFound ${result.prompts.length} prompts:`);
    result.prompts.forEach((prompt: any) => {
        console.log(`  - ${prompt.name}: ${prompt.description}`);
    });

    return `Found ${result.prompts.length} prompts`;
}

/**
 * Test: Get Setup Guide Prompt
 */
async function testGetSetupGuidePrompt(): Promise<string> {
    const result = await sendRequest('prompts/get', {
        name: 'setup_guide',
        arguments: {}
    });

    console.log(`\nPrompt contains ${result.messages.length} messages`);
    if (result.messages.length > 0) {
        const firstMsg = result.messages[0];
        console.log(`First message role: ${firstMsg.role}`);
        console.log(`Content type: ${firstMsg.content.type}`);
    }

    return `Setup guide prompt with ${result.messages.length} messages`;
}

/**
 * Print Test Summary
 */
function printSummary(): void {
    console.log('\n');
    console.log('='.repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(70));

    const passed = testResults.filter(r => r.passed).length;
    const failed = testResults.filter(r => !r.passed).length;
    const total = testResults.length;
    const totalDuration = testResults.reduce((sum, r) => sum + r.duration, 0);

    console.log(`\nTotal Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);

    console.log('\nDetailed Results:');
    testResults.forEach((result, index) => {
        const icon = result.passed ? '✅' : '❌';
        const status = result.passed ? 'PASS' : 'FAIL';
        console.log(`\n${index + 1}. ${icon} ${result.name} [${status}] (${result.duration}ms)`);
        if (result.details) {
            console.log(`   ${result.details}`);
        }
        if (result.error) {
            console.log(`   Error: ${result.error}`);
        }
    });

    console.log('\n' + '='.repeat(70));

    if (failed === 0) {
        console.log('🎉 All tests passed!');
    } else {
        console.log(`⚠️  ${failed} test(s) failed`);
    }

    console.log('\n💡 Note: This test suite only tests READ-ONLY operations.');
    console.log('   State-changing tools are intentionally excluded to prevent');
    console.log('   accidental modifications to your Plugwise system.\n');
}

/**
 * Main test execution
 */
async function main(): Promise<void> {
    console.log('🚀 Plugwise MCP Server - Comprehensive Read-Only Test Suite');
    console.log(`📡 Server URL: ${SERVER_URL}`);
    console.log(`💚 Health URL: ${HEALTH_URL}`);
    console.log('\nTesting all read-only MCP tools...\n');

    // Core server tests (required)
    await runTest('Health Check', testHealthCheck, false);
    await runTest('Initialize MCP Connection', testInitialize, false);
    await runTest('List Available Tools', testListTools, false);
    await runTest('List Available Resources', testListResources, false);
    await runTest('List Available Prompts', testListPrompts, false);
    await runTest('Get Setup Guide Prompt', testGetSetupGuidePrompt, false);

    // Network discovery test (optional - may not find hubs)
    const scanSuccess = await runTest('Scan Network for Hubs', testScanNetwork, true);

    // Connection tests (optional - requires hub)
    const connectSuccess = await runTest('Connect to Gateway', testConnectGateway, true);

    // Device tests (optional - requires connection)
    if (connectSuccess) {
        await runTest('Get All Devices', testGetDevices, true);
        await runTest('Read Devices Resource', testReadDevicesResource, true);
    } else {
        console.log('\n⏩ Skipping device tests (no gateway connection)');
        testResults.push({
            name: 'Get All Devices',
            passed: false,
            duration: 0,
            error: 'Skipped - no gateway connection'
        });
        testResults.push({
            name: 'Read Devices Resource',
            passed: false,
            duration: 0,
            error: 'Skipped - no gateway connection'
        });
    }

    // Print summary
    printSummary();

    // Exit with appropriate code
    const hasCriticalFailures = testResults
        .slice(0, 6) // First 6 tests are critical
        .some(r => !r.passed);

    if (hasCriticalFailures) {
        process.exit(1);
    }
}

// Run tests
main().catch((error) => {
    console.error('\n💥 Fatal error:', error);
    if (error.stack) {
        console.error(error.stack);
    }
    process.exit(1);
});
