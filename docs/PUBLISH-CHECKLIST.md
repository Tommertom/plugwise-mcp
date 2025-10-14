# Quick Publishing Checklist

This is a quick reference for publishing the Plugwise MCP Server to npm. For detailed instructions, see [publishing-guide.md](./publishing-guide.md).

## Before Publishing

- [ ] **Ensure you're logged into npm**
  ```bash
  npm whoami
  # If not logged in:
  npm login
  ```

- [ ] **Update version in package.json**
  ```bash
  # For bug fixes (1.0.0 -> 1.0.1)
  npm version patch
  
  # For new features (1.0.0 -> 1.1.0)
  npm version minor
  
  # For breaking changes (1.0.0 -> 2.0.0)
  npm version major
  ```

- [ ] **Clean install and build**
  ```bash
  rm -rf node_modules build
  npm install
  npm run build
  ```

- [ ] **Test locally**
  ```bash
  npm link
  plugwise-mcp-server
  # Verify server starts, then Ctrl+C
  npm unlink -g plugwise-mcp-server
  ```

- [ ] **Verify package contents**
  ```bash
  npm pack --dry-run
  # Check that only build/, bin/, README.md are included
  ```

- [ ] **Run tests**
  ```bash
  npm run test:all
  ```

- [ ] **Commit and push all changes**
  ```bash
  git add .
  git commit -m "Prepare for v1.0.0 release"
  git push origin main
  git push origin --tags
  ```

## Publishing

- [ ] **Dry run**
  ```bash
  npm publish --dry-run
  ```

- [ ] **Publish to npm**
  ```bash
  npm publish --access public
  ```

- [ ] **Verify on npm**
  - Visit: https://www.npmjs.com/package/plugwise-mcp-server
  - Check version, README, and files

- [ ] **Test installation**
  ```bash
  npx plugwise-mcp-server@latest
  ```

## After Publishing

- [ ] **Create GitHub Release**
  - Go to: https://github.com/Tommertom/plugwise-mcp-server/releases/new
  - Select version tag
  - Add release notes
  - Publish release

- [ ] **Test with MCP clients**
  - Test with Claude Desktop, Cursor, or VS Code Copilot
  - Verify `npx -y plugwise-mcp-server@latest` works in configs

- [ ] **Update documentation if needed**
  - Check README renders correctly on npm
  - Update any version-specific docs

## Troubleshooting

**"You do not have permission to publish"**
```bash
npm whoami  # Verify logged in
npm login   # Login if needed
```

**"Version already published"**
```bash
npm version patch  # Bump version
```

**"Package name taken"**
- Change name in package.json or use scoped package:
  ```json
  "name": "@yourname/plugwise-mcp-server"
  ```

**Binary not executable**
```bash
chmod +x bin/plugwise-mcp-server.js
```

## Quick Commands Reference

```bash
# Login to npm
npm login

# Bump version (auto-commits and tags)
npm version patch

# Preview package
npm pack --dry-run

# Publish
npm publish --access public

# Test globally
npx plugwise-mcp-server@latest

# Deprecate version (if needed)
npm deprecate plugwise-mcp-server@1.0.0 "Please upgrade to 1.0.1"
```

## Current Package Info

- **Name**: `plugwise-mcp-server`
- **Current Version**: `1.0.0`
- **Binary**: `plugwise-mcp-server`
- **License**: MIT
- **Repository**: https://github.com/Tommertom/plugwise-mcp-server

## First Time Publishing?

Read the full [Publishing Guide](./publishing-guide.md) for detailed explanations of each step.
