#!/usr/bin/env tsx
/**
 * Test Hub Scanning Script
 * 
 * This script tests the add-hub functionality by scanning the network
 * for a specific hub using its name/password.
 * 
 * Usage: tsx scripts/test-scan-hub.ts <hub-name>
 * Example: tsx scripts/test-scan-hub.ts glpmttxf
 */

import { HubDiscoveryService } from '../src/services/hub-discovery.service.js';

async function main() {
    console.log('🧪 Hub Scanning Test\n');
    console.log('='.repeat(80));
    
    // Get hub name from command line argument
    const hubName = process.argv[2];
    
    if (!hubName) {
        console.error('\n❌ Error: Hub name is required');
        console.error('\nUsage: tsx scripts/test-scan-hub.ts <hub-name>');
        console.error('Example: tsx scripts/test-scan-hub.ts glpmttxf\n');
        process.exit(1);
    }
    
    console.log(`\nHub Name: ${hubName}`);
    console.log('='.repeat(80));
    
    // Create discovery service
    const discoveryService = new HubDiscoveryService();
    
    // Run the scan
    const startTime = Date.now();
    const result = await discoveryService.addHubByName(hubName);
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    
    // Display results
    console.log('='.repeat(80));
    console.log('📊 SCAN RESULTS');
    console.log('='.repeat(80));
    console.log(`\nTotal scan time: ${totalTime}s`);
    
    if (result.success && result.hub) {
        console.log('\n✅ SUCCESS!\n');
        console.log('Hub Details:');
        console.log(`  Name:     ${result.hub.name}`);
        console.log(`  IP:       ${result.hub.ip}`);
        console.log(`  Model:    ${result.hub.model || 'Unknown'}`);
        console.log(`  Firmware: ${result.hub.firmware || 'Unknown'}`);
        console.log(`  Saved to: hubs/${hubName}.json`);
        console.log('');
        
        // Test connection
        console.log('🔌 Testing connection to discovered hub...');
        const { PlugwiseClient } = await import('../src/client/plugwise-client.js');
        
        try {
            const client = new PlugwiseClient({
                host: result.hub.ip,
                password: hubName
            });
            
            const gatewayInfo = await client.connect();
            console.log('✅ Connection test successful!');
            console.log(`   Gateway: ${gatewayInfo.name}`);
            
            // Get device count
            const devices = await client.getDevices();
            const deviceCount = Object.keys(devices.entities).length;
            console.log(`   Devices: ${deviceCount}`);
            
        } catch (error) {
            console.error('❌ Connection test failed:', (error as Error).message);
        }
        
    } else {
        console.log('\n❌ FAILED\n');
        console.log(`Error: ${result.error || 'Unknown error'}`);
        console.log('');
        
        console.log('Troubleshooting tips:');
        console.log('  1. Ensure the hub is powered on and connected to the network');
        console.log('  2. Verify the hub name/password is correct');
        console.log('  3. Check that your computer is on the same network as the hub');
        console.log('  4. Try adding the hub IP to .env as HUBxIP for faster access');
        console.log('');
        
        process.exit(1);
    }
    
    console.log('='.repeat(80));
    console.log('🎉 Test completed!\n');
}

main().catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
});
