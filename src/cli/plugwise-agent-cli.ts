#!/usr/bin/env node
import 'dotenv/config';
import { execSync } from 'child_process';
import { initializeMastra } from './lib/mastra-init.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { AgentMcpServer } from './agent-mcp-server.js';
import * as readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface CliOptions {
    prompt: string;
    model?: string;
    skipBuild?: boolean;
    jsonRpc?: boolean;
    verbose?: boolean;
}

async function parseArgs(): Promise<CliOptions | null> {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Plugwise Agent CLI - Control your Plugwise system with AI

Usage:
  plugwise-agent-cli                    Run as MCP server (stdio mode)
  plugwise-agent-cli --jsonrpc          Run in JSON-RPC mode (stdin/stdout)
  plugwise-agent-cli <prompt> [options] Run as interactive agent

Arguments:
  prompt          Natural language command for the Plugwise agent

Options:
  --jsonrpc       Accept JSON-RPC on stdin, output JSON-RPC on stdout
  --model <name>  LLM model to use (default: gpt-4o-mini)
  --skip-build    Skip the build step (use existing dist/)
  --verbose, -v   Enable verbose debug output (human mode only)
  --help, -h      Show this help message

Examples:
  plugwise-agent-cli                                       # MCP server mode
  plugwise-agent-cli --jsonrpc                            # JSON-RPC mode
  plugwise-agent-cli "List my devices" -v                 # Verbose human output
  plugwise-agent-cli "Set living room to 21" --model gpt-4o
  echo '{"method":"execute","params":{"instruction":"List devices"}}' | plugwise-agent-cli --jsonrpc

Environment Variables:
  OPENAI_API_KEY              Your OpenAI API key (required for OpenAI models)
  GOOGLE_GENERATIVE_AI_API_KEY Your Google API key (required for Gemini models)
  PLUGWISE_AGENT_MODEL        Default model to use (optional, overrides default)
        `);
        process.exit(0);
    }

    // Check for JSON-RPC mode
    if (args.includes('--jsonrpc')) {
        return {
            prompt: '',
            jsonRpc: true,
            skipBuild: false,
            verbose: false,
        };
    }

    // If no arguments, run as MCP server
    if (args.length === 0) {
        return null;
    }

    const options: CliOptions = {
        prompt: '',
        skipBuild: false,
        jsonRpc: false,
        verbose: args.includes('--verbose') || args.includes('-v'),
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (!arg) continue;

        if (arg === '--model' && i + 1 < args.length) {
            options.model = args[i + 1];
            i++;
        } else if (arg === '--skip-build') {
            options.skipBuild = true;
        } else if (arg === '--verbose' || arg === '-v') {
            // Already handled above
            continue;
        } else if (!arg.startsWith('--')) {
            options.prompt = arg;
        }
    }

    if (!options.prompt) {
        console.error('Error: No prompt provided');
        console.error('Use --help for usage information');
        process.exit(1);
    }

    return options;
}

async function buildMcpServer(): Promise<void> {
    const projectRoot = join(__dirname, '../..');

    console.error('[CLI] Building Plugwise MCP server...');

    try {
        execSync('npm run build', {
            cwd: projectRoot,
            stdio: 'inherit',
        });
        console.error('[CLI] Build complete');
    } catch (error) {
        console.error('[CLI] Build failed:', error);
        throw error;
    }
}

async function runAgent(options: CliOptions): Promise<void> {
    const modelName = options.model || process.env.PLUGWISE_AGENT_MODEL || 'gpt-4o-mini';

    if (modelName.startsWith('gemini')) {
        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
            console.error('Error: GOOGLE_GENERATIVE_AI_API_KEY environment variable is required for Gemini models');
            console.error('Please set it with: export GOOGLE_GENERATIVE_AI_API_KEY=...');
            process.exit(1);
        }
    } else {
        if (!process.env.OPENAI_API_KEY) {
            console.error('Error: OPENAI_API_KEY environment variable is required');
            console.error('Please set it with: export OPENAI_API_KEY=sk-...');
            process.exit(1);
        }
    }

    if (!options.skipBuild) {
        await buildMcpServer();
    }

    console.error('[CLI] Initializing Mastra with Plugwise MCP server...');
    const { mastra, plugwiseAgent, cleanup } = await initializeMastra({
        model: modelName,
    });

    let exitCode = 0;

    try {
        if (options.verbose) {
            console.error(`[CLI] Executing prompt: "${options.prompt}"\n`);
        }

        const agent = mastra.getAgent('plugwiseAgent');

        const result = await agent.generate(options.prompt, {
            maxSteps: 10,
            onStepFinish: ({ toolCalls, toolResults }) => {
                if (!options.verbose) return;
                
                if (toolCalls && toolCalls.length > 0) {
                    console.error(`\n[Agent] ${toolCalls.length} tool call(s) in this step`);
                    toolCalls.forEach((call: any, idx: number) => {
                        const toolName = call.payload?.toolName || call.toolName || 'unknown';
                        const args = call.payload?.args || call.args;
                        console.error(`  [${idx + 1}] ${toolName}`);
                        if (args) {
                            console.error(`      Args: ${JSON.stringify(args, null, 2).substring(0, 200)}`);
                        }
                    });
                }
                if (toolResults && toolResults.length > 0) {
                    console.error(`[Agent] ${toolResults.length} tool result(s) received\n`);
                    toolResults.forEach((toolResult, idx: number) => {
                        const result = toolResult.payload.result;
                        if (result) {
                            const resultText = typeof result === 'string'
                                ? result.substring(0, 200)
                                : JSON.stringify(result).substring(0, 200);
                            console.error(`  Result ${idx + 1}: ${resultText}...`);
                        }
                    });
                }
            },
        });

        // Human-readable output (not verbose mode)
        if (!options.verbose) {
            console.log(result.text || '(no response)');
        } else {
            // Verbose mode with detailed output
            console.log('\n' + '='.repeat(60));
            console.log('AGENT RESPONSE:');
            console.log('='.repeat(60));
            console.log(result.text || '(no text response)');
            console.log('='.repeat(60) + '\n');

            // Debug: show reasoning steps
            if (result.steps && result.steps.length > 0) {
                console.error('[Debug] Agent completed', result.steps.length, 'reasoning step(s):');
                result.steps.forEach((step: any, idx: number) => {
                    const hasText = step.text && step.text.trim().length > 0;
                    const hasToolCalls = step.toolCalls && step.toolCalls.length > 0;
                    const hasToolResults = step.toolResults && step.toolResults.length > 0;

                    let stepType = '';
                    if (hasToolCalls && hasText) {
                        stepType = 'Tool execution + reasoning';
                    } else if (hasToolCalls) {
                        stepType = 'Tool execution';
                    } else if (hasText) {
                        stepType = 'Final response';
                    } else {
                        stepType = 'Unknown';
                    }

                    console.error(`  Step ${idx + 1} [${stepType}]:`);

                    if (hasToolCalls) {
                        step.toolCalls.forEach((call: any) => {
                            const toolName = call.payload?.toolName || call.toolName || call.name || call.type || 'unknown';
                            const args = call.payload?.args || call.args;
                            const argsInfo = args ? ` (${Object.keys(args).join(', ')})` : '';
                            console.error(`    → ${toolName}${argsInfo}`);
                        });
                    }

                    if (hasText) {
                        const textPreview = step.text.length > 100
                            ? step.text.substring(0, 100) + '...'
                            : step.text;
                        console.error(`    Response: "${textPreview}"`);
                    }
                });
                console.error('');
            }
        }

    } catch (error) {
        console.error('[CLI] Error:', error);
        exitCode = 1;
    } finally {
        await cleanup();
        process.exit(exitCode);
    }
}

async function runMcpServer(): Promise<void> {
    console.error('[CLI] Starting as Agent MCP server (stdio mode)...');
    console.error('[CLI] Exposing single tool: manage_plugwise');
    const server = new AgentMcpServer();
    await server.run();
}

async function runJsonRpcMode(options: CliOptions): Promise<void> {
    const modelName = options.model || process.env.PLUGWISE_AGENT_MODEL || 'gpt-4o-mini';

    // Validate API keys
    if (modelName.startsWith('gemini')) {
        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
            const error = {
                jsonrpc: '2.0',
                error: {
                    code: -32000,
                    message: 'GOOGLE_GENERATIVE_AI_API_KEY environment variable is required for Gemini models'
                },
                id: null
            };
            console.log(JSON.stringify(error));
            process.exit(1);
        }
    } else {
        if (!process.env.OPENAI_API_KEY) {
            const error = {
                jsonrpc: '2.0',
                error: {
                    code: -32000,
                    message: 'OPENAI_API_KEY environment variable is required'
                },
                id: null
            };
            console.log(JSON.stringify(error));
            process.exit(1);
        }
    }

    // Build if needed
    if (!options.skipBuild) {
        await buildMcpServer();
    }

    // Initialize agent
    const { mastra, cleanup } = await initializeMastra({
        model: modelName,
    });

    const agent = mastra.getAgent('plugwiseAgent');

    // Read JSON-RPC from stdin
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    });

    rl.on('line', async (line: string) => {
        let request: any;
        
        try {
            request = JSON.parse(line);
        } catch (error) {
            const response = {
                jsonrpc: '2.0',
                error: {
                    code: -32700,
                    message: 'Parse error: Invalid JSON'
                },
                id: null
            };
            console.log(JSON.stringify(response));
            return;
        }

        // Validate JSON-RPC request
        if (!request.method || !request.params || !request.params.instruction) {
            const response = {
                jsonrpc: '2.0',
                error: {
                    code: -32602,
                    message: 'Invalid params: instruction is required'
                },
                id: request.id || null
            };
            console.log(JSON.stringify(response));
            return;
        }

        try {
            const result = await agent.generate(request.params.instruction, {
                maxSteps: 10,
            });

            const response = {
                jsonrpc: '2.0',
                result: {
                    text: result.text || '',
                    steps: result.steps?.length || 0,
                },
                id: request.id || null
            };
            console.log(JSON.stringify(response));
        } catch (error: any) {
            const response = {
                jsonrpc: '2.0',
                error: {
                    code: -32603,
                    message: `Internal error: ${error.message || String(error)}`
                },
                id: request.id || null
            };
            console.log(JSON.stringify(response));
        }
    });

    rl.on('close', async () => {
        await cleanup();
        process.exit(0);
    });

    process.on('SIGINT', async () => {
        await cleanup();
        process.exit(130);
    });

    process.on('SIGTERM', async () => {
        await cleanup();
        process.exit(143);
    });
}

async function main(): Promise<void> {
    try {
        const options = await parseArgs();
        
        // If no options (no arguments), run as MCP server
        if (options === null) {
            await runMcpServer();
        } else if (options.jsonRpc) {
            await runJsonRpcMode(options);
        } else {
            await runAgent(options);
        }
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

process.on('SIGINT', async () => {
    console.error('\n[CLI] Interrupted, shutting down...');
    process.exit(130);
});

process.on('SIGTERM', async () => {
    console.error('\n[CLI] Terminated, shutting down...');
    process.exit(143);
});

main();
