/**
 * Test script for server description with hub listing
 * 
 * This script verifies that the PlugwiseMcpServer constructor
 * properly loads and displays known hubs in its description.
 */

import { PlugwiseMcpServer } from '../src/mcp/server.js';
import { promises as fs } from 'fs';
import * as path from 'path';

async function testServerDescription() {
    console.log('🧪 Testing Server Description with Hub Listing\n');

    // Setup: Create some mock hub files
    const hubsDir = path.join(process.cwd(), 'hubs');
    await fs.mkdir(hubsDir, { recursive: true });

    // Create test hub files
    const testHubs = [
        {
            name: 'Living Room Hub',
            ip: '192.168.1.100',
            password: 'testhub1',
            model: 'Anna',
            firmware: '4.0.15'
        },
        {
            name: 'Bedroom Hub',
            ip: '192.168.1.101',
            password: 'testhub2',
            model: 'Adam',
            firmware: '3.1.8'
        }
    ];

    console.log('📝 Creating test hub files...');
    for (let i = 0; i < testHubs.length; i++) {
        const hubPath = path.join(hubsDir, `test-hub-${i + 1}.json`);
        await fs.writeFile(hubPath, JSON.stringify(testHubs[i], null, 2));
        console.log(`   ✓ Created ${path.basename(hubPath)}`);
    }

    console.log('\n🚀 Creating PlugwiseMcpServer instance...\n');

    // Create server instance - this should load hubs in constructor
    const server = new PlugwiseMcpServer() as any;

    console.log('✅ Server created successfully!');

    // Access the server description
    console.log('\n📋 Verifying server description...');
    const description = server.server?.serverInfo?.description || 'Description not accessible';

    // Check if description contains expected content
    const checks = [
        {
            test: 'Contains hub listing message',
            check: description.includes('The hubs known now are listed below'),
            expected: true
        },
        {
            test: 'Contains add_hub tool mention',
            check: description.includes('add_hub'),
            expected: true
        },
        {
            test: 'Contains Living Room Hub',
            check: description.includes('Living Room Hub'),
            expected: true
        },
        {
            test: 'Contains first hub IP',
            check: description.includes('192.168.1.100'),
            expected: true
        },
        {
            test: 'Contains Bedroom Hub',
            check: description.includes('Bedroom Hub'),
            expected: true
        },
        {
            test: 'Contains second hub IP',
            check: description.includes('192.168.1.101'),
            expected: true
        }
    ];

    let allPassed = true;
    for (const check of checks) {
        const passed = check.check === check.expected;
        console.log(`   ${passed ? '✅' : '❌'} ${check.test}`);
        if (!passed) allPassed = false;
    }

    console.log('\n📄 Full Description:');
    console.log('─'.repeat(80));
    console.log(description);
    console.log('─'.repeat(80));

    // Cleanup
    console.log('\n🧹 Cleaning up test files...');
    for (let i = 0; i < testHubs.length; i++) {
        const hubPath = path.join(hubsDir, `test-hub-${i + 1}.json`);
        try {
            await fs.unlink(hubPath);
            console.log(`   ✓ Deleted ${path.basename(hubPath)}`);
        } catch (error) {
            console.log(`   ⚠ Could not delete ${path.basename(hubPath)}`);
        }
    }

    console.log(`\n${allPassed ? '✅ All checks passed!' : '❌ Some checks failed!'}\n`);

    // Exit with appropriate code
    process.exit(allPassed ? 0 : 1);
}

// Run the test
testServerDescription().catch(console.error);
