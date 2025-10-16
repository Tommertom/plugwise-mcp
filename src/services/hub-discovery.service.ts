/**
 * Hub Discovery Service
 * Manages discovery and storage of Plugwise hubs
 */

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import { PlugwiseClient } from '../client/plugwise-client.js';
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
    private hubsDirectory: string;

    constructor() {
        // Set hubs directory to /hubs folder in project root
        this.hubsDirectory = path.join(process.cwd(), 'hubs');
        this.ensureHubsDirectory();
    }

    /**
     * Ensure the hubs directory exists
     */
    private async ensureHubsDirectory(): Promise<void> {
        try {
            await fs.mkdir(this.hubsDirectory, { recursive: true });
        } catch (error) {
            console.error('Error creating hubs directory:', error);
        }
    }

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
     * Save a hub to a JSON file in the /hubs directory
     */
    private async saveHubToFile(hubName: string, hub: DiscoveredHub): Promise<void> {
        try {
            await this.ensureHubsDirectory();
            const filePath = path.join(this.hubsDirectory, `${hubName}.json`);
            const hubData = {
                name: hub.name,
                ip: hub.ip,
                password: hub.password,
                model: hub.model,
                firmware: hub.firmware,
                discoveredAt: hub.discoveredAt.toISOString()
            };
            await fs.writeFile(filePath, JSON.stringify(hubData, null, 2), 'utf-8');
            console.log(`✓ Hub saved to ${filePath}`);
        } catch (error) {
            console.error('Error saving hub to file:', error);
            throw new Error(`Failed to save hub: ${(error as Error).message}`);
        }
    }

    /**
     * Load a hub from a JSON file in the /hubs directory
     */
    private async loadHubFromFile(hubName: string): Promise<DiscoveredHub | null> {
        try {
            const filePath = path.join(this.hubsDirectory, `${hubName}.json`);
            const content = await fs.readFile(filePath, 'utf-8');
            const hubData = JSON.parse(content);
            return {
                name: hubData.name,
                ip: hubData.ip,
                password: hubData.password,
                model: hubData.model,
                firmware: hubData.firmware,
                discoveredAt: new Date(hubData.discoveredAt)
            };
        } catch (error) {
            // File doesn't exist or can't be read
            return null;
        }
    }

    /**
     * Load all hubs from the /hubs directory
     */
    async loadAllHubsFromFiles(): Promise<void> {
        try {
            await this.ensureHubsDirectory();
            const files = await fs.readdir(this.hubsDirectory);
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const hubName = file.replace('.json', '');
                    const hub = await this.loadHubFromFile(hubName);
                    if (hub) {
                        this.addHub(hub);
                        console.log(`✓ Loaded hub from file: ${hubName} at ${hub.ip}`);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading hubs from files:', error);
        }
    }

    /**
     * Add a hub by scanning the network with a specific hub name/password
     */
    async addHubByName(hubName: string): Promise<{
        success: boolean;
        hub?: DiscoveredHub;
        error?: string;
    }> {
        try {
            console.log(`🔍 Scanning network for hub: ${hubName}`);
            
            // First, check if we already have this hub in a file
            const existingHub = await this.loadHubFromFile(hubName);
            if (existingHub) {
                // Try to connect to verify it's still there
                try {
                    const testClient = new PlugwiseClient({
                        host: existingHub.ip,
                        password: hubName,
                        username: 'smile'
                    });
                    
                    const gatewayInfo = await testClient.connect();
                    const updatedHub: DiscoveredHub = {
                        name: gatewayInfo.name || hubName,
                        ip: existingHub.ip,
                        password: hubName,
                        model: gatewayInfo.model,
                        firmware: gatewayInfo.version,
                        discoveredAt: new Date()
                    };
                    
                    this.addHub(updatedHub);
                    await this.saveHubToFile(hubName, updatedHub);
                    
                    return { success: true, hub: updatedHub };
                } catch (error) {
                    // Hub at saved IP is no longer accessible, scan network
                    console.log(`⚠ Hub at saved IP ${existingHub.ip} not accessible, scanning network...`);
                }
            }
            
            // Scan the network to find the hub
            const networkToScan = this.detectLocalNetwork();
            console.log(`📡 Scanning network ${networkToScan}...`);
            
            const hub = await this.scanForSpecificHub(networkToScan, hubName);
            
            if (hub) {
                this.addHub(hub);
                await this.saveHubToFile(hubName, hub);
                return { success: true, hub };
            } else {
                return { 
                    success: false, 
                    error: `Hub "${hubName}" not found on network ${networkToScan}. Please ensure the hub is connected and the name is correct.` 
                };
            }
        } catch (error) {
            return { 
                success: false, 
                error: (error as Error).message 
            };
        }
    }

    /**
     * Scan network for a specific hub by name/password
     */
    private async scanForSpecificHub(
        network: string,
        hubName: string
    ): Promise<DiscoveredHub | null> {
        const [baseIp] = network.split('/');
        const [octet1, octet2, octet3] = baseIp.split('.');
        const networkBase = `${octet1}.${octet2}.${octet3}`;

        const scanPromises: Promise<DiscoveredHub | null>[] = [];

        for (let lastOctet = 1; lastOctet <= 254; lastOctet++) {
            const ip = `${networkBase}.${lastOctet}`;

            scanPromises.push(
                (async () => {
                    try {
                        const testClient = new PlugwiseClient({
                            host: ip,
                            password: hubName,
                            username: 'smile'
                        });

                        // Set a short timeout for scanning
                        const timeoutPromise = new Promise<never>((_, reject) =>
                            setTimeout(() => reject(new Error('timeout')), 2000)
                        );

                        const gatewayInfo = await Promise.race([
                            testClient.connect(),
                            timeoutPromise
                        ]);

                        if (gatewayInfo) {
                            const hub: DiscoveredHub = {
                                name: gatewayInfo.name || hubName,
                                ip,
                                password: hubName,
                                model: gatewayInfo.model,
                                firmware: gatewayInfo.version,
                                discoveredAt: new Date()
                            };
                            console.log(`✓ Found hub at ${ip}: ${hub.name}`);
                            return hub;
                        }
                    } catch (error) {
                        // Ignore connection failures during scan
                    }
                    return null;
                })()
            );
        }

        // Wait for all scans and return the first successful result
        const results = await Promise.all(scanPromises);
        return results.find(hub => hub !== null) || null;
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
