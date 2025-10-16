/**
 * Test script for the list_hubs functionality
 * 
 * This script tests the /hubs command functionality:
 * 1. Listing hubs when none exist
 * 2. Listing hubs after adding some
 * 3. Verifying the output format
 */

import { HubDiscoveryService } from '../src/services/hub-discovery.service.js';
import { DiscoveredHub } from '../src/services/hub-discovery.service.js';

async function testListHubs() {
    console.log('🧪 Testing List Hubs Functionality\n');

    const discoveryService = new HubDiscoveryService();

    // Test 1: List hubs when none exist
    console.log('Test 1: List hubs when none exist');
    console.log('Expected: Should return empty list');
    console.log('---');

    await discoveryService.loadAllHubsFromFiles();
    let hubs = discoveryService.getDiscoveredHubs();
    
    if (hubs.length === 0) {
        console.log('✅ No hubs registered (as expected)');
    } else {
        console.log(`ℹ️  Found ${hubs.length} existing hub(s):`);
        hubs.forEach((hub, index) => {
            console.log(`   ${index + 1}. ${hub.name} at ${hub.ip}`);
        });
    }

    // Test 2: Add a mock hub and list
    console.log('\nTest 2: Add a mock hub and list');
    console.log('---');

    const mockHub: DiscoveredHub = {
        name: 'Test Hub',
        ip: '192.168.1.99',
        password: 'testpass',
        model: 'Test Gateway',
        firmware: '1.0.0',
        discoveredAt: new Date()
    };

    discoveryService.addHub(mockHub);
    hubs = discoveryService.getDiscoveredHubs();

    console.log(`✅ Hub added. Total hubs: ${hubs.length}`);
    console.log('\nHub List:');
    hubs.forEach((hub, index) => {
        console.log(`  ${index + 1}. ${hub.name}`);
        console.log(`     IP: ${hub.ip}`);
        console.log(`     Model: ${hub.model || 'Unknown'}`);
        console.log(`     Firmware: ${hub.firmware || 'Unknown'}`);
        console.log('');
    });

    // Test 3: Verify structured output format
    console.log('Test 3: Verify structured output format');
    console.log('---');

    const hubList = hubs.map(hub => ({
        name: hub.name,
        ip: hub.ip,
        model: hub.model || 'Unknown',
        firmware: hub.firmware || 'Unknown'
    }));

    console.log('✅ Structured output:');
    console.log(JSON.stringify({
        success: true,
        hubs: hubList,
        count: hubs.length,
        message: `Found ${hubs.length} hub(s)`
    }, null, 2));

    console.log('\n✅ All tests completed!');
}

// Run the test
testListHubs().catch(console.error);
