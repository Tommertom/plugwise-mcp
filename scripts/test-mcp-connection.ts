#!/usr/bin/env node
/**
 * Test script for Plugwise MCP Server
 * 
 * This script:
 * 1. Spawns the MCP server as a child process
 * 2. Connects to it via stdio using the MCP SDK client
 * 3. Displays the server description
 * 4. Lists all available tools
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testMcpConnection() {
    console.log('🚀 Starting Plugwise MCP Server test...\n');

    // Create stdio transport - this will spawn the server process
    console.log('📡 Creating MCP client transport...');
    const transport = new StdioClientTransport({
        command: 'node',
        args: ['dist/index.js'],
    });

    // Create MCP client
    const client = new Client({
        name: 'test-client',
        version: '1.0.0',
    }, {
        capabilities: {}
    });

    try {
        // Connect to the server
        console.log('🔌 Connecting to MCP server...');
        await client.connect(transport);
        console.log('✅ Connected successfully!\n');

        // Get server information
        const serverInfo = client.getServerVersion();
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 SERVER INFORMATION');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Name:        ${serverInfo?.name || 'N/A'}`);
        console.log(`Version:     ${serverInfo?.version || 'N/A'}`);
        console.log(`\nDescription:`);
        const description = serverInfo?.description ? String(serverInfo.description) : 'N/A';
        console.log(wrapText(description, 80));
        console.log('\n');

        // List all available tools
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔧 AVAILABLE TOOLS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        const toolsResponse = await client.listTools();
        
        if (toolsResponse.tools && toolsResponse.tools.length > 0) {
            console.log(`\nFound ${toolsResponse.tools.length} tools:\n`);
            
            toolsResponse.tools.forEach((tool, index) => {
                console.log(`${index + 1}. ${tool.name}`);
                console.log(`   ${wrapText(tool.description || 'No description', 75, '   ')}`);
                
                if (tool.inputSchema && typeof tool.inputSchema === 'object') {
                    const schema = tool.inputSchema as any;
                    if (schema.properties) {
                        const props = Object.keys(schema.properties);
                        const required = schema.required || [];
                        console.log(`   Parameters: ${props.join(', ')}`);
                        if (required.length > 0) {
                            console.log(`   Required: ${required.join(', ')}`);
                        }
                    }
                }
                console.log('');
            });
        } else {
            console.log('No tools available.');
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('✨ Test completed successfully!');

    } catch (error) {
        console.error('❌ Error during test:', error);
        throw error;
    } finally {
        // Clean up
        console.log('\n🧹 Cleaning up...');
        await client.close();
        console.log('✅ Cleanup complete');
    }
}

/**
 * Wrap text to a specified width while preserving intentional line breaks
 */
function wrapText(text: string, width: number, indent: string = ''): string {
    // Split by newlines to preserve intentional breaks
    const paragraphs = text.split('\n');
    const wrappedParagraphs: string[] = [];
    
    for (const paragraph of paragraphs) {
        if (paragraph.trim() === '') {
            // Preserve empty lines
            wrappedParagraphs.push('');
            continue;
        }
        
        const words = paragraph.trim().split(' ');
        const lines: string[] = [];
        let currentLine = indent;
    
        for (const word of words) {
            if (currentLine.length + word.length + 1 <= width) {
                currentLine += (currentLine === indent ? '' : ' ') + word;
            } else {
                lines.push(currentLine);
                currentLine = indent + word;
            }
        }
        
        if (currentLine.length > indent.length) {
            lines.push(currentLine);
        }
        
        wrappedParagraphs.push(lines.join('\n'));
    }

    return wrappedParagraphs.join('\n');
}

// Run the test
testMcpConnection().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
