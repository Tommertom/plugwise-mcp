#!/usr/bin/env node

import { PlugwiseMcpServer } from './mcp/server.js';

const server = new PlugwiseMcpServer();
server.run().catch((error) => {
    console.error('Failed to start Plugwise MCP server:', error);
    process.exit(1);
});