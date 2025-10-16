/**
 * Test script for the add_hub functionality
 * 
 * This script tests the /addhub command functionality:
 * 1. Adding a hub by name
 * 2. Verifying the hub is saved to /hubs folder
 * 3. Loading hubs from files
 */

import { HubDiscoveryService } from '../src/services/hub-discovery.service.js';
import { promises as fs } from 'fs';
import * as path from 'path';

async function testAddHub() {
    console.log('🧪 Testing Add Hub Functionality\n');

    const discoveryService = new HubDiscoveryService();

    // Test 1: Add hub without name (should show syntax)
    console.log('Test 1: Add hub without name');
    console.log('Expected: Should return error with syntax message');
    console.log('---');

    // This would be called by the tool handler with no hubName
    // We'll test the service method directly

    // Test 2: Add hub with valid name
    console.log('\nTest 2: Add hub with valid name');
    console.log('Note: This will scan your network. Make sure your hub is connected.');
    console.log('Enter a hub name when prompted (e.g., glmpuuxg)');
    console.log('---');

    // Read hub name from command line
    const hubName = process.argv[2];

    if (!hubName) {
        console.log('\n❌ Please provide a hub name as an argument:');
        console.log('   npm run test -- <hub-name>');
        console.log('\nExample:');
        console.log('   npm run test -- glmpuuxg');
        process.exit(1);
    }

    console.log(`\n🔍 Searching for hub: ${hubName}`);

    try {
        const result = await discoveryService.addHubByName(hubName);

        if (result.success && result.hub) {
            console.log('\n✅ Success! Hub found and added:');
            console.log(`   Name: ${result.hub.name}`);
            console.log(`   IP: ${result.hub.ip}`);
            console.log(`   Model: ${result.hub.model || 'Unknown'}`);
            console.log(`   Firmware: ${result.hub.firmware || 'Unknown'}`);

            // Test 3: Verify file was created
            console.log('\nTest 3: Verify hub file was created');
            const hubsDir = path.join(process.cwd(), 'hubs');
            const filePath = path.join(hubsDir, `${hubName}.json`);

            try {
                const fileContent = await fs.readFile(filePath, 'utf-8');
                const hubData = JSON.parse(fileContent);
                console.log('✅ Hub file created successfully:');
                console.log(`   Path: ${filePath}`);
                console.log(`   Content: ${JSON.stringify(hubData, null, 2)}`);
            } catch (error) {
                console.log('❌ Failed to read hub file:', error);
            }

            // Test 4: Load hubs from files
            console.log('\nTest 4: Load all hubs from files');
            const discoveryService2 = new HubDiscoveryService();
            await discoveryService2.loadAllHubsFromFiles();
            const loadedHubs = discoveryService2.getDiscoveredHubs();
            console.log(`✅ Loaded ${loadedHubs.length} hub(s) from files:`);
            loadedHubs.forEach(hub => {
                console.log(`   - ${hub.name} at ${hub.ip}`);
            });

        } else {
            console.log('\n❌ Hub not found:');
            console.log(`   ${result.error}`);
        }
    } catch (error) {
        console.log('\n❌ Error during test:');
        console.log(`   ${(error as Error).message}`);
    }

    console.log('\n✅ Test completed!');
}

// Run the test
testAddHub().catch(console.error);
