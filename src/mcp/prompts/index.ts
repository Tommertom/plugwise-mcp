/**
 * Prompts Index
 * Aggregates and registers all MCP prompts
 */

import { registerSetupGuidePrompt } from './setup-guide.prompt.js';

/**
 * Register all MCP prompts with the server
 */
export function registerAllPrompts(server: any): void {
    registerSetupGuidePrompt(server);
}
