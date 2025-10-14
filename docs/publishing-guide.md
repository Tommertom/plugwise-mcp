# Publishing Plugwise MCP Server to npm

This guide explains how to publish the Plugwise MCP Server to npm so users can install it easily.

## Prerequisites

1. **npm Account**: Create an account at [npmjs.com](https://www.npmjs.com/signup)
2. **npm CLI Login**: Login to npm from your terminal
   ```bash
   npm login
   ```
3. **Git Repository**: Ensure code is pushed to GitHub
4. **Clean Build**: Verify the build works correctly

## Pre-Publication Checklist

- [ ] Update version number in `package.json`
- [ ] Test build: `npm run build`
- [ ] Test installation locally: `npm link`
- [ ] Verify README.md is complete and accurate
- [ ] Check that `.npmignore` excludes dev files
- [ ] Review package.json metadata (author, repository, keywords)
- [ ] Run tests: `npm run test:all`
- [ ] Commit and push all changes to GitHub

## Version Management

Follow [Semantic Versioning](https://semver.org/) (MAJOR.MINOR.PATCH):

- **PATCH** (1.0.x): Bug fixes, minor changes
  ```bash
  npm version patch
  ```
  
- **MINOR** (1.x.0): New features, backward compatible
  ```bash
  npm version minor
  ```
  
- **MAJOR** (x.0.0): Breaking changes
  ```bash
  npm version major
  ```

The `npm version` command automatically:
- Updates `package.json`
- Creates a git tag
- Commits the version change

## Publishing Steps

### 1. Prepare for Publication

```bash
# Ensure you're on main branch
git checkout main
git pull origin main

# Clean build
rm -rf build node_modules
npm install
npm run build

# Test the build
npm start
# Verify server starts correctly, then Ctrl+C
```

### 2. Test Local Installation

```bash
# Create a test link
npm link

# In another directory, test the global command
cd /tmp
plugwise-mcp-server --help

# Unlink when done testing
npm unlink -g plugwise-mcp-server
```

### 3. Bump Version

```bash
# For a patch release (1.0.0 -> 1.0.1)
npm version patch -m "Release v%s - <brief description>"

# Push version tag to GitHub
git push origin main --tags
```

### 4. Publish to npm

```bash
# Dry run to see what will be published
npm publish --dry-run

# Review the output, verify only necessary files are included

# Publish to npm
npm publish

# Or for first publication
npm publish --access public
```

### 5. Verify Publication

```bash
# Check on npmjs.com
open https://www.npmjs.com/package/plugwise-mcp-server

# Test installation
npm install -g plugwise-mcp-server@latest
plugwise-mcp-server

# Or test with npx
npx plugwise-mcp-server@latest
```

## Post-Publication

1. **Create GitHub Release**
   - Go to https://github.com/Tommertom/plugwise-mcp-server/releases
   - Click "Create a new release"
   - Select the version tag you just created
   - Add release notes describing changes
   - Publish release

2. **Update Documentation**
   - Verify installation instructions work
   - Update any version-specific documentation
   - Check that README renders correctly on npm

3. **Announce**
   - Share on relevant forums/communities
   - Update any blog posts or tutorials
   - Notify users of updates

## Troubleshooting

### "You do not have permission to publish"

Make sure you're logged in:
```bash
npm whoami
npm login
```

### "Package already exists"

The package name is taken. Choose a different name in `package.json` or scope it:
```bash
"name": "@yourname/plugwise-mcp-server"
```

### "Version already published"

You need to bump the version:
```bash
npm version patch
```

### Files missing from package

Check `.npmignore` and `files` field in `package.json`:
```bash
npm pack --dry-run
```

### Binary not executable

Ensure `bin/plugwise-mcp-server.js` has execute permissions:
```bash
chmod +x bin/plugwise-mcp-server.js
git add bin/plugwise-mcp-server.js --chmod=+x
```

## Unpublishing (Emergency Only)

⚠️ **Warning**: Unpublishing is permanent and can break users' installations.

```bash
# Unpublish a specific version (within 72 hours)
npm unpublish plugwise-mcp-server@1.0.0

# Deprecate instead (recommended)
npm deprecate plugwise-mcp-server@1.0.0 "Please upgrade to 1.0.1"
```

## Beta/Alpha Releases

For pre-release versions:

```bash
# Create a pre-release version
npm version prerelease --preid=beta
# Creates: 1.0.1-beta.0

# Publish with beta tag
npm publish --tag beta

# Users install with:
npm install plugwise-mcp-server@beta
```

## CI/CD Automation

For automated publishing with GitHub Actions, create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm run test:all
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Add your npm token to GitHub secrets:
1. Generate token: https://www.npmjs.com/settings/USERNAME/tokens
2. Add to GitHub: Settings > Secrets > Actions > New repository secret
3. Name: `NPM_TOKEN`

## Version History Template

Keep a CHANGELOG.md:

```markdown
# Changelog

## [1.0.1] - 2024-10-14
### Fixed
- Bug fix description

### Added
- New feature description

### Changed
- Change description

## [1.0.0] - 2024-10-14
### Added
- Initial release
```

## Support

After publishing, monitor:
- GitHub Issues: https://github.com/Tommertom/plugwise-mcp-server/issues
- npm downloads: https://www.npmjs.com/package/plugwise-mcp-server
- User feedback and questions

Remember to respond to issues and pull requests promptly!
