/**
 * Setup Guide Prompt
 * Provides guidance for setting up Plugwise integration
 */

export function registerSetupGuidePrompt(server: any): void {
    server.registerPrompt(
        'setup_guide',
        {
            title: 'Plugwise Setup Guide',
            description: 'Get step-by-step guidance for setting up Plugwise integration',
            argsSchema: {}
        },
        () => ({
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: `Please provide a comprehensive guide for setting up the Plugwise MCP server integration. Include:

1. How to find the IP address of my Plugwise gateway
2. How to obtain the password (where to find it on the device)
3. Supported devices and their capabilities
4. Common use cases and examples
5. Troubleshooting tips

Make the guide beginner-friendly and practical.`
                    }
                }
            ]
        })
    );
}
