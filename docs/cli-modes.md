# CLI Modes Comparison

## Overview

The Plugwise Agent CLI supports 4 distinct operating modes:

| Mode | Arguments | Input/Output | Use Case |
|------|-----------|--------------|----------|
| **MCP Server** | None | MCP Protocol | Integration with MCP clients (Claude, etc.) |
| **JSON-RPC** | `--jsonrpc` | JSON-RPC 2.0 | Scripting, programmatic control |
| **Human** | `"prompt"` | Natural language | Quick commands, testing |
| **Verbose** | `"prompt" -v` | Natural + debug | Development, debugging |

## Mode Details

### 1. MCP Server Mode

**Start:** `npm run agent`

**Purpose:** Integration with MCP clients like Claude Desktop

**Output:**
- MCP protocol messages on stdio
- Exposes single `manage_plugwise` tool
- Stderr for logging

**Example:**
```bash
npm run agent
# Use in Claude Desktop config
```

### 2. JSON-RPC Mode

**Start:** `npm run agent -- --jsonrpc`

**Purpose:** Programmatic API for scripts and automation

**Input:** JSON-RPC 2.0 requests on stdin
```json
{"jsonrpc":"2.0","method":"execute","params":{"instruction":"List devices"},"id":1}
```

**Output:** JSON-RPC 2.0 responses on stdout
```json
{"jsonrpc":"2.0","result":{"text":"...","steps":2},"id":1}
```

**Example:**
```bash
echo '{"jsonrpc":"2.0","method":"execute","params":{"instruction":"List devices"},"id":1}' | npm run agent -- --jsonrpc
```

### 3. Human Mode

**Start:** `npm run agent "your command"`

**Purpose:** Quick interactive commands

**Output:** Clean natural language response

**Example:**
```bash
npm run agent "Set bedroom to 19 degrees"
# Output: I've set the bedroom temperature to 19°C.
```

### 4. Verbose Mode

**Start:** `npm run agent "your command" -- -v`

**Purpose:** Development and debugging

**Output:** 
- Detailed step-by-step execution
- Tool calls with arguments
- Tool results
- Agent reasoning process

**Example:**
```bash
npm run agent "List devices" -- -v

# Output:
# [CLI] Executing prompt: "List devices"
# 
# [Agent] 1 tool call(s) in this step
#   [1] get_devices
#       Args: {"hubId": "abc123"}
# [Agent] 1 tool result(s) received
#   Result 1: {"devices":[...]...
# 
# ============================================================
# AGENT RESPONSE:
# ============================================================
# Here are your devices:
# - Living Room (Adam)
# - Bedroom (Anna)
# ============================================================
# 
# [Debug] Agent completed 2 reasoning step(s):
#   Step 1 [Tool execution]:
#     → get_devices (hubId)
#   Step 2 [Final response]:
#     Response: "Here are your devices..."
```

## When to Use Each Mode

### MCP Server Mode
✅ Integrating with Claude Desktop  
✅ Using with other MCP clients  
✅ Combining with other MCP servers  

### JSON-RPC Mode
✅ Writing automation scripts  
✅ Building custom integrations  
✅ Batch operations  
✅ CI/CD pipelines  
✅ Pure programmatic access  

### Human Mode
✅ Quick one-off commands  
✅ Testing the agent  
✅ Daily interactive use  
✅ Clean readable output  

### Verbose Mode
✅ Debugging agent behavior  
✅ Understanding tool execution  
✅ Development and testing  
✅ Learning how the agent works  
✅ Troubleshooting issues  

## Examples by Use Case

### Home Automation Script (JSON-RPC)
```python
import json, subprocess

def set_temperature(room, temp):
    request = {
        "jsonrpc": "2.0",
        "method": "execute",
        "params": {"instruction": f"Set {room} to {temp} degrees"},
        "id": 1
    }
    proc = subprocess.run(
        ["npm", "run", "agent", "--", "--jsonrpc"],
        input=json.dumps(request),
        capture_output=True,
        text=True
    )
    return json.loads(proc.stdout)

set_temperature("bedroom", 19)
```

### Daily Use (Human)
```bash
# Morning routine
npm run agent "Set bedroom to 21 degrees"
npm run agent "What's the current power usage?"

# Evening
npm run agent "Lower all thermostats to 18 degrees"
```

### Development (Verbose)
```bash
# See exactly what the agent is doing
npm run agent "List all devices" -- -v

# Troubleshoot a complex command
npm run agent "Set living room to comfort mode and bedroom to 18" -- -v
```

### Claude Desktop (MCP)
```json
{
  "mcpServers": {
    "plugwise-agent": {
      "command": "npm",
      "args": ["run", "agent"],
      "cwd": "/path/to/plugwise"
    }
  }
}
```

## Configuration

All modes share the same environment variables:

```bash
OPENAI_API_KEY=sk-...              # Required for OpenAI models
GOOGLE_GENERATIVE_AI_API_KEY=...  # Required for Gemini
PLUGWISE_AGENT_MODEL=gpt-4o-mini  # Model selection
```

## Output Streams

| Mode | stdout | stderr |
|------|--------|--------|
| MCP Server | MCP messages | Logs, errors |
| JSON-RPC | JSON only | Silent |
| Human | Response text | Silent |
| Verbose | Response text | Debug info, logs |

## Performance

| Mode | Startup | Latency | Throughput |
|------|---------|---------|------------|
| MCP Server | ~2s | Low (persistent) | High |
| JSON-RPC | ~2s | Medium (per-call) | Medium |
| Human | ~3s | High (build+exec) | Low |
| Verbose | ~3s | High (build+exec) | Low |

## See Also

- [Agent MCP Server](./agent-mcp-server.md) - MCP mode details
- [JSON-RPC Mode](./jsonrpc-mode.md) - JSON-RPC API reference
- [Agent Quick Reference](./agent-quick-reference.md) - Quick command reference
