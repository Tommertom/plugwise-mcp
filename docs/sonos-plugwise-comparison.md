# Sonos vs Plugwise: Detailed Feature Comparison

**Comprehensive comparison of architectural patterns and implementation approaches**

## Repository Overview

| Aspect | Sonos-ts-mcp | Plugwise MCP (Current) | Plugwise MCP (Target) |
|--------|--------------|------------------------|----------------------|
| **Purpose** | Sonos audio system control | Plugwise smart home control | Plugwise smart home control |
| **Protocol** | UPnP/SOAP | HTTP/XML REST API | HTTP/XML REST API |
| **Discovery** | SSDP multicast | Network scanning | Network scanning |
| **Language** | TypeScript | TypeScript | TypeScript |
| **MCP SDK** | @modelcontextprotocol/sdk | @modelcontextprotocol/sdk | @modelcontextprotocol/sdk |
| **Repository** | [sonos-ts-mcp](https://github.com/Tommertom/sonos-ts-mcp) | [plugwise-mcp](https://github.com/Tommertom/plugwise-mcp) | [plugwise-mcp](https://github.com/Tommertom/plugwise-mcp) |

## Folder Structure

| Location | Sonos | Plugwise (Current) | Plugwise (Target) | Migration |
|----------|-------|-------------------|-------------------|-----------|
| **Entry Point** | `src/index.ts` | `src/index.ts` | `src/index.ts` | ✅ No change |
| **MCP Server** | `src/mcp/server.ts` | `src/mcp/server.ts` | `src/mcp/server.ts` | ✅ No change |
| **Client** | `src/soap/`, `src/discovery/` | `src/mcp/plugwise-client.ts` | `src/client/` | 📦 Move |
| **Services** | `src/services/` | `src/mcp/services/` | `src/services/` | 📦 Move |
| **Types** | `src/types/` | `src/mcp/plugwise-types.ts` | `src/types/` | 📦 Move |
| **Config** | None explicit | `src/mcp/config/` | `src/config/` | 📦 Move |
| **Tools** | Inline in server.ts | `src/mcp/tools/` | `src/mcp/tools/` | ✅ Keep |
| **Resources** | None | `src/mcp/resources/` | `src/mcp/resources/` | ✅ Keep |
| **Prompts** | None | `src/mcp/prompts/` | `src/mcp/prompts/` | ✅ Keep |
| **Tests** | `tests/` | Empty | `tests/` | ➕ Create |
| **Scripts** | `scripts/` | `scripts/` | `scripts/` | ✅ No change |
| **Docs** | `docs/` | `docs/` | `docs/` | ✅ No change |
| **Build Output** | `dist/` | `build/` | `dist/` | 🔄 Rename |

## Architecture Layers

| Layer | Sonos | Plugwise (Current) | Plugwise (Target) |
|-------|-------|-------------------|-------------------|
| **Entry** | index.ts → server | index.ts → server | index.ts → server |
| **MCP Layer** | server.ts (tools inline) | server.ts + tools/ + resources/ + prompts/ | server.ts + tools/ + resources/ + prompts/ |
| **Business Logic** | services/ (7 services) | mcp/services/ (2 services) | services/ (2 services) |
| **Transport** | soap/ + discovery/ | mcp/plugwise-client.ts | client/plugwise-client.ts |
| **Domain Models** | didl/ + types/ | mcp/plugwise-types.ts | types/plugwise-types.ts |
| **Events** | events/ | None | None (future) |

## Service Comparison

### Sonos Services

| Service | Purpose | Lines of Code |
|---------|---------|---------------|
| `base-service.ts` | Base class for all services | ~50 |
| `av-transport.ts` | Playback, queue, sleep timer | ~400 |
| `rendering-control.ts` | Volume, EQ, audio enhancements | ~300 |
| `zone-topology.ts` | Groups, party mode | ~200 |
| `content-directory.ts` | Music library browsing | ~300 |
| `alarm-clock.ts` | Alarm management | ~150 |
| `snapshot.ts` | State snapshot/restore | ~100 |

### Plugwise Services

| Service | Purpose | Lines of Code |
|---------|---------|---------------|
| `connection.service.ts` | Connection management | ~150 |
| `hub-discovery.service.ts` | Network hub discovery | ~200 |

**Note:** Plugwise has fewer services because much logic is in the client layer.

## Tool Organization

### Sonos: Inline Tools

- **Location:** Defined inline in `server.ts`
- **Tool Definitions:** In `ListToolsRequestSchema` handler
- **Tool Handlers:** Private methods in `SonosMcpServer` class
- **Count:** ~40 tools
- **Pros:** All in one file, easy to see complete picture
- **Cons:** Very long file (~2000 lines), harder to navigate

### Plugwise: Separate Tool Files

- **Location:** `src/mcp/tools/` (separate files)
- **Tool Definitions:** Exported from each file
- **Tool Handlers:** Each file exports handler function
- **Count:** ~15 tools
- **Pros:** Better organization, easier to find and edit
- **Cons:** More files, need to manage imports

**Decision for Target:** Keep separate tool files (better for Plugwise use case).

## MCP Features

| Feature | Sonos | Plugwise (Current) | Plugwise (Target) |
|---------|-------|-------------------|-------------------|
| **Tools** | ✅ Yes (40+) | ✅ Yes (15+) | ✅ Yes (15+) |
| **Resources** | ❌ No | ✅ Yes (devices) | ✅ Yes (devices) |
| **Prompts** | ❌ No | ✅ Yes (setup guide) | ✅ Yes (setup guide) |
| **Sampling** | ❌ No | ❌ No | ❌ No |

## Transport Mechanisms

### Sonos Transport

```
UPnP/SOAP Protocol:
1. SSDP Discovery (UDP multicast)
2. Device Description (HTTP GET)
3. SOAP Actions (HTTP POST with XML)
4. Event Subscriptions (UPnP GENA)

Layers:
- ssdp-client.ts → Device discovery
- soap/client.ts → HTTP/SOAP transport
- soap/request-builder.ts → Build XML requests
- soap/response-parser.ts → Parse XML responses
```

### Plugwise Transport

```
HTTP REST API:
1. Network Scan (TCP SYN + HTTP probing)
2. Authentication (HTTP Basic Auth)
3. XML Endpoints (HTTP GET/PUT)
4. Polling (No events yet)

Layers:
- plugwise-client.ts → HTTP client + XML parsing
- hub-discovery.service.ts → Network scanning
```

## Testing Infrastructure

### Sonos

```
tests/
├── *.test.ts           # Unit tests (vitest)
scripts/
├── test-phase1.ts      # Integration tests
├── test-phase2.ts
├── test-phase3.ts
├── test-phase4.ts
└── test-all-phases.ts

Test Runner: vitest
Coverage: Partial
Mocking: Yes (SOAP responses)
```

### Plugwise (Current)

```
tests/                   # Empty
scripts/
├── test-all.ts         # Integration test
├── test-autoload.js
├── test-network-scan.js
└── test-temperature-tools.ts

Test Runner: None
Coverage: None
Mocking: No
```

### Plugwise (Target)

```
tests/
├── client/
│   └── plugwise-client.test.ts
├── services/
│   ├── connection.service.test.ts
│   └── hub-discovery.service.test.ts
└── mcp/
    └── server.test.ts
scripts/                # Keep integration tests

Test Runner: vitest (new)
Coverage: TBD
Mocking: Yes (HTTP responses)
```

## Build Configuration

| Config | Sonos | Plugwise (Current) | Plugwise (Target) |
|--------|-------|-------------------|-------------------|
| **Output Dir** | `dist/` | `build/` | `dist/` |
| **Main Entry** | `dist/index.js` | `build/index.js` | `dist/index.js` |
| **Binary** | `dist/index.js` | `build/index.js` | `dist/index.js` |
| **TypeScript** | tsc | tsc | tsc |
| **Module Type** | ESM | ESM | ESM |
| **Target** | ES2022 | ES2022 | ES2022 |
| **Prepare Script** | `npm run build` | None | `npm run build` |

## Package.json Scripts

### Sonos Scripts

```json
{
  "prepare": "npm run build",
  "dev": "tsx src/index.ts",
  "build": "tsc",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:discovery": "tsx scripts/test-discovery.ts",
  "test:phase1": "tsx scripts/test-phase1.ts",
  "test:phase2": "tsx scripts/test-phase2.ts",
  "test:phase3": "tsx scripts/test-phase3.ts",
  "test:phase4": "tsx scripts/test-phase4.ts",
  "test:all-phases": "tsx scripts/test-all-phases.ts",
  "lint": "eslint src tests",
  "format": "prettier --write src tests",
  "typecheck": "tsc --noEmit"
}
```

### Plugwise Scripts (Current)

```json
{
  "build": "tsc && chmod 755 build/index.js",
  "dev": "tsx src/index.ts",
  "start": "node build/index.js",
  "test:all": "tsx scripts/test-all.ts"
}
```

### Plugwise Scripts (Target)

```json
{
  "prepare": "npm run build",
  "dev": "tsx src/index.ts",
  "build": "tsc && chmod 755 dist/index.js",
  "start": "node dist/index.js",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:all": "tsx scripts/test-all.ts",
  "typecheck": "tsc --noEmit",
  "lint": "eslint src tests",
  "format": "prettier --write src tests"
}
```

## Dependencies

### Common Dependencies

Both projects use:
- `@modelcontextprotocol/sdk`
- `xml2js` (XML parsing)
- `@types/xml2js`
- `@types/node`
- `tsx` (TypeScript execution)
- `typescript`

### Sonos Specific

- `vitest` - Testing framework
- `@vitest/coverage-v8` - Coverage reporting
- `eslint` + `@typescript-eslint/*` - Linting
- `prettier` - Code formatting

### Plugwise Specific

- `axios` - HTTP client
- `dotenv` - Environment variables
- `zod` - Schema validation

### Recommended for Plugwise

- ➕ Add `vitest` - For testing
- ➕ Add `eslint` + plugins - For linting
- ➕ Add `prettier` - For formatting

## Code Quality

| Metric | Sonos | Plugwise (Current) | Plugwise (Target) |
|--------|-------|-------------------|-------------------|
| **Linting** | ✅ ESLint | ❌ None | ✅ ESLint (add) |
| **Formatting** | ✅ Prettier | ❌ None | ✅ Prettier (add) |
| **Type Checking** | ✅ Strict | ✅ Strict | ✅ Strict |
| **Tests** | ✅ Vitest | ❌ None | ✅ Vitest (add) |
| **Coverage** | ✅ Yes | ❌ No | ✅ Yes (add) |

## Documentation

### Sonos Documentation

```
docs/
├── installation-guide.md
├── api-testing-guide.md
├── implementation-guide.md
├── technical-architecture.md
├── PHASE-1-COMPLETE.md
├── PHASE-2-COMPLETE.md
├── PHASE-3-COMPLETE.md
└── PHASE-4-COMPLETE.md

Focus: Implementation phases, API testing
```

### Plugwise Documentation

```
docs/
├── architecture-diagram.md
├── autoload-hubs.md
├── code-organization.md
├── network-scanning.md
├── temperature-tools-implementation.md
├── quick-reference.md
└── (many more implementation guides)

Focus: Feature implementation, quick references
```

### Plugwise (Target) - Add Migration Docs

```
docs/
├── (existing docs...)
├── STRUCTURE-MIGRATION-PLAN.md       # NEW
├── structure-comparison-diagram.md    # NEW
├── migration-checklist.md             # NEW
└── migration-summary.md               # NEW
```

## Key Takeaways

### What to Adopt from Sonos

✅ **Yes - Adopt These:**
1. Folder structure (services/, types/, client/ at root)
2. Build output naming (`dist/` instead of `build/`)
3. Testing infrastructure (vitest)
4. Package.json prepare script
5. Code quality tools (eslint, prettier)
6. Comprehensive npm scripts

### What to Keep from Plugwise

✅ **Yes - Keep These:**
1. Separate tool files (better organization)
2. MCP resources and prompts (Plugwise-specific)
3. Extensive documentation
4. Integration test scripts
5. Environment-based configuration

### What's Different by Design

🔄 **Acceptable Differences:**
1. **Sonos**: Many services (7) vs **Plugwise**: Few services (2)
   - Reason: Different API complexity
2. **Sonos**: Complex domain models (DIDL) vs **Plugwise**: Simple types
   - Reason: Different data models
3. **Sonos**: Event subscriptions vs **Plugwise**: Polling
   - Reason: Different protocols (UPnP GENA vs HTTP)

## Migration Priority Matrix

| Change | Priority | Impact | Effort | Status |
|--------|----------|--------|--------|--------|
| Move services/ to root | High | High | Medium | 📋 Planned |
| Move types/ to root | High | High | Low | 📋 Planned |
| Move client/ to root | High | High | Low | 📋 Planned |
| Move config/ to root | Medium | Medium | Low | 📋 Planned |
| Rename build → dist | Medium | Low | Low | 📋 Planned |
| Add vitest | Medium | Medium | Medium | 📋 Planned |
| Add eslint/prettier | Low | Low | Low | 🔮 Future |
| Create unit tests | Medium | High | High | 🔮 Future |

## Lessons Learned

### From Sonos Architecture

1. **Separation of Concerns**: Keep MCP protocol separate from domain logic
2. **Testing**: Invest in testing infrastructure early
3. **Documentation**: Phase-based implementation tracking
4. **NPM Standards**: Follow npm conventions (dist/, prepare script)
5. **Code Quality**: Use linting and formatting from the start

### Applied to Plugwise

1. **Restructure**: Separate MCP from domain logic
2. **Keep Strengths**: Maintain separate tool files and MCP features
3. **Add Testing**: Implement vitest for quality assurance
4. **Improve Build**: Use standard npm conventions
5. **Maintain Docs**: Keep comprehensive documentation approach

## Conclusion

The Sonos structure provides an excellent reference for:
- Clean separation of concerns
- Testing infrastructure
- NPM package standards
- Build and deployment practices

Plugwise should adopt the core structural improvements while maintaining its unique strengths in:
- Tool organization
- MCP feature coverage (resources, prompts)
- Comprehensive documentation
- Integration testing approach

The migration balances adopting best practices from Sonos with preserving Plugwise's proven patterns.
