import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';

export interface PlugwiseAgentConfig {
    tools: Record<string, unknown>;
    model?: string;
}

export function createPlugwiseAgent(config: PlugwiseAgentConfig): Agent {
    const modelName = config.model || 'gpt-4o-mini';

    const model = modelName.startsWith('gemini')
        ? google(modelName)
        : openai(modelName);

    return new Agent({
        id: 'plugwise-control-agent',
        name: 'Plugwise Control Agent',
        description: 'An AI agent specialized in controlling Plugwise smart home devices.',
        instructions: `You control Plugwise devices (Adam, Anna, Smile P1, Stretch).

CRITICAL: Your first action must ALWAYS be to check for available hubs and devices.

Steps:
1. Check if any hubs are already known.
2. If no hubs are known, ask the user for the hub ID to add it using the 'add_hub' tool. The add_hub tool will scan the network for the hub.
3. Once a hub is available, use 'get_devices' to list all devices.
4. Identify the device ID from the results based on the user's request (e.g., "Living Room Thermostat").
5. Execute the requested action using the device ID.

When users want to control a device (e.g., "Set temperature to 20 degrees in the Living Room"):
1. Call 'get_devices' to find the device named "Living Room" (or similar).
2. Extract the device ID.
3. Call the appropriate tool (e.g., 'set_temperature') with the device ID.

If the user asks about energy consumption:
1. Find the Smile P1 or other energy measuring devices.
2. Use the appropriate tool to get current usage or historical data.

Always confirm the action taken to the user.`,
        model: model,
        tools: config.tools,
    });
}

export const PLUGWISE_AGENT_DEFAULT_MODEL = 'gpt-4o-mini';
