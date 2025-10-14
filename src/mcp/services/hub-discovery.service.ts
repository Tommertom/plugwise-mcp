/**
 * Hub Discovery Service
 * Manages discovery and storage of Plugwise hubs
 */

import { execSync } from 'child_process';
import { PlugwiseClient } from '../plugwise-client.js';
import { loadHubCredentials, HubCredentials } from '../config/environment.js';

export interface DiscoveredHub {
    name: string;
    ip: string;
    password: string;
    model?: string;
    firmware?: string;
    discoveredAt: Date;
}

/**
 * Hub Discovery Service
 * Maintains a registry of discovered hubs and provides discovery functionality
 */
export class HubDiscoveryService {
    private discoveredHubs: Map<string, DiscoveredHub> = new Map();

    /**
     * Get all discovered hubs
     */
    getDiscoveredHubs(): DiscoveredHub[] {
        return Array.from(this.discoveredHubs.values());
    }

    /**
     * Get a hub by IP address
     */
    getHub(ip: string): DiscoveredHub | undefined {
        return this.discoveredHubs.get(ip);
    }

    /**
     * Add or update a hub in the registry
     */
    addHub(hub: DiscoveredHub): void {
        this.discoveredHubs.set(hub.ip, hub);
    }

    /**
     * Get the first discovered hub (useful for auto-connect)
     */
    getFirstHub(): DiscoveredHub | undefined {
        const hubs = Array.from(this.discoveredHubs.values());
        return hubs.length > 0 ? hubs[0] : undefined;
    }

    /**
     * Check if any hubs have been discovered
     */
    hasDiscoveredHubs(): boolean {
        return this.discoveredHubs.size > 0;
    }

    /**
     * Load HUB configurations from environment variables
     * Reads HUBx and HUBxIP variables and pre-populates discoveredHubs
     */
    async loadFromEnvironment(): Promise<void> {
        console.log('Loading HUB configurations from .env...');

        const credentials = loadHubCredentials();

        if (credentials.size === 0) {
            console.log('No HUBx/HUBxIP pairs found in .env file');
            return;
        }

        for (const [index, creds] of credentials.entries()) {
            if (creds.password && creds.ip) {
                try {
                    // Try to connect to get gateway info
                    const testClient = new PlugwiseClient({
                        host: creds.ip,
                        password: creds.password,
                        username: 'smile'
                    });

                    const gatewayInfo = await testClient.connect();

                    const hub: DiscoveredHub = {
                        name: gatewayInfo.name || `Hub ${index}`,
                        ip: creds.ip,
                        password: creds.password,
                        model: gatewayInfo.model,
                        firmware: gatewayInfo.version,
                        discoveredAt: new Date()
                    };

                    this.addHub(hub);
                    console.log(`✓ Loaded HUB${index} at ${creds.ip}: ${hub.name} (${hub.model})`);
                } catch (error) {
                    // If connection fails, still store the hub with basic info
                    const hub: DiscoveredHub = {
                        name: `Hub ${index}`,
                        ip: creds.ip,
                        password: creds.password,
                        discoveredAt: new Date()
                    };

                    this.addHub(hub);
                    console.log(`⚠ Loaded HUB${index} at ${creds.ip} (connection failed, stored credentials only)`);
                }
            }
        }

        console.log(`✓ Loaded ${this.discoveredHubs.size} hub(s) from .env`);
    }

    /**
     * Scan network for Plugwise hubs
     */
    async scanNetwork(network?: string): Promise<{
        discovered: DiscoveredHub[];
        scannedCount: number;
    }> {
        const hubConfigs = loadHubCredentials();

        if (hubConfigs.size === 0) {
            throw new Error('No HUBx passwords found in .env file. Please add HUB1, HUB2, etc.');
        }

        const discovered: DiscoveredHub[] = [];
        let scannedCount = 0;

        // Strategy 1: Test known IPs from HUBxIP variables
        const knownIPs = Array.from(hubConfigs.values())
            .filter(h => h.ip)
            .map(h => h.ip!);

        if (knownIPs.length > 0) {
            console.log(`Testing ${knownIPs.length} known hub IP(s)...`);

            for (const [index, config] of hubConfigs.entries()) {
                if (!config.ip) continue;

                scannedCount++;
                try {
                    const testClient = new PlugwiseClient({
                        host: config.ip,
                        password: config.password,
                        username: 'smile'
                    });

                    const gatewayInfo = await testClient.connect();

                    const hub: DiscoveredHub = {
                        name: gatewayInfo.name || 'Unknown',
                        ip: config.ip,
                        password: config.password,
                        model: gatewayInfo.model,
                        firmware: gatewayInfo.version,
                        discoveredAt: new Date()
                    };
                    discovered.push(hub);
                    this.addHub(hub);
                    console.log(`✓ Found hub at ${config.ip}: ${hub.name}`);
                } catch (error) {
                    console.log(`✗ No hub at ${config.ip}`);
                }
            }
        }

        // Strategy 2: Network scanning if requested or no known IPs
        const shouldScanNetwork = network || knownIPs.length === 0;

        if (shouldScanNetwork) {
            const networkToScan = network || this.detectLocalNetwork();
            console.log(`Scanning network ${networkToScan}...`);

            const scanResults = await this.scanNetworkRange(networkToScan, hubConfigs);
            discovered.push(...scanResults.discovered);
            scannedCount += scanResults.scannedCount;
        }

        return { discovered, scannedCount };
    }

    /**
     * Detect local network automatically
     */
    private detectLocalNetwork(): string {
        try {
            const routeOutput = execSync('ip route | grep "scope link" | head -1', { encoding: 'utf-8' });
            const match = routeOutput.match(/(\d+\.\d+\.\d+\.\d+\/\d+)/);
            if (match) {
                return match[1];
            }
        } catch (error) {
            // Fallback
        }
        return '192.168.1.0/24';
    }

    /**
     * Scan a network range for hubs
     */
    private async scanNetworkRange(
        network: string,
        credentials: Map<number, HubCredentials>
    ): Promise<{
        discovered: DiscoveredHub[];
        scannedCount: number;
    }> {
        const discovered: DiscoveredHub[] = [];
        let scannedCount = 0;

        // Extract network base
        const [baseIp] = network.split('/');
        const [octet1, octet2, octet3] = baseIp.split('.');
        const networkBase = `${octet1}.${octet2}.${octet3}`;

        const scanPromises: Promise<void>[] = [];
        const allPasswords = Array.from(credentials.values()).map(h => h.password);

        for (let lastOctet = 1; lastOctet <= 254; lastOctet++) {
            const ip = `${networkBase}.${lastOctet}`;

            // Skip already discovered IPs
            if (discovered.some(h => h.ip === ip)) {
                continue;
            }

            scannedCount++;

            // Test each password for this IP
            for (const password of allPasswords) {
                scanPromises.push(
                    (async () => {
                        try {
                            const testClient = new PlugwiseClient({
                                host: ip,
                                password,
                                username: 'smile'
                            });

                            // Set a short timeout for scanning
                            const timeoutPromise = new Promise((_, reject) =>
                                setTimeout(() => reject(new Error('timeout')), 1500)
                            );

                            const gatewayInfo = await Promise.race([
                                testClient.connect(),
                                timeoutPromise
                            ]);

                            if (gatewayInfo) {
                                const hub: DiscoveredHub = {
                                    name: (gatewayInfo as any).name || 'Unknown',
                                    ip,
                                    password,
                                    model: (gatewayInfo as any).model,
                                    firmware: (gatewayInfo as any).version,
                                    discoveredAt: new Date()
                                };
                                discovered.push(hub);
                                this.addHub(hub);
                                console.log(`✓ Found hub at ${ip}: ${hub.name}`);
                            }
                        } catch (error) {
                            // Ignore connection failures during scan
                        }
                    })()
                );
            }
        }

        // Wait for all scans to complete
        await Promise.all(scanPromises);

        return { discovered, scannedCount };
    }
}
