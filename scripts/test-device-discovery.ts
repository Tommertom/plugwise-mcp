#!/usr/bin/env node
/**
 * Test script for Plugwise Device Discovery
 * 
 * This script:
 * 1. Connects to the MCP server via stdio
 * 2. Lists all configured hubs
 * 3. Connects to each hub and triggers device discovery
 * 4. Lists all discovered devices
 * 5. Verifies devices are saved in mcp_data/plugwise/devices folder
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as fs from 'fs';
import * as path from 'path';

interface Hub {
    name: string;
    ip: string;
    password: string;
    model?: string;
    firmware?: string;
}

interface Device {
    id: string;
    name: string;
    type: string;
    location?: string;
    [key: string]: any;
}

async function testDeviceDiscovery() {
    console.log('🚀 Starting Plugwise Device Discovery Test...\n');

    // Create stdio transport
    console.log('📡 Creating MCP client transport...');
    const transport = new StdioClientTransport({
        command: 'node',
        args: ['dist/index.js'],
    });

    // Create MCP client
    const client = new Client({
        name: 'device-discovery-test',
        version: '1.0.0',
    }, {
        capabilities: {}
    });

    try {
        // Connect to the server
        console.log('🔌 Connecting to MCP server...');
        await client.connect(transport);
        console.log('✅ Connected successfully!\n');

        // Step 1: List all hubs
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 STEP 1: LISTING HUBS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const listHubsResult = await client.callTool({
            name: 'list_hubs',
            arguments: {}
        });

        let hubs: Hub[] = [];
        if (listHubsResult.content && Array.isArray(listHubsResult.content) && listHubsResult.content.length > 0) {
            const content = listHubsResult.content[0];
            if (content.type === 'text') {
                console.log('Hub list response:');
                console.log(content.text);
                console.log('');
                
                // Parse the response to extract hub information
                try {
                    const hubsData = JSON.parse(content.text);
                    if (hubsData.hubs && Array.isArray(hubsData.hubs)) {
                        hubs = hubsData.hubs;
                    }
                } catch (e) {
                    console.log('⚠️  Could not parse hub data as JSON, trying to extract from text...');
                }
            }
        }

        if (hubs.length === 0) {
            console.log('⚠️  No hubs found. Loading from filesystem...\n');
            hubs = loadHubsFromFilesystem();
        }

        if (hubs.length === 0) {
            console.log('❌ No hubs configured. Please add a hub first using the add_hub tool.');
            return;
        }

        console.log(`Found ${hubs.length} hub(s):\n`);
        hubs.forEach((hub, index) => {
            console.log(`${index + 1}. ${hub.name}`);
            console.log(`   IP: ${hub.ip}`);
            console.log(`   Password: ${hub.password}`);
            if (hub.model) console.log(`   Model: ${hub.model}`);
            if (hub.firmware) console.log(`   Firmware: ${hub.firmware}`);
            console.log('');
        });

        // Step 2: Connect to each hub and discover devices
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 STEP 2: DISCOVERING DEVICES');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const allDevices: { hubName: string; devices: Device[] }[] = [];

        for (const hub of hubs) {
            console.log(`\n🔍 Discovering devices for hub: ${hub.name} (${hub.ip})...`);
            
            try {
                // Connect to the hub
                console.log(`   Connecting...`);
                const connectResult = await client.callTool({
                    name: 'connect',
                    arguments: {
                        host: hub.ip,
                        password: hub.password
                    }
                });

                if (connectResult.content && Array.isArray(connectResult.content) && connectResult.content.length > 0) {
                    const content = connectResult.content[0];
                    if (content.type === 'text') {
                        console.log(`   ✅ Connected to ${hub.name}`);
                    }
                }

                // Get devices
                console.log(`   Fetching devices...`);
                const devicesResult = await client.callTool({
                    name: 'get_devices',
                    arguments: {}
                });

                if (devicesResult.content && Array.isArray(devicesResult.content) && devicesResult.content.length > 0) {
                    const content = devicesResult.content[0];
                    if (content.type === 'text') {
                        try {
                            const response = JSON.parse(content.text);
                            if (response.success && response.data && response.data.entities) {
                                // entities is an object with device IDs as keys
                                const entitiesObj = response.data.entities;
                                const devices: Device[] = [];
                                
                                // Convert object to array, using the key as the device ID
                                for (const [deviceId, deviceData] of Object.entries(entitiesObj)) {
                                    const device = deviceData as any;
                                    devices.push({
                                        id: deviceId,
                                        name: device.name || deviceId,
                                        type: device.class || device.dev_class || 'unknown',
                                        location: device.location || undefined,
                                        ...device
                                    });
                                }
                                
                                console.log(`   ✅ Found ${devices.length} devices`);
                                allDevices.push({
                                    hubName: hub.name,
                                    devices: devices
                                });
                            } else if (response.success === false) {
                                console.log(`   ⚠️  Error from server: ${response.error}`);
                            }
                        } catch (e) {
                            console.log(`   ⚠️  Could not parse device data: ${e}`);
                        }
                    }
                }
            } catch (error: any) {
                console.log(`   ❌ Error discovering devices: ${error.message}`);
            }
        }

        // Step 3: Display all discovered devices
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 STEP 3: DISCOVERED DEVICES');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        let totalDevices = 0;
        for (const hubDevices of allDevices) {
            console.log(`\n🏠 Hub: ${hubDevices.hubName}`);
            console.log(`   Total devices: ${hubDevices.devices.length}\n`);

            hubDevices.devices.forEach((device, index) => {
                const deviceId = device.id || 'unknown';
                const deviceName = device.name || 'unknown';
                const deviceType = device.type || device.dev_class || 'unknown';
                
                console.log(`   ${index + 1}. ${deviceName}`);
                console.log(`      ID: ${deviceId}`);
                console.log(`      Type: ${deviceType}`);
                if (device.location) {
                    console.log(`      Location: ${device.location}`);
                }
                console.log('');
            });

            totalDevices += hubDevices.devices.length;
        }

        console.log(`\n📊 Total devices discovered across all hubs: ${totalDevices}\n`);

        // Step 4: Verify devices are saved to filesystem
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 STEP 4: VERIFYING FILESYSTEM STORAGE');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const devicesDirectory = path.join(process.cwd(), 'mcp_data', 'plugwise', 'devices');
        
        if (!fs.existsSync(devicesDirectory)) {
            console.log(`❌ Devices directory does not exist: ${devicesDirectory}`);
        } else {
            console.log(`📁 Checking directory: ${devicesDirectory}\n`);
            
            const files = fs.readdirSync(devicesDirectory);
            const jsonFiles = files.filter(f => f.endsWith('.json'));
            
            console.log(`Found ${jsonFiles.length} device file(s):\n`);
            
            // Group files by hub
            const filesByHub: { [hubName: string]: string[] } = {};
            
            for (const file of jsonFiles) {
                const filePath = path.join(devicesDirectory, file);
                const content = fs.readFileSync(filePath, 'utf-8');
                
                try {
                    const deviceData = JSON.parse(content);
                    const hubName = deviceData.hubName || 'unknown';
                    
                    if (!filesByHub[hubName]) {
                        filesByHub[hubName] = [];
                    }
                    filesByHub[hubName].push(file);
                } catch (e) {
                    console.log(`   ⚠️  ${file} - Could not parse JSON`);
                }
            }
            
            // Display grouped by hub
            for (const [hubName, files] of Object.entries(filesByHub)) {
                console.log(`   📦 ${hubName}: ${files.length} device(s)`);
            }
            console.log('');

            // Cross-check discovered devices with saved files
            console.log('\n🔍 Cross-checking discovered devices with saved files:\n');
            
            for (const hubDevices of allDevices) {
                console.log(`   Hub: ${hubDevices.hubName}`);
                console.log(`   Total devices discovered: ${hubDevices.devices.length}`);
                
                let savedCount = 0;
                for (const device of hubDevices.devices) {
                    const deviceId = device.id;
                    if (!deviceId) continue;
                    
                    // Check if device file exists
                    const deviceFileName = `${hubDevices.hubName}_${deviceId}.json`;
                    const deviceFilePath = path.join(devicesDirectory, deviceFileName);
                    
                    if (fs.existsSync(deviceFilePath)) {
                        savedCount++;
                    }
                }
                
                console.log(`   Devices saved to filesystem: ${savedCount}/${hubDevices.devices.length}`);
                
                if (savedCount === hubDevices.devices.length) {
                    console.log(`   ✅ All devices successfully saved`);
                } else if (savedCount > 0) {
                    console.log(`   ⚠️  Only ${savedCount} out of ${hubDevices.devices.length} devices saved`);
                } else {
                    console.log(`   ❌ No devices saved to filesystem`);
                }
                console.log('');
            }
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('✨ Device discovery test completed successfully!');

    } catch (error) {
        console.error('❌ Error during test:', error);
        throw error;
    } finally {
        // Clean up
        console.log('\n🧹 Cleaning up...');
        await client.close();
        console.log('✅ Cleanup complete');
    }
}

/**
 * Load hubs from filesystem as fallback
 */
function loadHubsFromFilesystem(): Hub[] {
    const hubs: Hub[] = [];
    
    try {
        const hubsDirectory = path.join(process.cwd(), 'mcp_data', 'plugwise', 'hubs');
        
        if (!fs.existsSync(hubsDirectory)) {
            return hubs;
        }

        const files = fs.readdirSync(hubsDirectory);
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    const filePath = path.join(hubsDirectory, file);
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const hubData = JSON.parse(content);
                    
                    hubs.push({
                        name: hubData.name || file.replace('.json', ''),
                        ip: hubData.ip || 'unknown',
                        password: file.replace('.json', ''),
                        model: hubData.model,
                        firmware: hubData.firmware
                    });
                } catch (error) {
                    console.error(`Failed to load hub from ${file}:`, error);
                }
            }
        }
    } catch (error) {
        console.error('Error loading hubs from filesystem:', error);
    }
    
    return hubs;
}

// Run the test
testDeviceDiscovery().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
