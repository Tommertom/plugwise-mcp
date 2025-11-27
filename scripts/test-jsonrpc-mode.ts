#!/usr/bin/env node

/**
 * Test JSON-RPC mode of the agent CLI
 */

import { spawn } from 'child_process';

async function testJsonRpcMode() {
    console.log('Testing JSON-RPC Mode...\n');

    const cli = spawn('node', ['dist/cli/plugwise-agent-cli.js', '--jsonrpc', '--skip-build'], {
        env: { ...process.env, OPENAI_API_KEY: 'test-key' }
    });

    let output = '';

    cli.stdout.on('data', (data) => {
        output += data.toString();
    });

    cli.stderr.on('data', (data) => {
        // Ignore stderr in JSON-RPC mode
    });

    // Test 1: Valid JSON-RPC request
    const request1 = {
        jsonrpc: '2.0',
        method: 'execute',
        params: {
            instruction: 'List my devices'
        },
        id: 1
    };

    console.log('Test 1: Valid JSON-RPC request');
    console.log('Input:', JSON.stringify(request1));
    cli.stdin.write(JSON.stringify(request1) + '\n');

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Invalid JSON
    console.log('\nTest 2: Invalid JSON');
    console.log('Input: {invalid json}');
    cli.stdin.write('{invalid json}\n');

    await new Promise(resolve => setTimeout(resolve, 500));

    // Test 3: Missing instruction parameter
    const request3 = {
        jsonrpc: '2.0',
        method: 'execute',
        params: {},
        id: 3
    };

    console.log('\nTest 3: Missing instruction parameter');
    console.log('Input:', JSON.stringify(request3));
    cli.stdin.write(JSON.stringify(request3) + '\n');

    await new Promise(resolve => setTimeout(resolve, 500));

    cli.stdin.end();

    cli.on('close', (code) => {
        console.log('\n' + '='.repeat(60));
        console.log('OUTPUT:');
        console.log('='.repeat(60));
        console.log(output);
        console.log('='.repeat(60));
        console.log(`\nProcess exited with code: ${code}`);
    });
}

testJsonRpcMode();
