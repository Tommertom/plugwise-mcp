# Code Organization and Architecture

## Overview

The Plugwise MCP Server has been reorganized into a modular, maintainable architecture following best practices for TypeScript/Node.js applications. This document describes the new structure and how to work with it.

## Directory Structure

```
src/mcp/
├── server.ts                          # Main entry point (minimal, clean)
├── config/
│   └── environment.ts                 # Environment variable management
├── services/
│   ├── hub-discovery.service.ts       # Hub discovery and registry
│   └── connection.service.ts          # Active connection management
├── tools/
│   ├── index.ts                       # Tool registration aggregator
│   ├── scan-network.tool.ts           # Network scanning tool
│   ├── connection.tool.ts             # Connection tool
│   ├── device.tool.ts                 # Device information tools
│   ├── temperature.tool.ts            # Temperature control tools
│   ├── switch.tool.ts                 # Switch control tools
│   └── gateway.tool.ts                # Gateway management tools
├── resources/
│   ├── index.ts                       # Resource registration aggregator
│   └── devices.resource.ts            # Device data resource
├── prompts/
│   ├── index.ts                       # Prompt registration aggregator
│   └── setup-guide.prompt.ts          # Setup guide prompt
├── plugwise-client.ts                 # HTTP client for Plugwise API
└── plugwise-types.ts                  # TypeScript type definitions
```

## Architecture Principles

### 1. Separation of Concerns
Each module has a single, well-defined responsibility:
- **Config**: Environment and configuration management
- **Services**: Business logic and state management
- **Tools**: MCP tool implementations
- **Resources**: MCP resource implementations
- **Prompts**: MCP prompt implementations

### 2. Dependency Injection
Services are injected into tools/resources/prompts, making the code:
- Testable (easy to mock dependencies)
- Flexible (easy to swap implementations)
- Maintainable (clear dependencies)

### 3. Single Responsibility
Each file focuses on one specific feature or tool, making it:
- Easy to find code
- Easy to modify without side effects
- Easy to review and understand

## Key Components

### Server (server.ts)
The main entry point is now minimal and focused on:
- Creating service instances
- Registering tools, resources, and prompts
- Setting up the Express HTTP server
- Health check endpoint

### Configuration (config/environment.ts)
Handles all environment variable loading and parsing:
- Server configuration (host, port)
- Hub credentials (HUB1-HUB10, HUB1IP-HUB10IP)
- Provides typed interfaces for configuration

### Services

#### HubDiscoveryService
Manages the registry of discovered Plugwise hubs:
- Loads hubs from environment variables on startup
- Performs network scanning for new hubs
- Stores discovered hub information
- Provides hub lookup by IP address

#### ConnectionService
Manages the active Plugwise client connection:
- Maintains single active connection
- Provides connection state checking
- Ensures tools have a valid connection

### Tools
Each tool is in its own file for clarity:
- **scan-network.tool.ts**: Network scanning for hubs
- **connection.tool.ts**: Gateway connection
- **device.tool.ts**: Device information retrieval
- **temperature.tool.ts**: Temperature and preset control
- **switch.tool.ts**: Switch/relay control
- **gateway.tool.ts**: Gateway modes and operations

The `tools/index.ts` file aggregates all tools for easy registration.

### Resources
Resources provide read-only access to data:
- **devices.resource.ts**: Current device states

The `resources/index.ts` file aggregates all resources.

### Prompts
Prompts provide guided interactions:
- **setup-guide.prompt.ts**: Setup instructions

The `prompts/index.ts` file aggregates all prompts.

## Adding New Features

### Adding a New Tool

1. Create a new file in `src/mcp/tools/`:
```typescript
// src/mcp/tools/my-new-tool.tool.ts
import { z } from 'zod';
import { ConnectionService } from '../services/connection.service.js';

export function registerMyNewTool(server: any, connectionService: ConnectionService) {
    server.registerTool(
        'my_new_tool',
        {
            title: 'My New Tool',
            description: 'Description of what it does',
            inputSchema: {
                param1: z.string().describe('Parameter description')
            },
            outputSchema: {
                success: z.boolean(),
                result: z.string().optional(),
                error: z.string().optional()
            }
        },
        async ({ param1 }: { param1: string }) => {
            try {
                const client = connectionService.ensureConnected();
                // Your implementation here
                
                const output = { success: true, result: 'done' };
                return {
                    content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
                    structuredContent: output
                };
            } catch (error) {
                const output = { success: false, error: (error as Error).message };
                return {
                    content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
                    structuredContent: output
                };
            }
        }
    );
}
```

2. Add the registration to `src/mcp/tools/index.ts`:
```typescript
import { registerMyNewTool } from './my-new-tool.tool.js';

export function registerAllTools(/* ... */) {
    // ... existing registrations
    registerMyNewTool(server, connectionService);
}
```

### Adding a New Service

1. Create a new file in `src/mcp/services/`:
```typescript
// src/mcp/services/my-service.service.ts
export class MyService {
    // Service implementation
}
```

2. Instantiate in `server.ts`:
```typescript
const myService = new MyService();
```

3. Pass to tools/resources as needed:
```typescript
registerAllTools(server, connectionService, discoveryService, myService);
```

### Adding a New Resource

1. Create a new file in `src/mcp/resources/`
2. Add registration to `src/mcp/resources/index.ts`
3. Follow the same pattern as `devices.resource.ts`

### Adding a New Prompt

1. Create a new file in `src/mcp/prompts/`
2. Add registration to `src/mcp/prompts/index.ts`
3. Follow the same pattern as `setup-guide.prompt.ts`

## Benefits of This Structure

1. **Maintainability**: Each file is small and focused
2. **Testability**: Easy to unit test individual components
3. **Scalability**: Simple to add new tools/resources/prompts
4. **Readability**: Clear organization makes code easy to understand
5. **Collaboration**: Multiple developers can work on different tools without conflicts
6. **Debugging**: Easier to locate and fix issues in specific components

## Migration Notes

The refactored code maintains 100% backward compatibility with the original implementation:
- All tools work identically
- Same API endpoints
- Same functionality
- No breaking changes

The only difference is the internal code organization.

## Development Workflow

1. **Make changes** to relevant file(s)
2. **Build**: `npm run build`
3. **Test**: `npm start` or test with your MCP client
4. **Verify**: Check health endpoint and test tools

## Testing

To test the refactored server:

```bash
# Build
npm run build

# Start server
npm start

# In another terminal, test health endpoint
curl http://localhost:3000/health

# Test MCP tools using your MCP client
```

## Security Notes

All security practices from the original implementation are preserved:
- Basic authentication for Plugwise API
- Environment variable-based credentials
- No hardcoded secrets
- Input validation via Zod schemas

## Future Enhancements

The new structure makes it easy to add:
- Additional hub discovery methods
- Caching layer for device states
- WebSocket support for real-time updates
- Unit and integration tests
- API versioning
- Rate limiting per hub
- Connection pooling for multiple hubs

## Questions?

For questions or issues with the new structure, refer to:
- Individual file comments for implementation details
- This document for architectural overview
- Original documentation in `/docs` for API details
