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
            console.log(`\n${'='.repeat(80)}`);
            console.log(`🔍 ADD HUB: ${hubName}`);
            console.log(`${'='.repeat(80)}\n`);

            // First, check if we already have this hub in a file
            console.log(`📁 Checking for saved hub configuration...`);
            const existingHub = await this.loadHubFromFile(hubName);
            if (existingHub) {
                console.log(`✓ Found saved hub at ${existingHub.ip}`)
                console.log(`🔌 Verifying connection to saved IP...`);
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

                    console.log(`✅ Connection successful!`);
                    console.log(`   Hub: ${updatedHub.name} (${updatedHub.model})`);
                    console.log(`   IP: ${updatedHub.ip}`);
                    console.log(`   Firmware: ${updatedHub.firmware}\n`);

                    this.addHub(updatedHub);
                    await this.saveHubToFile(hubName, updatedHub);

                    return { success: true, hub: updatedHub };
                } catch (error) {
                    // Hub at saved IP is no longer accessible, scan network
                    console.log(`⚠️  Hub at saved IP ${existingHub.ip} not accessible: ${(error as Error).message}`);
                    console.log(`   Proceeding to network scan...\n`);
                }
            } else {
                console.log(`ℹ️  No saved configuration found\n`);
            }

            // Scan the network to find the hub
            const networkToScan = this.detectLocalNetwork();
            console.log(`📡 Network to scan: ${networkToScan}\n`);

            const hub = await this.scanForSpecificHub(networkToScan, hubName);

            if (hub) {
                this.addHub(hub);
                await this.saveHubToFile(hubName, hub);
                console.log(`\n✅ Hub successfully added and saved!\n`);
                return { success: true, hub };
            } else {
                const errorMsg = `Hub "${hubName}" not found on network ${networkToScan}. Please ensure the hub is connected and the name is correct.`;
                console.log(`\n❌ ${errorMsg}\n`);
                return {
                    success: false,
                    error: errorMsg
                };
            }
        } catch (error) {
            const errorMsg = (error as Error).message;
            console.log(`\n❌ Error: ${errorMsg}\n`);
            return {
                success: false,
                error: errorMsg
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

        console.log(`🔍 Starting network scan on ${networkBase}.1-254 for hub: ${hubName}`);
        console.log(`⏱️  Timeout per IP: 3 seconds`);
        console.log(`📊 Total IPs to scan: 254`);

        let foundHub: DiscoveredHub | null = null;
        let scannedCount = 0;
        let activeScans = 0;
        const startTime = Date.now();

        const scanPromises: Promise<DiscoveredHub | null>[] = [];

        for (let lastOctet = 1; lastOctet <= 254; lastOctet++) {
            const ip = `${networkBase}.${lastOctet}`;

            scanPromises.push(
                (async () => {
                    // Early exit if hub already found
                    if (foundHub) {
                        return null;
                    }

                    activeScans++;
                    try {
                        const testClient = new PlugwiseClient({
                            host: ip,
                            password: hubName,
                            username: 'smile'
                        });

                        // Increased timeout from 2s to 3s for better reliability
                        const timeoutPromise = new Promise<never>((_, reject) =>
                            setTimeout(() => reject(new Error('timeout')), 3000)
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

                            if (!foundHub) {
                                foundHub = hub;
                                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                                console.log(`✅ SUCCESS! Found hub at ${ip}: ${hub.name} (${hub.model})`);
                                console.log(`   Firmware: ${hub.firmware}`);
                                console.log(`   Scan time: ${elapsed}s, IPs checked: ${scannedCount}`);
                            }
                            return hub;
                        }
                    } catch (error) {
                        // Log detailed errors for debugging
                        const errorMsg = (error as Error).message;
                        if (errorMsg !== 'timeout' && !errorMsg.includes('ECONNREFUSED') && !errorMsg.includes('ETIMEDOUT')) {
                            console.log(`   ⚠️  ${ip}: ${errorMsg}`);
                        }
                    } finally {
                        activeScans--;
                        scannedCount++;

                        // Progress logging every 50 IPs
                        if (scannedCount % 50 === 0) {
                            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                            console.log(`   📊 Progress: ${scannedCount}/254 IPs scanned (${elapsed}s elapsed, ${activeScans} active)`);
                        }
                    }
                    return null;
                })()
            );
        }

        // Wait for all scans to complete or hub to be found
        const results = await Promise.all(scanPromises);

        const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        if (foundHub) {
            console.log(`🎉 Scan completed successfully in ${totalElapsed}s`);
            return foundHub;
        } else {
            console.log(`❌ Scan completed - no hub found in ${totalElapsed}s`);
            console.log(`   Scanned ${scannedCount} IPs on network ${networkBase}.0/24`);
            return null;
        }
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
            // Strategy 1: Try to get default route network
            const defaultRoute = execSync('ip route | grep default | head -1', { encoding: 'utf-8' });
            const srcMatch = defaultRoute.match(/src (\d+\.\d+\.\d+\.\d+)/);

            if (srcMatch) {
                const ip = srcMatch[1];
                const [octet1, octet2, octet3] = ip.split('.');
                const network = `${octet1}.${octet2}.${octet3}.0/24`;
                console.log(`📡 Detected network from default route: ${network}`);
                return network;
            }

            // Strategy 2: Try scope link (but skip VPN interfaces)
            const routeOutput = execSync('ip route | grep "scope link" | grep -v tun | grep -v tap | head -1', { encoding: 'utf-8' });
            const match = routeOutput.match(/(\d+\.\d+\.\d+\.\d+\/\d+)/);
            if (match) {
                console.log(`📡 Detected network from scope link: ${match[1]}`);
                return match[1];
            }
        } catch (error) {
            console.log(`⚠️  Network detection failed, using fallback: 192.168.1.0/24`);
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
