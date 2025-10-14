# Structure Migration Checklist

Quick reference for migrating Plugwise MCP to Sonos-inspired structure.

## Pre-Migration

- [ ] Review `STRUCTURE-MIGRATION-PLAN.md`
- [ ] Review `structure-comparison-diagram.md`
- [ ] Create feature branch: `git checkout -b feature/structure-migration`
- [ ] Commit current state: `git commit -am "Pre-migration snapshot"`

## Phase 1: Create New Structure (30 min)

```bash
# Create new folders
mkdir -p src/client
mkdir -p src/services
mkdir -p src/types
mkdir -p src/config
mkdir -p tests/client
mkdir -p tests/services
mkdir -p tests/mcp
```

- [ ] New folders created
- [ ] Verify folder structure with `tree src`

## Phase 2: Move Files (30 min)

### Client Layer
```bash
git mv src/mcp/plugwise-client.ts src/client/
touch src/client/index.ts
```

- [ ] `plugwise-client.ts` moved to `src/client/`
- [ ] `src/client/index.ts` created

### Services Layer
```bash
git mv src/mcp/services/connection.service.ts src/services/
git mv src/mcp/services/hub-discovery.service.ts src/services/
rmdir src/mcp/services
touch src/services/index.ts
```

- [ ] `connection.service.ts` moved to `src/services/`
- [ ] `hub-discovery.service.ts` moved to `src/services/`
- [ ] `src/mcp/services/` folder removed
- [ ] `src/services/index.ts` created

### Types Layer
```bash
git mv src/mcp/plugwise-types.ts src/types/
touch src/types/index.ts
```

- [ ] `plugwise-types.ts` moved to `src/types/`
- [ ] `src/types/index.ts` created

### Config Layer
```bash
git mv src/mcp/config/environment.ts src/config/
rmdir src/mcp/config
touch src/config/index.ts
```

- [ ] `environment.ts` moved to `src/config/`
- [ ] `src/mcp/config/` folder removed
- [ ] `src/config/index.ts` created

### Verify MCP folder
- [ ] `src/mcp/server.ts` - stays
- [ ] `src/mcp/prompts/` - stays
- [ ] `src/mcp/resources/` - stays
- [ ] `src/mcp/tools/` - stays

## Phase 3: Create Index Files (15 min)

### src/client/index.ts
```typescript
export { PlugwiseClient } from './plugwise-client.js';
```

### src/services/index.ts
```typescript
export { ConnectionService } from './connection.service.js';
export { HubDiscoveryService } from './hub-discovery.service.js';
```

### src/types/index.ts
```typescript
export * from './plugwise-types.js';
```

### src/config/index.ts
```typescript
export { getServerConfig } from './environment.js';
```

- [ ] All index files created
- [ ] Exports verified

## Phase 4: Update Imports (1-2 hours)

### Files to Update

#### src/mcp/server.ts
```typescript
// OLD
import { getServerConfig } from './config/environment.js';
import { HubDiscoveryService } from './services/hub-discovery.service.js';
import { ConnectionService } from './services/connection.service.js';

// NEW
import { getServerConfig } from '../config/environment.js';
import { HubDiscoveryService } from '../services/hub-discovery.service.js';
import { ConnectionService } from '../services/connection.service.js';
```

- [ ] `src/mcp/server.ts` imports updated

#### src/mcp/tools/*.ts
- [ ] `connection.tool.ts` - update imports from `../..` to `../../services`, `../../client`
- [ ] `device.tool.ts` - update imports
- [ ] `gateway.tool.ts` - update imports
- [ ] `scan-network.tool.ts` - update imports
- [ ] `switch.tool.ts` - update imports
- [ ] `temperature.tool.ts` - update imports

#### src/mcp/resources/*.ts
- [ ] `devices.resource.ts` - update imports
- [ ] Update any other resource files

#### src/services/*.ts
- [ ] `connection.service.ts` - update client import from `../plugwise-client` to `../client/plugwise-client`
- [ ] `hub-discovery.service.ts` - update client import

#### src/client/plugwise-client.ts
- [ ] Update type imports from `./plugwise-types` to `../types/plugwise-types`

## Phase 5: Update Build Configuration (30 min)

### package.json
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
    "typecheck": "tsc --noEmit",
    "test:all": "tsx scripts/test-all.ts"
  },
  "devDependencies": {
    "@types/node": "^22.10.5",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2",
    "vitest": "^2.1.0"
  }
}
```

- [ ] `main` changed to `dist/index.js`
- [ ] `bin` changed to `dist/index.js`
- [ ] `files` changed to include `dist/`
- [ ] Build script updated
- [ ] Test scripts added
- [ ] vitest added to devDependencies

### tsconfig.json
```json
{
  "compilerOptions": {
    "outDir": "./dist",
    // ... rest stays the same
  }
}
```

- [ ] `outDir` changed to `./dist`

### .gitignore
```
dist/
build/
node_modules/
.env
```

- [ ] `dist/` added
- [ ] `build/` kept for safety (can remove later)

### vitest.config.ts (NEW)
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

- [ ] `vitest.config.ts` created

## Phase 6: Build & Test (1 hour)

### Install Dependencies
```bash
npm install
npm install -D vitest
```

- [ ] Dependencies installed
- [ ] vitest installed

### Type Check
```bash
npm run typecheck
```

- [ ] No TypeScript errors

### Build
```bash
npm run build
```

- [ ] Build succeeds
- [ ] `dist/` folder created
- [ ] All files present in `dist/`

### Test Development Mode
```bash
npm run dev
```

- [ ] Dev mode starts without errors
- [ ] Server initializes correctly

### Test Scripts
```bash
npm run test:all
```

- [ ] Test scripts run
- [ ] No runtime errors

### Clean Old Build
```bash
rm -rf build/
```

- [ ] Old `build/` folder removed

## Phase 7: Documentation Updates (1 hour)

### Update README.md
- [ ] Folder structure section updated
- [ ] Build commands reference `dist/`
- [ ] Installation instructions verified

### Update docs/code-organization.md
- [ ] New structure documented
- [ ] Layer explanations updated

### Update docs/architecture-diagram.md
- [ ] Diagram reflects new structure

### Create CHANGELOG.md entry
```markdown
## [Unreleased]
### Changed
- Restructured project to separate MCP layer from domain logic
- Moved services/, types/, client/, config/ to src root level
- Changed build output from build/ to dist/
- Added vitest for testing infrastructure

### Migration
- See docs/STRUCTURE-MIGRATION-PLAN.md for details
```

- [ ] CHANGELOG.md updated

## Phase 8: Final Verification (30 min)

### All Imports Working
- [ ] No import errors in IDE
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds

### All Tools Functional
Test each tool manually or with scripts:
- [ ] `scan_network` tool works
- [ ] `connect` tool works
- [ ] `get_devices` tool works
- [ ] `set_temperature` tool works
- [ ] All other tools work

### Git Status
```bash
git status
git diff
```

- [ ] Review all changes
- [ ] No unintended modifications

### Commit
```bash
git add -A
git commit -m "Restructure project: separate MCP from domain logic

- Move services to src/services/
- Move types to src/types/
- Move client to src/client/
- Move config to src/config/
- Keep MCP-specific code in src/mcp/
- Change build output to dist/
- Add vitest for testing
- Update all imports and documentation

See docs/STRUCTURE-MIGRATION-PLAN.md for details"
```

- [ ] Changes committed

## Post-Migration

### Merge to Main
```bash
git checkout main
git merge feature/structure-migration
git push origin main
```

- [ ] Merged to main
- [ ] Pushed to remote

### Publish (if applicable)
```bash
npm version patch
npm publish
```

- [ ] Version bumped
- [ ] Published to npm

### Clean Up
```bash
git branch -d feature/structure-migration
```

- [ ] Feature branch deleted

## Rollback (If Needed)

If issues arise:
```bash
git checkout main
git reset --hard HEAD~1  # Or specific commit
```

## Time Tracking

| Phase | Estimated | Actual | Notes |
|-------|-----------|--------|-------|
| Phase 1 | 30 min | | |
| Phase 2 | 30 min | | |
| Phase 3 | 15 min | | |
| Phase 4 | 1-2 hours | | |
| Phase 5 | 30 min | | |
| Phase 6 | 1 hour | | |
| Phase 7 | 1 hour | | |
| Phase 8 | 30 min | | |
| **Total** | **5-7 hours** | | |

## Notes

Add any notes or issues encountered during migration:

---
