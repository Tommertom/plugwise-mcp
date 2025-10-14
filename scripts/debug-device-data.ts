#!/usr/bin/env tsx
/**
 * Debug script to see raw device data
 */

import { PlugwiseClient } from '../src/client/plugwise-client.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    const client = new PlugwiseClient({
        host: process.env.HUB1IP || '',
        password: process.env.HUB1 || ''
    });

    await client.connect();
    const data = await client.getDevices();

    console.log('Devices with temperature sensors:\n');
    Object.entries(data.entities).forEach(([id, device]: [string, any]) => {
        if (device.sensors && device.sensors.temperature !== undefined) {
            console.log(`${device.name} (${device.dev_class})`);
            console.log(`  Temperature: ${device.sensors.temperature}°C`);
            console.log(`  Sensors: ${JSON.stringify(device.sensors)}`);
        }
    });

    console.log('\n\nDevices with switches:\n');
    Object.entries(data.entities).forEach(([id, device]: [string, any]) => {
        if (device.switches && Object.keys(device.switches).length > 0) {
            console.log(`${device.name} (${device.dev_class})`);
            console.log(`  Switches: ${JSON.stringify(device.switches)}`);
        }
    });
}

main();
