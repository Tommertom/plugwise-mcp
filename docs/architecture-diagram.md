# Architecture Diagram

## Component Relationships

```
┌─────────────────────────────────────────────────────────────────────┐
│                          server.ts (Main Entry)                      │
│  • Creates service instances                                         │
│  • Registers all tools, resources, prompts                          │
│  • Sets up Express HTTP server                                       │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 │ creates & injects
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌────────┐  ┌─────────────────────────┐
│ Config │  │       Services          │
│        │  │                         │
│ • env  │  │ • HubDiscoveryService   │
│        │  │   - Hub registry        │
│        │  │   - Network scanning    │
│        │  │   - .env loading        │
│        │  │                         │
│        │  │ • ConnectionService     │
│        │  │   - Active connection   │
│        │  │   - State management    │
└────────┘  └─────────┬───────────────┘
                      │
                      │ injected into
                      │
            ┌─────────┼─────────┐
            │         │         │
            ▼         ▼         ▼
      ┌─────────┐ ┌───────────┐ ┌─────────┐
      │  Tools  │ │ Resources │ │ Prompts │
      │         │ │           │ │         │
      │ • scan  │ │ • devices │ │ • setup │
      │ • conn  │ │           │ │   guide │
      │ • dev   │ │           │ │         │
      │ • temp  │ │           │ │         │
      │ • switch│ │           │ │         │
      │ • gw    │ │           │ │         │
      └────┬────┘ └─────┬─────┘ └────┬────┘
           │            │            │
           └────────────┼────────────┘
                        │
                        │ registered with
                        │
                        ▼
              ┌──────────────────┐
              │   MCP Server     │
              │  (SDK Instance)  │
              └──────────────────┘
                        │
                        │ served via
                        │
                        ▼
              ┌──────────────────┐
              │  Express Server  │
              │                  │
              │  POST /mcp       │
              │  GET  /health    │
              └──────────────────┘
```

## Data Flow Example: Set Temperature

```
1. MCP Client
   │
   │ HTTP POST /mcp
   │ { tool: "set_temperature", location_id: "abc", setpoint: 21 }
   │
   ▼
2. Express Server (server.ts)
   │
   │ routes to MCP handler
   │
   ▼
3. MCP Server (SDK)
   │
   │ dispatches to tool
   │
   ▼
4. Temperature Tool (temperature.tool.ts)
   │
   │ calls connectionService.ensureConnected()
   │
   ▼
5. Connection Service
   │
   │ returns PlugwiseClient instance
   │
   ▼
6. Temperature Tool
   │
   │ calls client.setTemperature(params)
   │
   ▼
7. Plugwise Client (plugwise-client.ts)
   │
   │ HTTP request to Plugwise Gateway
   │
   ▼
8. Plugwise Gateway (hardware)
   │
   │ executes command
   │
   ▼
9. Response flows back through stack
   │
   ▼
10. MCP Client receives result
```

## Module Dependencies

```
server.ts
  ├─ config/environment.ts
  ├─ services/hub-discovery.service.ts
  │    ├─ config/environment.ts
  │    └─ plugwise-client.ts
  ├─ services/connection.service.ts
  │    └─ plugwise-client.ts
  ├─ tools/index.ts
  │    ├─ tools/scan-network.tool.ts
  │    │    └─ services/hub-discovery.service.ts
  │    ├─ tools/connection.tool.ts
  │    │    ├─ services/connection.service.ts
  │    │    └─ services/hub-discovery.service.ts
  │    ├─ tools/device.tool.ts
  │    │    └─ services/connection.service.ts
  │    ├─ tools/temperature.tool.ts
  │    │    └─ services/connection.service.ts
  │    ├─ tools/switch.tool.ts
  │    │    └─ services/connection.service.ts
  │    └─ tools/gateway.tool.ts
  │         └─ services/connection.service.ts
  ├─ resources/index.ts
  │    └─ resources/devices.resource.ts
  │         └─ services/connection.service.ts
  └─ prompts/index.ts
       └─ prompts/setup-guide.prompt.ts

plugwise-client.ts
  └─ plugwise-types.ts
```

## Service Lifecycle

```
Application Start
      │
      ▼
┌─────────────────────────┐
│ Load .env file          │
│ (dotenv)                │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ Create Services         │
│ • HubDiscoveryService   │
│ • ConnectionService     │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ Load Hubs from .env     │
│ discoveryService        │
│  .loadFromEnvironment() │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ Create MCP Server       │
│ instance                │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ Register Tools          │
│ registerAllTools()      │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ Register Resources      │
│ registerAllResources()  │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ Register Prompts        │
│ registerAllPrompts()    │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ Start Express Server    │
│ Listen on host:port     │
└─────────────────────────┘
      │
      ▼
Server Ready
```

## File Size Comparison

### Before Refactoring:
```
server.ts: ~900 lines (everything in one file)
```

### After Refactoring:
```
server.ts:                      ~130 lines  (main entry point)
config/environment.ts:          ~70 lines   (configuration)
services/hub-discovery.service: ~250 lines  (discovery logic)
services/connection.service:    ~50 lines   (connection mgmt)
tools/scan-network.tool:        ~70 lines   (one tool)
tools/connection.tool:          ~100 lines  (one tool)
tools/device.tool:              ~50 lines   (one tool)
tools/temperature.tool:         ~120 lines  (two tools)
tools/switch.tool:              ~60 lines   (one tool)
tools/gateway.tool:             ~180 lines  (five tools)
tools/index.ts:                 ~20 lines   (aggregator)
resources/devices.resource:     ~40 lines   (one resource)
resources/index.ts:             ~15 lines   (aggregator)
prompts/setup-guide.prompt:     ~35 lines   (one prompt)
prompts/index.ts:               ~15 lines   (aggregator)
─────────────────────────────────────────
Total: ~1,175 lines in 15 focused files
```

**Benefits:**
- Each file is small and focused (15-250 lines)
- Easy to locate specific functionality
- Parallel development possible
- Better code review granularity
- Improved testability

## Extension Points

The new architecture makes it easy to extend:

### 1. Add New Tools
Create file in `tools/`, register in `tools/index.ts`

### 2. Add New Services
Create file in `services/`, instantiate in `server.ts`

### 3. Add New Resources
Create file in `resources/`, register in `resources/index.ts`

### 4. Add New Prompts
Create file in `prompts/`, register in `prompts/index.ts`

### 5. Add Middleware
Modify Express app in `server.ts`

### 6. Add Configuration
Extend `config/environment.ts`

Each extension is isolated and doesn't affect other components.
