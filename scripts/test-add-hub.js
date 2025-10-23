#!/usr/bin/env node

/**
 * Test script for add_hub tool
 * Tests discovering a hub by name on the network
 */

import { HubDiscoveryService } from '../dist/services/hub-discovery.service.js';

async function testAddHub() {
    const hubName = process.argv[2];
    
    if (!hubName) {
        console.error('Usage: node scripts/test-add-hub.js <hub-name>');
        process.exit(1);
    }
    
    console.log('='.repeat(80));
    console.log(`TEST: add_hub tool - Finding ${hubName} on network`);
    console.log('='.repeat(80));
    console.log();

    const discoveryService = new HubDiscoveryService();
    
    console.log('Starting hub discovery...');
    const result = await discoveryService.addHubByName(hubName);
    
    console.log();
    console.log('='.repeat(80));
    console.log('RESULT:');
    console.log(JSON.stringify(result, null, 2));
    console.log('='.repeat(80));
    
    if (result.success) {
        console.log('\n✅ TEST PASSED - Hub found and saved!');
        process.exit(0);
    } else {
        console.log('\n❌ TEST FAILED - Hub not found');
        process.exit(1);
    }
}

testAddHub().catch(error => {
    console.error('Test error:', error);
    process.exit(1);
});
