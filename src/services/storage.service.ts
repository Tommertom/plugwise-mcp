/**
 * Generic JSON Storage Service
 * Unified file storage for hubs, devices, and other data
 */

import { promises as fs } from 'fs';
import * as path from 'path';

export class JsonStorageService<T> {
    private baseDirectory: string;

    constructor(subdirectory: string) {
        this.baseDirectory = path.join(process.cwd(), 'mcp_data', 'plugwise', subdirectory);
        this.ensureDirectory();
    }

    /**
     * Ensure the storage directory exists
     */
    private async ensureDirectory(): Promise<void> {
        try {
            await fs.mkdir(this.baseDirectory, { recursive: true });
        } catch (error) {
            console.error(`Error creating directory ${this.baseDirectory}:`, error);
        }
    }

    /**
     * Save data to a JSON file
     */
    async save(filename: string, data: T): Promise<void> {
        try {
            await this.ensureDirectory();
            const filePath = this.getFilePath(filename);
            await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (error) {
            throw new Error(`Failed to save ${filename}: ${(error as Error).message}`);
        }
    }

    /**
     * Load data from a JSON file
     */
    async load(filename: string): Promise<T | null> {
        try {
            const filePath = this.getFilePath(filename);
            const content = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(content) as T;
        } catch (error) {
            return null;
        }
    }

    /**
     * Load all JSON files in the directory
     */
    async loadAll(): Promise<Map<string, T>> {
        const items = new Map<string, T>();
        
        try {
            await this.ensureDirectory();
            const files = await fs.readdir(this.baseDirectory);
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const name = file.replace('.json', '');
                    const data = await this.load(name);
                    if (data) {
                        items.set(name, data);
                    }
                }
            }
        } catch (error) {
            console.error(`Error loading all from ${this.baseDirectory}:`, error);
        }
        
        return items;
    }

    /**
     * Check if a file exists
     */
    async exists(filename: string): Promise<boolean> {
        try {
            const filePath = this.getFilePath(filename);
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Delete a file
     */
    async delete(filename: string): Promise<void> {
        try {
            const filePath = this.getFilePath(filename);
            await fs.unlink(filePath);
        } catch (error) {
            throw new Error(`Failed to delete ${filename}: ${(error as Error).message}`);
        }
    }

    /**
     * List all filenames (without .json extension)
     */
    async list(): Promise<string[]> {
        try {
            await this.ensureDirectory();
            const files = await fs.readdir(this.baseDirectory);
            return files
                .filter(f => f.endsWith('.json'))
                .map(f => f.replace('.json', ''));
        } catch (error) {
            console.error(`Error listing files in ${this.baseDirectory}:`, error);
            return [];
        }
    }

    /**
     * Get the full file path for a filename
     */
    private getFilePath(filename: string): string {
        const safeFilename = filename.endsWith('.json') ? filename : `${filename}.json`;
        return path.join(this.baseDirectory, safeFilename);
    }
}
