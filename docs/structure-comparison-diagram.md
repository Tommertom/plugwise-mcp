# Folder Structure Comparison: Sonos vs Plugwise MCP

## Sonos-ts-mcp Structure (Reference)

```
sonos-ts-mcp/
│
├── src/
│   ├── index.ts                          # Entry point (#!/usr/bin/env node)
│   │
│   ├── mcp/                              # ⭐ MCP Protocol Layer (Minimal)
│   │   └── server.ts                     # MCP Server implementation only
│   │
│   ├── discovery/                        # 🌐 Device Discovery Layer
│   │   ├── ssdp-client.ts               # SSDP multicast discovery
│   │   └── device-registry.ts           # Device registration & lookup
│   │
│   ├── soap/                             # 🔌 Transport/Protocol Layer
│   │   ├── client.ts                    # SOAP HTTP client
│   │   ├── request-builder.ts           # Build SOAP XML requests
│   │   └── response-parser.ts           # Parse SOAP XML responses
│   │
│   ├── services/                         # 📦 Business Logic Layer
│   │   ├── base-service.ts              # Base service class
│   │   ├── av-transport.ts              # Playback, queue, sleep timer
│   │   ├── rendering-control.ts         # Volume, EQ, audio enhancements
│   │   ├── zone-topology.ts             # Groups, party mode
│   │   ├── content-directory.ts         # Music library browsing
│   │   ├── alarm-clock.ts               # Alarm management
│   │   └── snapshot.ts                  # State snapshot/restore
│   │
│   ├── didl/                             # 📝 Domain Models (DIDL-Lite)
│   │   ├── didl-object.ts               # Base DIDL object
│   │   ├── didl-resource.ts             # Resource representation
│   │   ├── didl-item.ts                 # Item (track, etc.)
│   │   ├── didl-container.ts            # Container (album, playlist)
│   │   ├── didl-serializer.ts           # Serialize to XML
│   │   ├── didl-parser.ts               # Parse from XML
│   │   └── index.ts
│   │
│   ├── events/                           # 🔔 Event System
│   │   └── subscription-manager.ts       # UPnP GENA event subscriptions
│   │
│   └── types/                            # 📋 Type Definitions
│       ├── sonos.ts                     # Sonos-specific types
│       └── queue.ts                     # Queue types
│
├── tests/                                # ✅ Unit Tests
│   ├── alarm-clock.test.ts
│   ├── content-directory.test.ts
│   ├── device-registry.test.ts
│   ├── didl.test.ts
│   ├── rendering-control-phase3.test.ts
│   ├── request-builder.test.ts
│   ├── snapshot.test.ts
│   └── xml-parser.test.ts
│
├── scripts/                              # 🧪 Test/Demo Scripts
│   ├── start-mcp-stdio.ts               # Start MCP in stdio mode
│   ├── start-mcp-sse.ts                 # Start MCP in SSE mode
│   ├── test-discovery.ts                # Test device discovery
│   ├── test-phase1.ts                   # Queue, DIDL, Playback
│   ├── test-phase2.ts                   # Groups & Library
│   ├── test-phase3.ts                   # Audio, Alarms, Snapshots
│   ├── test-phase4.ts                   # Event Subscriptions
│   ├── test-all-phases.ts               # Run all phase tests
│   └── test-utils.ts                    # Shared test utilities
│
├── docs/                                 # 📚 Documentation
│   ├── installation-guide.md
│   ├── api-testing-guide.md
│   ├── implementation-guide.md
│   ├── technical-architecture.md
│   ├── PHASE-1-COMPLETE.md
│   ├── PHASE-2-COMPLETE.md
│   ├── PHASE-3-COMPLETE.md
│   └── PHASE-4-COMPLETE.md
│
├── dist/                                 # 📦 Build Output (gitignored)
│
├── package.json
├── tsconfig.json
├── vitest.config.ts                      # Vitest test configuration
├── eslint.config.js                      # ESLint configuration
├── .prettierrc                           # Prettier configuration
├── .gitignore
├── README.md
├── CHANGELOG.md
└── LICENSE
```

---

## Plugwise MCP Structure (Current)

```
plugwise/
│
├── src/
│   ├── index.ts                          # Entry point (#!/usr/bin/env node)
│   │
│   └── mcp/                              # ❌ Everything nested under mcp/
│       ├── server.ts                     # MCP Server
│       ├── plugwise-client.ts            # HTTP/XML client (should be in client/)
│       ├── plugwise-types.ts             # Type definitions (should be in types/)
│       │
│       ├── config/                       # Configuration (should be at root)
│       │   └── environment.ts
│       │
│       ├── services/                     # Business logic (should be at root)
│       │   ├── connection.service.ts
│       │   └── hub-discovery.service.ts
│       │
│       ├── prompts/                      # ✅ MCP-specific (OK here)
│       │   ├── index.ts
│       │   └── setup-guide.prompt.ts
│       │
│       ├── resources/                    # ✅ MCP-specific (OK here)
│       │   ├── devices.resource.ts
│       │   └── index.ts
│       │
│       └── tools/                        # ✅ MCP-specific (OK here)
│           ├── connection.tool.ts
│           ├── device.tool.ts
│           ├── gateway.tool.ts
│           ├── scan-network.tool.ts
│           ├── switch.tool.ts
│           └── temperature.tool.ts
│
├── tests/                                # ⚠️ Empty (needs tests)
│
├── scripts/                              # 🧪 Test/Demo Scripts
│   ├── debug-device-data.ts
│   ├── debug-xml-parsing.ts
│   ├── list-all-devices.ts
│   ├── test-all.ts
│   ├── test-autoload.js
│   ├── test-mcp-server.js
│   ├── test-network-scan.js
│   └── test-temperature-tools.ts
│
├── docs/                                 # 📚 Documentation (extensive)
│   ├── architecture-diagram.md
│   ├── autoload-hubs.md
│   ├── code-organization.md
│   ├── network-scanning.md
│   ├── plugwise-mcp-server.md
│   ├── quick-reference.md
│   └── (many more...)
│
├── build/                                # 📦 Build Output (should be dist/)
│
├── package.json
├── tsconfig.json
├── .gitignore
├── README.md
├── CHANGELOG.md
└── LICENSE
```

---

## Plugwise MCP Structure (Proposed Target)

```
plugwise/
│
├── src/
│   ├── index.ts                          # Entry point (#!/usr/bin/env node)
│   │
│   ├── mcp/                              # ⭐ MCP Protocol Layer (Clean)
│   │   ├── server.ts                     # MCP Server implementation
│   │   │
│   │   ├── prompts/                      # MCP prompts (user-facing)
│   │   │   ├── index.ts
│   │   │   └── setup-guide.prompt.ts
│   │   │
│   │   ├── resources/                    # MCP resources (data exposure)
│   │   │   ├── devices.resource.ts
│   │   │   └── index.ts
│   │   │
│   │   └── tools/                        # MCP tools (actions)
│   │       ├── connection.tool.ts
│   │       ├── device.tool.ts
│   │       ├── gateway.tool.ts
│   │       ├── scan-network.tool.ts
│   │       ├── switch.tool.ts
│   │       └── temperature.tool.ts
│   │
│   ├── client/                           # 🔌 HTTP/API Client Layer (NEW)
│   │   ├── plugwise-client.ts           # HTTP client for Plugwise API
│   │   ├── xml-parser.ts                # XML parsing utilities (optional)
│   │   └── index.ts
│   │
│   ├── services/                         # 📦 Business Logic Layer (MOVED)
│   │   ├── connection.service.ts         # Connection management
│   │   ├── hub-discovery.service.ts      # Hub discovery logic
│   │   └── index.ts
│   │
│   ├── types/                            # 📋 Type Definitions (MOVED)
│   │   ├── plugwise-types.ts            # Plugwise domain types
│   │   └── index.ts                     # Re-exports
│   │
│   └── config/                           # ⚙️ Configuration (MOVED)
│       ├── environment.ts                # Environment variables
│       └── index.ts
│
├── tests/                                # ✅ Unit Tests (TO BE CREATED)
│   ├── client/
│   │   └── plugwise-client.test.ts
│   ├── services/
│   │   ├── connection.service.test.ts
│   │   └── hub-discovery.service.test.ts
│   └── mcp/
│       └── server.test.ts
│
├── scripts/                              # 🧪 Test/Demo Scripts (Keep)
│   ├── debug-device-data.ts
│   ├── debug-xml-parsing.ts
│   ├── list-all-devices.ts
│   ├── test-all.ts
│   ├── test-autoload.ts                 # Converted to .ts
│   ├── test-mcp-server.ts               # Converted to .ts
│   ├── test-network-scan.ts             # Converted to .ts
│   └── test-temperature-tools.ts
│
├── docs/                                 # 📚 Documentation (Update)
│   ├── architecture-diagram.md           # UPDATE with new structure
│   ├── STRUCTURE-MIGRATION-PLAN.md       # NEW migration guide
│   ├── code-organization.md              # UPDATE
│   └── (rest of existing docs...)
│
├── dist/                                 # 📦 Build Output (RENAMED from build/)
│
├── package.json                          # Updated: main: "dist/index.js"
├── tsconfig.json                         # Updated: outDir: "./dist"
├── vitest.config.ts                      # NEW test configuration
├── .gitignore                           # Updated: dist/ instead of build/
├── README.md
├── CHANGELOG.md
└── LICENSE
```

---

## Key Differences Highlighted

| Layer | Sonos | Plugwise (Current) | Plugwise (Target) |
|-------|-------|-------------------|-------------------|
| **MCP Layer** | `mcp/server.ts` only | Everything in `mcp/` | Server + tools/prompts/resources |
| **Client** | `soap/client.ts`, `discovery/` | `mcp/plugwise-client.ts` | `client/plugwise-client.ts` |
| **Services** | `services/` | `mcp/services/` | `services/` |
| **Types** | `types/` | `mcp/plugwise-types.ts` | `types/` |
| **Config** | None explicit | `mcp/config/` | `config/` |
| **Tests** | `tests/` with vitest | Empty | `tests/` with vitest |
| **Output** | `dist/` | `build/` | `dist/` |

---

## Visual Layer Architecture

### Sonos Architecture (Reference)

```
┌─────────────────────────────────────────────────┐
│              Entry Point (index.ts)              │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│           MCP Layer (mcp/server.ts)              │
│  ┌─────────────────────────────────────────┐    │
│  │ Tool Handlers (inline in server.ts)      │    │
│  └─────────────────────────────────────────┘    │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│         Business Logic (services/)               │
│  ┌─────────────────────────────────────────┐    │
│  │ AVTransport, RenderingControl, etc.     │    │
│  └─────────────────────────────────────────┘    │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│      Transport Layer (soap/, discovery/)        │
│  ┌─────────────────────────────────────────┐    │
│  │ SOAP Client, SSDP Client, Registry      │    │
│  └─────────────────────────────────────────┘    │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│         Domain Models (didl/, types/)            │
└──────────────────────────────────────────────────┘
```

### Plugwise Target Architecture

```
┌─────────────────────────────────────────────────┐
│              Entry Point (index.ts)              │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│           MCP Layer (mcp/server.ts)              │
│  ┌─────────────────────────────────────────┐    │
│  │ Tools, Resources, Prompts (mcp/*)        │    │
│  └─────────────────────────────────────────┘    │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│         Business Logic (services/)               │
│  ┌─────────────────────────────────────────┐    │
│  │ Connection, HubDiscovery                 │    │
│  └─────────────────────────────────────────┘    │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│         Client Layer (client/)                   │
│  ┌─────────────────────────────────────────┐    │
│  │ PlugwiseClient (HTTP + XML parsing)      │    │
│  └─────────────────────────────────────────┘    │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│  Types & Config (types/, config/)                │
└──────────────────────────────────────────────────┘
```

---

## Migration Benefits Summary

### ✅ Pros
1. **Clear separation of concerns** - MCP vs domain logic
2. **Better testability** - Can test services without MCP
3. **Easier navigation** - Flatter structure
4. **Standard conventions** - Follows npm/TypeScript standards
5. **Reusability** - Domain code can be used outside MCP
6. **Maintainability** - Clear boundaries between layers

### ⚠️ Considerations
1. **Import path changes** - All imports need updating
2. **Build config updates** - Path changes in configs
3. **Time investment** - 5-7 hours estimated
4. **Testing required** - Thorough testing after migration

### 🎯 Decision Points
1. **Keep separate tool files** - Unlike Sonos (better for many tools)
2. **Keep prompts/resources in mcp/** - They're MCP-specific
3. **Use dist/ not build/** - NPM convention
4. **Add vitest** - Proper testing infrastructure
