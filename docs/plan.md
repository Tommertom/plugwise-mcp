# Plan to Create Plugwise Agent CLI

This plan outlines the steps to create a CLI tool that runs an AI agent specialized in managing Plugwise devices using the MCP tools, based on the approach in the `sonos-ts-mcp` project.

## Prerequisites

-   Existing Plugwise MCP server implementation.
-   Node.js environment.

## Step-by-Step Plan

### 1. Install Dependencies

We need to install the necessary libraries for Mastra and AI SDKs.

-   [ ] Install `@mastra/core`, `@ai-sdk/openai`, `@ai-sdk/google`, `ai`, and `dotenv`.
    ```bash
    npm install @mastra/core @ai-sdk/openai @ai-sdk/google ai dotenv
    ```

### 2. Create Directory Structure

We will create a new directory structure for the CLI and agent logic, mirroring the `sonos-ts-mcp` project.

-   [ ] Create `src/cli` directory.
-   [ ] Create `src/cli/lib` directory.

### 3. Implement MCP Client and Tool Adapter

We need to bridge the MCP server tools to the Mastra agent. We will adapt the `McpClient` and `McpToolAdapter` classes.

-   [ ] Create `src/cli/lib/mcp-client.ts`: Handles connection to the MCP server using `StdioClientTransport`.
-   [ ] Create `src/cli/lib/tool-adapter.ts`: Converts MCP tools to Mastra-compatible tools.

### 4. Implement Plugwise Agent

We will define the agent's personality, instructions, and model configuration.

-   [ ] Create `src/cli/lib/plugwise-agent.ts`:
    -   Define `createPlugwiseAgent` function.
    -   Set system instructions specific to Plugwise (e.g., "You control Plugwise devices...", "Always check for hubs first...").
    -   Configure the model (OpenAI/Gemini).

### 5. Implement Mastra Initialization

We need a way to initialize Mastra with the agent and MCP tools.

-   [ ] Create `src/cli/lib/mastra-init.ts`:
    -   Connects to the MCP server.
    -   Loads tools.
    -   Creates the agent.
    -   Initializes the Mastra instance.

### 6. Create CLI Entry Point

This is the main executable script for the CLI.

-   [ ] Create `src/cli/plugwise-agent-cli.ts`:
    -   Parses command-line arguments (prompt, model, etc.).
    -   Builds the project (optional).
    -   Initializes Mastra.
    -   Runs the agent with the user's prompt.
    -   Handles output and cleanup.

### 7. Update Configuration

-   [ ] Update `package.json`:
    -   Add an `agent` script: `tsx src/cli/plugwise-agent-cli.ts`.
    -   Add an `agent:build` script.

### 8. Verification

-   [ ] Test the CLI with a simple prompt (e.g., "List my devices").
-   [ ] Verify that the agent can discover hubs and devices.
-   [ ] Verify that the agent can control devices (if applicable/safe).

## Detailed Implementation Notes

-   **Agent Instructions**: The instructions in `plugwise-agent.ts` should be tailored to the Plugwise domain. It should emphasize discovering hubs and devices before attempting control actions.
-   **MCP Server Path**: The `McpClient` needs to know where the compiled MCP server is located (`dist/index.js`).
-   **Environment Variables**: The CLI should respect `OPENAI_API_KEY` and `GOOGLE_GENERATIVE_AI_API_KEY`.

