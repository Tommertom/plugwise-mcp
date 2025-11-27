# Plugwise Agent MCP Server

## Overview

The Plugwise Agent CLI can run in two modes:

1. **Agent Mode** (with arguments) - Interactive AI agent for direct control
2. **MCP Server Mode** (no arguments) - Exposes a single MCP tool for integration

## MCP Server Mode

When run without arguments, the CLI acts as an MCP server that exposes a single tool: `manage_plugwise`.

### Starting the Server

```bash
# Using npm script
npm run agent

# Or directly
node dist/cli/plugwise-agent-cli.js

# In Claude Desktop config
{
  "mcpServers": {
    "plugwise-agent": {
      "command": "node",
      "args": ["/path/to/plugwise/dist/cli/plugwise-agent-cli.js"]
    }
  }
}
```

### Available Tool

#### `manage_plugwise`

Control and manage Plugwise smart home devices using natural language instructions.

**Parameters:**
- `instruction` (string, required) - Natural language command for the Plugwise system

**Examples:**
```json
{
  "instruction": "List all my devices"
}
```

```json
{
  "instruction": "Set living room temperature to 21 degrees"
}
```

```json
{
  "instruction": "What is the current power usage?"
}
```

### How It Works

1. The MCP server receives natural language instructions through the `manage_plugwise` tool
2. Instructions are passed to the Plugwise AI agent (powered by Mastra)
3. The agent uses the full Plugwise MCP server internally to execute commands
4. Results are returned as natural language responses

### Environment Variables

- `OPENAI_API_KEY` - Required for OpenAI models (default: gpt-4o-mini)
- `GOOGLE_GENERATIVE_AI_API_KEY` - Required if using Gemini models
- `PLUGWISE_AGENT_MODEL` - Override default model (optional)

### Architecture

```
┌─────────────────────────────────────┐
│   MCP Client (e.g., Claude)         │
└──────────────┬──────────────────────┘
               │ manage_plugwise tool
               ▼
┌─────────────────────────────────────┐
│   Agent MCP Server                  │
│   (agent-mcp-server.ts)             │
└──────────────┬──────────────────────┘
               │ natural language
               ▼
┌─────────────────────────────────────┐
│   Mastra AI Agent                   │
│   (plugwise-agent.ts)               │
└──────────────┬──────────────────────┘
               │ tool calls
               ▼
┌─────────────────────────────────────┐
│   Plugwise MCP Server               │
│   (15+ specialized tools)           │
└──────────────┬──────────────────────┘
               │ HTTP/XML API
               ▼
┌─────────────────────────────────────┐
│   Plugwise Hardware                 │
│   (Adam, Anna, Smile P1, Stretch)   │
└─────────────────────────────────────┘
```

## Agent Mode

When run with a prompt argument, the CLI operates as an interactive agent.

### Usage

```bash
# Using npm script
npm run agent "List my devices"

# With custom model
npm run agent "Set temperature to 20" -- --model gpt-4o

# Skip build step
npm run agent "What's the power usage?" -- --skip-build
```

### Examples

```bash
npm run agent "Show me all connected devices"
npm run agent "Set the bedroom temperature to 19 degrees"
npm run agent "What is the current energy consumption?"
npm run agent "Turn off heating in the living room"
```

## Benefits of Dual Mode

### MCP Server Mode
- **Integration**: Works with any MCP client (Claude Desktop, etc.)
- **Composability**: Can be combined with other MCP servers
- **Standardized**: Uses MCP protocol for tool discovery and execution
- **Single Interface**: One simple tool instead of 15+ specialized tools

### Agent Mode  
- **Direct Control**: No MCP client needed
- **Debugging**: See detailed agent reasoning steps
- **Development**: Quick testing of natural language commands
- **Scripting**: Can be integrated into shell scripts

## Testing

```bash
# Test MCP server mode
npx tsx scripts/test-agent-mcp.ts

# Test agent mode
npm run agent "List devices"
```

## See Also

- [Main MCP Server Documentation](./mcp-server.md) - Full Plugwise MCP server with all tools
- [Mastra Documentation](https://mastra.ai) - AI agent framework
- [MCP Protocol](https://modelcontextprotocol.io) - Model Context Protocol specification
