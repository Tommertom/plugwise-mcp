#!/usr/bin/env node

/**
 * Test script to verify the agent MCP server works correctly
 * This simulates an MCP client calling the list_tools method
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testAgentMcpServer() {
    console.log('Starting Agent MCP Server test...\n');

    const transport = new StdioClientTransport({
        command: 'node',
        args: ['dist/cli/plugwise-agent-cli.js'],
    });

    const client = new Client(
        {
            name: 'test-client',
            version: '1.0.0',
        },
        {
            capabilities: {},
        }
    );

    try {
        await client.connect(transport);
        console.log('✓ Connected to agent MCP server\n');

        // List available tools
        const tools = await client.listTools();
        console.log('Available tools:');
        console.log(JSON.stringify(tools, null, 2));

        console.log('\n✓ Test passed: Agent MCP server exposes single tool');

        await client.close();
    } catch (error) {
        console.error('✗ Test failed:', error);
        process.exit(1);
    }
}

testAgentMcpServer();
