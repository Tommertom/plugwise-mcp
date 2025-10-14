#!/usr/bin/env tsx
/**
 * Debug XML parsing
 */

import { parseStringPromise } from 'xml2js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    const url = `http://${process.env.HUB1IP}/core/domain_objects`;
    const auth = Buffer.from(`smile:${process.env.HUB1}`).toString('base64');

    const response = await fetch(url, {
        headers: {
            'Authorization': `Basic ${auth}`,
        }
    });

    const xml = await response.text();
    const data = await parseStringPromise(xml, {
        explicitArray: false,
        mergeAttrs: true
    });
    
    // Find the Jip thermometer
    const appliances = Array.isArray(data.domain_objects.appliance) ? data.domain_objects.appliance : [data.domain_objects.appliance];
    const jip = appliances.find((a: any) => a.name && a.name.includes('Jip'));
    
    if (jip) {
        console.log('Jip device:');
        console.log('Has logs?', !!jip.logs);
        if (jip.logs) {
            console.log('Has point_log?', !!jip.logs.point_log);
            if (jip.logs.point_log) {
                const logs = Array.isArray(jip.logs.point_log) ? jip.logs.point_log : [jip.logs.point_log];
                console.log('Number of logs:', logs.length);
                console.log('\nFirst few logs:');
                logs.slice(0, 3).forEach((log: any, i: number) => {
                    console.log(`\nLog ${i}:`);
                    console.log('  type:', log.type);
                    console.log('  period:', JSON.stringify(log.period, null, 2));
                });
            }
        }
    }
    
    // Check a zone with temperature
    const locations = Array.isArray(data.domain_objects.location) ? data.domain_objects.location : [data.domain_objects.location];
    const hal = locations.find((l: any) => l.name === 'Hal');
    
    if (hal) {
        console.log('\n\n=== Hal zone ===');
        console.log('Has logs?', !!hal.logs);
        if (hal.logs && hal.logs.point_log) {
            const logs = Array.isArray(hal.logs.point_log) ? hal.logs.point_log : [hal.logs.point_log];
            const tempLog = logs.find((l: any) => l.type === 'temperature');
            if (tempLog) {
                console.log('\nTemperature log found:');
                console.log(JSON.stringify(tempLog, null, 2));
            }
        }
    }
    
    // Check actuator functionalities
    const gateway = appliances.find((a: any) => a.type === 'gateway');
    if (gateway) {
        console.log('\n\n=== Gateway device ===');
        console.log('Has actuator_functionalities?', !!gateway.actuator_functionalities);
        if (gateway.actuator_functionalities) {
            console.log('\nActuator functionalities:');
            console.log(JSON.stringify(gateway.actuator_functionalities, null, 2).substring(0, 1000));
        }
    }
}

main();
