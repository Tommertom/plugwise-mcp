# Quick Reference: Reorganized Code Structure

## File Locations

### Main Entry Point
- `src/mcp/server.ts` - Start here to understand the application flow

### Configuration
- `src/mcp/config/environment.ts` - Environment variables and settings

### Services (Business Logic)
- `src/mcp/services/hub-discovery.service.ts` - Hub discovery and registry
- `src/mcp/services/connection.service.ts` - Connection management

### MCP Tools (User-facing API)
- `src/mcp/tools/scan-network.tool.ts` - `scan_network` tool
- `src/mcp/tools/connection.tool.ts` - `connect` tool
- `src/mcp/tools/device.tool.ts` - `get_devices` tool
- `src/mcp/tools/temperature.tool.ts` - `set_temperature`, `set_preset` tools
- `src/mcp/tools/switch.tool.ts` - `control_switch` tool
- `src/mcp/tools/gateway.tool.ts` - `set_gateway_mode`, `set_dhw_mode`, `set_regulation_mode`, `delete_notification`, `reboot_gateway` tools
- `src/mcp/tools/index.ts` - Tool registration (add new tools here)

### MCP Resources
- `src/mcp/resources/devices.resource.ts` - `plugwise://devices` resource
- `src/mcp/resources/index.ts` - Resource registration

### MCP Prompts
- `src/mcp/prompts/setup-guide.prompt.ts` - `setup_guide` prompt
- `src/mcp/prompts/index.ts` - Prompt registration

### Core Library (unchanged)
- `src/mcp/plugwise-client.ts` - HTTP client for Plugwise API
- `src/mcp/plugwise-types.ts` - TypeScript type definitions

## Quick Tasks

### I want to add a new tool
1. Create `src/mcp/tools/my-tool.tool.ts`
2. Export `registerMyTool()` function
3. Add to `src/mcp/tools/index.ts`
4. Build and test

### I want to modify an existing tool
1. Find tool in `src/mcp/tools/[name].tool.ts`
2. Make changes
3. Build and test

### I want to add configuration
1. Edit `src/mcp/config/environment.ts`
2. Add getters/parsers for new config values
3. Use in services/tools as needed

### I want to add a new service
1. Create `src/mcp/services/my-service.service.ts`
2. Export service class
3. Instantiate in `src/mcp/server.ts`
4. Inject into tools as needed

### I want to understand the flow
1. Read `docs/architecture-diagram.md` for visual flow
2. Read `docs/code-organization.md` for details
3. Follow a request through the code starting at `server.ts`

## Common Patterns

### Tool Implementation Pattern
```typescript
import { z } from 'zod';
import { ConnectionService } from '../services/connection.service.js';

export function registerMyTool(server: any, connectionService: ConnectionService) {
    server.registerTool(
        'tool_name',
        {
            title: 'Tool Title',
            description: 'Tool description',
            inputSchema: {
                param: z.string().describe('Parameter description')
            },
            outputSchema: {
                success: z.boolean(),
                error: z.string().optional()
            }
        },
        async ({ param }: { param: string }) => {
            try {
                const client = connectionService.ensureConnected();
                // ... implementation
                return {
                    content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
                    structuredContent: output
                };
            } catch (error) {
                // ... error handling
            }
        }
    );
}
```

### Service Pattern
```typescript
export class MyService {
    private state: any;

    constructor() {
        // Initialize
    }

    public async doSomething(): Promise<void> {
        // Implementation
    }

    public getSomething(): any {
        return this.state;
    }
}
```

## Build & Test Commands

```bash
# Build TypeScript
npm run build

# Start server
npm start

# Test (if tests are added in future)
npm test

# Clean build
rm -rf build/ && npm run build
```

## Debugging

### Server won't start
1. Check `npm run build` for TypeScript errors
2. Check `.env` file exists
3. Check ports are available (default: 3000)

### Tool not working
1. Find tool in `src/mcp/tools/[name].tool.ts`
2. Add console.log() for debugging
3. Rebuild: `npm run build`
4. Check server output when calling tool

### Connection issues
1. Check `src/mcp/services/connection.service.ts`
2. Check `src/mcp/plugwise-client.ts` for API calls
3. Verify hub credentials in `.env`

## Documentation

- `docs/code-organization.md` - Architecture details
- `docs/architecture-diagram.md` - Visual diagrams
- `docs/refactoring-summary.md` - What changed
- `docs/plugwise-mcp-server.md` - API documentation
- This file - Quick reference

## Key Principles

1. **Each file has one job** - Don't mix concerns
2. **Services manage state** - Tools call services
3. **Tools are thin** - Business logic goes in services
4. **Dependencies are injected** - Passed as parameters
5. **Follow existing patterns** - Consistency matters

## File Size Guidelines

- Main server.ts: ~100-200 lines (orchestration only)
- Services: 50-300 lines (one service = one file)
- Tools: 30-100 lines per tool (one tool = one file)
- Config: Small, focused functions

If a file gets too large, split it!
