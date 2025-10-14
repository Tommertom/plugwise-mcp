# Plugwise MCP Structure Migration Plan

**Date:** 14 October 2025  
**Reference:** sonos-ts-mcp repository structure  
**Goal:** Reorganize Plugwise MCP codebase to follow cleaner separation of concerns

## Executive Summary

After analyzing the [sonos-ts-mcp](https://github.com/Tommertom/sonos-ts-mcp) repository structure, we've identified a cleaner architectural pattern that better separates MCP-specific code from domain logic. This migration will improve maintainability, testability, and clarity.

## Current Structure

```
plugwise/
├── src/
│   ├── index.ts
│   └── mcp/                          # Everything is nested here
│       ├── server.ts
│       ├── plugwise-client.ts
│       ├── plugwise-types.ts
│       ├── config/
│       │   └── environment.ts
│       ├── prompts/
│       │   ├── index.ts
│       │   └── setup-guide.prompt.ts
│       ├── resources/
│       │   ├── devices.resource.ts
│       │   └── index.ts
│       ├── services/
│       │   ├── connection.service.ts
│       │   └── hub-discovery.service.ts
│       └── tools/
│           ├── connection.tool.ts
│           ├── device.tool.ts
│           ├── gateway.tool.ts
│           ├── scan-network.tool.ts
│           ├── switch.tool.ts
│           └── temperature.tool.ts
├── scripts/                          # Test scripts
├── tests/                            # Empty
├── docs/
└── build/                            # Compiled output
```

## Target Structure (Sonos-Inspired)

```
plugwise/
├── src/
│   ├── index.ts                      # Entry point
│   ├── client/                       # NEW: HTTP/API client layer
│   │   ├── plugwise-client.ts
│   │   └── xml-parser.ts
│   ├── services/                     # MOVED: Business logic services
│   │   ├── connection.service.ts
│   │   └── hub-discovery.service.ts
│   ├── types/                        # MOVED: Type definitions
│   │   ├── plugwise-types.ts
│   │   └── index.ts
│   ├── config/                       # MOVED: Configuration
│   │   └── environment.ts
│   └── mcp/                          # MCP-specific only
│       ├── server.ts                 # Main server
│       ├── prompts/                  # MCP prompts
│       │   ├── index.ts
│       │   └── setup-guide.prompt.ts
│       ├── resources/                # MCP resources
│       │   ├── devices.resource.ts
│       │   └── index.ts
│       └── tools/                    # MCP tools
│           ├── connection.tool.ts
│           ├── device.tool.ts
│           ├── gateway.tool.ts
│           ├── scan-network.tool.ts
│           ├── switch.tool.ts
│           └── temperature.tool.ts
├── scripts/                          # Test/demo scripts
├── tests/                            # Unit tests (to be created)
│   ├── client.test.ts
│   ├── connection.service.test.ts
│   └── hub-discovery.service.test.ts
├── docs/
└── dist/                             # RENAMED: build -> dist
```

## Key Architectural Principles (from Sonos)

### 1. **Separation of Concerns**
- **Domain Logic** (`client/`, `services/`, `types/`): Core business logic independent of MCP
- **MCP Layer** (`mcp/`): MCP protocol-specific implementation
- **Infrastructure** (`config/`, `scripts/`, `tests/`): Supporting code

### 2. **MCP Folder Contains Only MCP-Specific Code**
The `mcp/` folder should only contain:
- `server.ts` - MCP Server implementation
- `prompts/` - MCP prompts (user-facing)
- `resources/` - MCP resources (data exposure)
- `tools/` - MCP tool definitions and handlers

### 3. **Domain Logic at Root Level**
Core functionality that could be reused in other contexts:
- Client/API layer
- Business services
- Type definitions
- Configuration

## Migration Steps

### Phase 1: Create New Structure ✅

1. **Create new folders**
   ```bash
   mkdir -p src/client
   mkdir -p src/services
   mkdir -p src/types
   mkdir -p src/config
   mkdir -p tests
   ```

2. **Rename build to dist** (optional, for npm convention)
   - Update `package.json`: `"main": "dist/index.js"`
   - Update `.gitignore`
   - Update tsconfig.json `outDir`

### Phase 2: Move Files 📦

1. **Move client code**
   ```bash
   mv src/mcp/plugwise-client.ts src/client/
   ```

2. **Move services**
   ```bash
   mv src/mcp/services/*.ts src/services/
   ```

3. **Move types**
   ```bash
   mv src/mcp/plugwise-types.ts src/types/
   # Create src/types/index.ts for exports
   ```

4. **Move config**
   ```bash
   mv src/mcp/config/*.ts src/config/
   ```

5. **Keep in mcp/**
   - `server.ts`
   - `prompts/`
   - `resources/`
   - `tools/`

### Phase 3: Update Imports 🔧

Update all import statements to reflect new structure:

**Before:**
```typescript
import { PlugwiseClient } from './plugwise-client.js';
import { HubDiscoveryService } from './services/hub-discovery.service.js';
import type { Device } from './plugwise-types.js';
```

**After:**
```typescript
import { PlugwiseClient } from '../client/plugwise-client.js';
import { HubDiscoveryService } from '../services/hub-discovery.service.js';
import type { Device } from '../types/plugwise-types.js';
```

**Files to update:**
- `src/mcp/server.ts`
- `src/mcp/tools/*.ts`
- `src/mcp/resources/*.ts`
- `src/services/*.ts`
- `src/client/*.ts`

### Phase 4: Update Build Configuration ⚙️

**package.json**
```json
{
  "main": "dist/index.js",
  "bin": {
    "plugwise-mcp-server": "./dist/index.js"
  },
  "files": [
    "dist/",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "tsc && chmod 755 dist/index.js",
    "dev": "tsx src/index.ts",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
```

**tsconfig.json**
```json
{
  "compilerOptions": {
    "outDir": "./dist",
    // ... rest of config
  }
}
```

**.gitignore**
```
dist/
build/
node_modules/
```

### Phase 5: Testing Infrastructure 🧪

1. **Install vitest** (like Sonos)
   ```bash
   npm install -D vitest @vitest/coverage-v8
   ```

2. **Create vitest.config.ts**
   ```typescript
   import { defineConfig } from 'vitest/config';
   
   export default defineConfig({
     test: {
       globals: true,
       environment: 'node',
     },
   });
   ```

3. **Move scripts to tests/**
   - Convert sample scripts to proper unit tests
   - Keep demo scripts in `scripts/`

### Phase 6: Documentation Updates 📚

1. Update all docs to reference new structure
2. Create architecture diagram showing separation
3. Update README with new folder structure
4. Add migration notes to CHANGELOG.md

## Benefits of Migration

### 1. **Clearer Separation of Concerns**
- Domain logic can be tested independently of MCP
- Easier to understand what's MCP-specific vs. core functionality
- Potential to reuse domain code in other contexts (CLI, REST API, etc.)

### 2. **Better Testability**
- Services and client can be unit tested without MCP layer
- Mock dependencies more easily
- Follows single responsibility principle

### 3. **Improved Maintainability**
- Flatter structure, easier navigation
- Clear boundaries between layers
- Standard structure familiar to other developers

### 4. **NPM Package Conventions**
- Using `dist/` aligns with npm ecosystem standards
- Cleaner published package structure
- Better tree-shaking for consumers

## Comparison with Sonos

| Aspect | Sonos | Plugwise (Current) | Plugwise (Target) |
|--------|-------|-------------------|-------------------|
| MCP folder | Only server.ts | Everything | Server + prompts/resources/tools |
| Services | src/services/ | src/mcp/services/ | src/services/ |
| Types | src/types/ | src/mcp/plugwise-types.ts | src/types/ |
| Client | src/soap/, src/discovery/ | src/mcp/plugwise-client.ts | src/client/ |
| Config | (none) | src/mcp/config/ | src/config/ |
| Output | dist/ | build/ | dist/ |
| Tests | tests/ with vitest | Empty | tests/ with vitest |

## Notes on Differences

### Plugwise-Specific Additions

**Tools Organization**
- Sonos: Tools inline in server.ts
- Plugwise: Separate tool files (`tools/*.ts`)
- **Decision:** Keep separate tool files - better organization for many tools

**Prompts & Resources**
- Sonos: No prompts/resources
- Plugwise: Has prompts and resources
- **Decision:** Keep in `mcp/` folder as they're MCP-specific features

**Client Architecture**
- Sonos: Split into `soap/`, `discovery/`, `didl/`, `events/`
- Plugwise: Single `plugwise-client.ts`
- **Decision:** Create `client/` folder, may split later if needed

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking imports | Careful search/replace, test after each file move |
| Build failures | Update all paths before testing build |
| Lost functionality | Keep git history, test all features post-migration |
| Documentation drift | Update docs as part of migration, not after |

## Timeline Estimate

- **Phase 1 (Structure):** 30 minutes
- **Phase 2 (Move files):** 30 minutes  
- **Phase 3 (Update imports):** 1-2 hours
- **Phase 4 (Build config):** 30 minutes
- **Phase 5 (Testing):** 2-3 hours
- **Phase 6 (Docs):** 1 hour

**Total:** 5-7 hours

## Rollback Plan

If issues arise:
1. Revert to previous commit
2. Create feature branch for migration
3. Test thoroughly before merging to main

## Success Criteria

- [x] All files in new structure
- [ ] All imports updated correctly
- [ ] `npm run build` succeeds
- [ ] `npm run dev` works
- [ ] All tools functional
- [ ] Tests pass (when created)
- [ ] Documentation updated
- [ ] No TypeScript errors
- [ ] Published package still works

## Next Steps

1. Review this plan
2. Create feature branch: `feature/structure-migration`
3. Execute phases 1-6
4. Test thoroughly
5. Update CHANGELOG.md
6. Merge to main
7. Publish new version

## References

- [Sonos MCP Repository](https://github.com/Tommertom/sonos-ts-mcp)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [TypeScript Project Structure Best Practices](https://www.typescriptlang.org/docs/handbook/project-references.html)
