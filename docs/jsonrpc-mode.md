# JSON-RPC Mode Documentation

## Overview

The Plugwise Agent CLI supports JSON-RPC 2.0 protocol for programmatic interaction.

## Usage

```bash
# Start JSON-RPC mode
node dist/cli/plugwise-agent-cli.js --jsonrpc

# Or with npm script
npm run agent -- --jsonrpc
```

## JSON-RPC Protocol

The CLI implements JSON-RPC 2.0 specification.

### Request Format

```json
{
  "jsonrpc": "2.0",
  "method": "execute",
  "params": {
    "instruction": "natural language command"
  },
  "id": 1
}
```

### Successful Response

```json
{
  "jsonrpc": "2.0",
  "result": {
    "text": "Response from the agent",
    "steps": 3
  },
  "id": 1
}
```

### Error Response

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32602,
    "message": "Invalid params: instruction is required"
  },
  "id": 1
}
```

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| -32700 | Parse error | Invalid JSON was received |
| -32602 | Invalid params | Missing or invalid instruction parameter |
| -32603 | Internal error | Agent execution failed |
| -32000 | Server error | Missing API key or configuration error |

## Examples

### Example 1: List Devices

**Request:**
```bash
echo '{"jsonrpc":"2.0","method":"execute","params":{"instruction":"List all devices"},"id":1}' | \
  node dist/cli/plugwise-agent-cli.js --jsonrpc
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "text": "Here are your Plugwise devices:\n- Living Room Thermostat (Adam)\n- Bedroom Radiator (Anna)",
    "steps": 2
  },
  "id": 1
}
```

### Example 2: Set Temperature

**Request:**
```bash
echo '{"jsonrpc":"2.0","method":"execute","params":{"instruction":"Set bedroom to 19 degrees"},"id":2}' | \
  node dist/cli/plugwise-agent-cli.js --jsonrpc
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "text": "I've set the bedroom temperature to 19°C.",
    "steps": 3
  },
  "id": 2
}
```

### Example 3: Error Handling

**Request (missing instruction):**
```bash
echo '{"jsonrpc":"2.0","method":"execute","params":{},"id":3}' | \
  node dist/cli/plugwise-agent-cli.js --jsonrpc
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32602,
    "message": "Invalid params: instruction is required"
  },
  "id": 3
}
```

### Example 4: Invalid JSON

**Request:**
```bash
echo '{invalid json}' | node dist/cli/plugwise-agent-cli.js --jsonrpc
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32700,
    "message": "Parse error: Invalid JSON"
  },
  "id": null
}
```

## Integration Examples

### Python

```python
import json
import subprocess

def call_plugwise_agent(instruction):
    request = {
        "jsonrpc": "2.0",
        "method": "execute",
        "params": {"instruction": instruction},
        "id": 1
    }
    
    proc = subprocess.Popen(
        ["node", "dist/cli/plugwise-agent-cli.js", "--jsonrpc"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    stdout, _ = proc.communicate(json.dumps(request).encode() + b'\n')
    return json.loads(stdout.decode())

# Usage
response = call_plugwise_agent("List my devices")
print(response["result"]["text"])
```

### Node.js

```javascript
import { spawn } from 'child_process';

function callPlugwiseAgent(instruction) {
    return new Promise((resolve, reject) => {
        const cli = spawn('node', ['dist/cli/plugwise-agent-cli.js', '--jsonrpc']);
        
        let output = '';
        cli.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        cli.on('close', () => {
            try {
                resolve(JSON.parse(output));
            } catch (err) {
                reject(err);
            }
        });
        
        const request = {
            jsonrpc: '2.0',
            method: 'execute',
            params: { instruction },
            id: 1
        };
        
        cli.stdin.write(JSON.stringify(request) + '\n');
        cli.stdin.end();
    });
}

// Usage
const response = await callPlugwiseAgent('List my devices');
console.log(response.result.text);
```

### cURL (via named pipe)

```bash
# Create a named pipe
mkfifo /tmp/plugwise_pipe

# Start the JSON-RPC server
node dist/cli/plugwise-agent-cli.js --jsonrpc < /tmp/plugwise_pipe &

# Send request
echo '{"jsonrpc":"2.0","method":"execute","params":{"instruction":"List devices"},"id":1}' > /tmp/plugwise_pipe
```

## Environment Variables

- `OPENAI_API_KEY` - Required for OpenAI models
- `GOOGLE_GENERATIVE_AI_API_KEY` - Required for Gemini models
- `PLUGWISE_AGENT_MODEL` - Model to use (default: gpt-4o-mini)

## Performance Considerations

1. **Initialization**: First request includes agent initialization (~2-5 seconds)
2. **Subsequent requests**: Faster as agent is already initialized
3. **Connection reuse**: Keep the process running for multiple requests
4. **Timeouts**: Set appropriate timeouts (30s+ recommended for complex queries)

## Differences from MCP Mode

| Feature | JSON-RPC Mode | MCP Mode |
|---------|---------------|----------|
| Protocol | JSON-RPC 2.0 | MCP Protocol |
| Transport | stdin/stdout | stdio |
| Output | Pure JSON | MCP messages |
| Use case | Scripting | MCP clients |
| Debugging | No stderr | Stderr logs |

## Testing

```bash
# Run JSON-RPC test suite
npx tsx scripts/test-jsonrpc-mode.ts

# Manual testing
echo '{"jsonrpc":"2.0","method":"execute","params":{"instruction":"test"},"id":1}' | \
  node dist/cli/plugwise-agent-cli.js --jsonrpc --skip-build
```
