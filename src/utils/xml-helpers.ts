/**
 * XML Helper Utilities
 * Common functions for XML parsing and manipulation
 */

/**
 * Ensure a value is an array
 * Handles XML parsing results that may be single objects or arrays
 */
export function ensureArray<T>(value: T | T[] | undefined): T[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

/**
 * Extract measurement value from XML log entry
 * Handles both period.measurement and direct measurement
 */
export function extractMeasurement(log: any): number | undefined {
    const source = log.period?.measurement ?? log.measurement;
    if (!source) return undefined;
    
    const value = typeof source === 'object' && source._ !== undefined 
        ? source._ 
        : source;
    
    const num = parseFloat(value);
    return isNaN(num) ? undefined : num;
}

/**
 * Extract text value from XML element
 */
export function getXmlValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
        if (current === undefined || current === null) return undefined;
        current = current[part];
    }
    return current;
}

/**
 * Parse boolean from XML value
 */
export function parseXmlBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        return value.toLowerCase() === 'true' || value === '1';
    }
    return Boolean(value);
}

/**
 * Parse number from XML value
 */
export function parseXmlNumber(value: any): number | undefined {
    if (typeof value === 'number') return value;
    const num = parseFloat(value);
    return isNaN(num) ? undefined : num;
}
