# Plugwise Agent Quick Reference

## Two Ways to Run

### 1. Agent Mode (Interactive)
Run with a natural language prompt:

```bash
npm run agent "your command here"
```

**Examples:**
```bash
npm run agent "List all devices"
npm run agent "Set bedroom to 19 degrees"
npm run agent "What's the power usage?"
```

**Options:**
- `--model <name>` - Use different AI model (default: gpt-4o-mini)
- `--skip-build` - Skip TypeScript compilation

### 2. MCP Server Mode (Integration)
Run without arguments to start as MCP server:

```bash
npm run agent
```

**Exposes single tool:** `manage_plugwise`

**Use in MCP clients:**
```json
{
  "mcpServers": {
    "plugwise-agent": {
      "command": "node",
      "args": ["/path/to/dist/cli/plugwise-agent-cli.js"],
      "env": {
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes (OpenAI) | API key for OpenAI models |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes (Gemini) | API key for Google Gemini models |
| `PLUGWISE_AGENT_MODEL` | No | Override default model |

## Architecture

```
Agent CLI (plugwise-agent-cli.ts)
├── Interactive Mode → Mastra Agent → Plugwise Tools
└── MCP Server Mode → Agent MCP Server → Mastra Agent → Plugwise Tools
```

## Key Files

- `src/cli/plugwise-agent-cli.ts` - Main CLI entry point
- `src/cli/agent-mcp-server.ts` - MCP server with single tool
- `src/cli/lib/plugwise-agent.ts` - Mastra agent definition
- `src/cli/lib/mastra-init.ts` - Agent initialization
- `src/cli/lib/mcp-client.ts` - Internal MCP client
- `src/cli/lib/tool-adapter.ts` - Tool conversion layer

## Testing

```bash
# Test MCP server mode
npx tsx scripts/test-agent-mcp.ts

# Test interactive mode
npm run agent "test command"
```
