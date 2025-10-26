/**
 * Simple test to view the server description
 */

import { promises as fs } from 'fs';
import * as path from 'path';

async function testDescription() {
    console.log('🧪 Testing Hub Loading in Constructor\n');

    // Create test hubs
    const hubsDir = path.join(process.cwd(), 'hubs');
    await fs.mkdir(hubsDir, { recursive: true });

    const testHubs = [
        {
            name: 'Living Room Hub',
            ip: '192.168.1.100',
            password: 'test1',
            model: 'Anna',
            firmware: '4.0.15'
        },
        {
            name: 'Bedroom Hub',
            ip: '192.168.1.101',
            password: 'test2',
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

    console.log('\n🔍 Testing getKnownHubsSync and formatHubsDescription methods...\n');

    // Import and use the methods directly
    const { PlugwiseMcpServer } = await import('../src/mcp/server.js');

    // Create instance - this will load hubs in constructor
    console.log('Creating server instance (check console for hub loading)...\n');
    const serverInstance = new PlugwiseMcpServer();

    // Cleanup
    console.log('\n🧹 Cleaning up test files...');
    for (let i = 0; i < testHubs.length; i++) {
        const hubPath = path.join(hubsDir, `test-hub-${i + 1}.json`);
        await fs.unlink(hubPath);
        console.log(`   ✓ Deleted ${path.basename(hubPath)}`);
    }

    console.log('\n✅ Test completed!');
    console.log('\n💡 The server description should have been displayed when the server was created.');
    console.log('   Look for it in the constructor output above.\n');
}

testDescription().catch(console.error);
