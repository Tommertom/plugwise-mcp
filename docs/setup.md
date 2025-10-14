# MCP Server Setup Guide

This guide will help you get started with the Plugwise MCP Server.

## What is MCP?

Model Context Protocol (MCP) is an open-source standard for connecting AI applications to external systems. It allows AI assistants like Claude to interact with tools, resources, and data sources in a standardized way.

## Architecture

The Plugwise MCP Server consists of:

1. **MCP Server** (`src/mcp/server.ts`): The main server that implements the MCP protocol
2. **Tools**: Functions that AI can call to perform actions
3. **Resources**: Data sources that provide information to AI
4. **Prompts**: Templates that help structure AI interactions

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

This installs:
- `@modelcontextprotocol/sdk`: The official MCP SDK for TypeScript
- `express`: Web framework for handling HTTP requests
- `zod`: Schema validation library
- TypeScript and other dev dependencies

### 2. Build the Server

```bash
npm run build
```

This compiles the TypeScript code to JavaScript in the `build/` directory.

### 3. Configure Environment Variables

Create a `.env` file in the project root to configure your Plugwise hubs:

```bash
# Plugwise Hub Credentials
HUB1=your-password-here
HUB1IP=192.168.1.100

HUB2=another-password
HUB2IP=192.168.1.101

# You can define up to HUB10
# HUB3=password3
# HUB3IP=192.168.1.102
```

**How it works:**
- The server reads the `.env` file on startup
- For each `HUBx` entry that has a corresponding `HUBxIP` entry, the server will:
  - Store the hub credentials
  - Attempt to connect to retrieve hub information (name, model, firmware)
  - Make the hub available for quick connection without scanning
- If a hub is unreachable during startup, the credentials are still stored for later use

**Finding your hub password:**
- Check the bottom of your Plugwise gateway device
- Look for the 8-character code (e.g., "AbCd1234")

### 4. Run the Server

**Development mode** (with auto-reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

The server will start on `http://localhost:3000/mcp`

### 4. Test the Server

#### Option A: Using MCP Inspector (Recommended)

The MCP Inspector is a visual tool for testing MCP servers:

```bash
npx @modelcontextprotocol/inspector
```

Then connect to `http://localhost:3000/mcp`

#### Option B: Using an MCP Client

Connect from VS Code, Claude, or other MCP-compatible clients (see README.md for details).

#### Option C: Using curl

Test the health endpoint:
```bash
curl http://localhost:3000/health
```

Send an initialization request:
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-06-18",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    },
    "id": 1
  }'
```

## Understanding the Hello World Implementation

### The Greeting Tool

```typescript
server.registerTool('greet', { ... }, async ({ name }) => {
    const greeting = `Hello, ${name}!`;
    return {
        content: [{ type: 'text', text: greeting }],
        structuredContent: { greeting }
    };
});
```

This tool:
- Takes a `name` parameter
- Returns a greeting message
- Can be called by AI to greet users

### The Greeting Resource

```typescript
server.registerResource(
    'greeting',
    new ResourceTemplate('greeting://{name}', ...),
    ...
);
```

This resource:
- Provides greeting data dynamically
- Can be read by AI to get information
- Uses URI templates for parameter passing

### The Welcome Prompt

```typescript
server.registerPrompt('welcome', { ... }, ({ username }) => {
    return {
        messages: [...]
    };
});
```

This prompt:
- Helps structure AI interactions
- Provides a template for welcome messages
- Can be triggered by users

## Next Steps

1. **Explore the Code**: Look at `src/mcp/server.ts` to understand the implementation
2. **Add More Tools**: Extend the server with Plugwise-specific functionality
3. **Test Thoroughly**: Use the MCP Inspector to test your additions
4. **Read the Docs**: Check out the [MCP documentation](https://modelcontextprotocol.io/)

## Troubleshooting

### Port Already in Use

If port 3000 is already in use, set a different port:

```bash
PORT=3001 npm run dev
```

### TypeScript Errors

Make sure you've installed all dependencies:

```bash
npm install
```

### Connection Issues

Check that:
1. The server is running (`npm run dev`)
2. You're connecting to the correct URL (`http://localhost:3000/mcp`)
3. No firewall is blocking the connection

## Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [TypeScript SDK GitHub](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
