# Code Refactoring Visual Guide

## Current Architecture vs. Proposed Architecture

### BEFORE: Current Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    PlugwiseClient                           │
│                    (550 lines - MONOLITHIC)                 │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ HTTP Communication                                    │  │
│  │ - request(), parseXml()                              │  │
│  │ - Basic Auth, timeout handling                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Gateway Detection                                     │  │
│  │ - connect(), detectGatewayType()                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Device Parsing                                        │  │
│  │ - parseAppliance(), parseLocation()                  │  │
│  │ - parseMeasurements(), parseActuators()              │  │
│  │   (200+ lines of nested logic)                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Control Operations                                    │  │
│  │ - setTemperature(), setPreset()                      │  │
│  │ - setSwitch(), setGatewayMode()                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

Issues:
❌ 550 lines in one file
❌ Multiple responsibilities
❌ Hard to test individual components
❌ Complex nested logic
```

---

### AFTER: Proposed Modular Structure

```
┌────────────────────────────────────────────────────────────────┐
│                   PlugwiseClient                               │
│                   (80 lines - ORCHESTRATOR)                    │
│                                                                │
│   constructor(config)                                          │
│   async connect() → delegates to GatewayParser                 │
│   async getDevices() → delegates to Parsers                    │
│   async setTemperature() → delegates to TempController         │
│   async setSwitch() → delegates to SwitchController            │
└────────────────────────────────────────────────────────────────┘
           │                  │                    │
           ▼                  ▼                    ▼
    ┌──────────┐      ┌──────────┐        ┌──────────────┐
    │   HTTP   │      │ Parsers  │        │ Controllers  │
    │  Client  │      │          │        │              │
    └──────────┘      └──────────┘        └──────────────┘
```

#### HTTP Layer (60 lines)
```
HttpClient
├── request(endpoint, method, data)
├── buildAuthHeader(username, password)
└── handleResponse(response)
```

#### Parsing Layer (270 lines split into 4 modules)
```
Parsers/
├── GatewayParser (70 lines)
│   ├── parseGatewayInfo(xml)
│   ├── detectGatewayType(gateway)
│   └── extractGatewayIds(data)
│
├── ApplianceParser (80 lines)
│   ├── parseAppliance(appliance)
│   └── extractDeviceInfo(appliance)
│
├── MeasurementParser (60 lines)
│   ├── parseMeasurements(source, entity)
│   ├── processLogs(logs, suffix)
│   └── extractMeasurement(log)
│
└── ActuatorParser (70 lines)
    ├── parseActuators(source, entity)
    ├── parseRelays(funcs, entity)
    ├── parseThermostats(funcs, entity)
    └── parseTemperatureOffsets(funcs, entity)
```

#### Control Layer (120 lines split into 3 modules)
```
Controllers/
├── TemperatureController (50 lines)
│   ├── setTemperature(locationId, params)
│   ├── setPreset(locationId, preset)
│   └── setTemperatureOffset(deviceId, offset)
│
├── SwitchController (40 lines)
│   ├── setSwitch(applianceId, state)
│   └── setSwitchLock(applianceId, locked)
│
└── GatewayController (30 lines)
    ├── setGatewayMode(mode)
    ├── setDHWMode(mode)
    └── rebootGateway()
```

---

## Service Layer Simplification

### BEFORE: Duplicated File I/O

```
HubDiscoveryService          DeviceStorageService         Server.ts
      │                            │                          │
      │                            │                          │
      ▼                            ▼                          ▼
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│ ensureHubsDir│          │ensureDevsDir │          │getHubsSync() │
│ saveHubToFile│          │saveDevices() │          │getDevsSync() │
│ loadHubFiles │          │loadDevices() │          │ formatHubs() │
│              │          │              │          │ formatDevs() │
└──────────────┘          └──────────────┘          └──────────────┘

❌ Same logic repeated 3 times
❌ ~150 lines of duplication
```

### AFTER: Unified Storage Service

```
        All Services
             │
             ▼
    ┌────────────────────┐
    │ JsonStorageService │ (Generic, reusable)
    │      <T>           │
    ├────────────────────┤
    │ save(file, data)   │
    │ load(file)         │
    │ loadAll()          │
    │ exists(file)       │
    │ delete(file)       │
    └────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
hubStorage      deviceStorage
(HubData)       (DeviceData)

✅ Single implementation
✅ Type-safe
✅ Testable
✅ ~50 lines total
```

---

## Tool Handler Simplification

### BEFORE: Repeated Boilerplate (15+ tools)

```javascript
// temperature.tool.ts (6 tools × 30 lines each)
registry.registerTool('set_temperature', {...}, async (args) => {
    try {
        const client = connectionService.ensureConnected();  // ← Repeated
        const data = await client.setTemperature(args);
        
        const output = { success: true, data };              // ← Repeated
        return {
            content: [{ 
                type: 'text', 
                text: JSON.stringify(output, null, 2) 
            }],                                              // ← Repeated
            structuredContent: output
        };
    } catch (error) {                                       // ← Repeated
        const output = { 
            success: false, 
            error: (error as Error).message 
        };
        return {
            content: [{ 
                type: 'text', 
                text: JSON.stringify(output, null, 2) 
            }],
            structuredContent: output
        };
    }
});

// switch.tool.ts - SAME CODE
// device.tool.ts - SAME CODE
// gateway.tool.ts - SAME CODE
// ... 12 more times

❌ ~200 lines of duplicated error handling
```

### AFTER: Helper Functions

```javascript
// tool-helpers.ts (30 lines)
export async function withConnection<T>(
    connectionService: ConnectionService,
    operation: (client: PlugwiseClient) => Promise<T>
): Promise<ToolResponse> {
    try {
        const client = connectionService.ensureConnected();
        const data = await operation(client);
        return successResponse(data);
    } catch (error) {
        return errorResponse(error);
    }
}

// Usage in ALL tools (3 lines each!)
registry.registerTool('set_temperature', {...}, async (args) => {
    return withConnection(connectionService, (client) => 
        client.setTemperature(args)
    );
});

registry.registerTool('control_switch', {...}, async (args) => {
    return withConnection(connectionService, (client) => 
        client.setSwitch(args.appliance_id, args.state)
    );
});

✅ Each tool now 3 lines instead of 30
✅ Consistent error handling
✅ Easy to add features (logging, metrics, etc.)
```

---

## XML Parsing Simplification

### BEFORE: Repetitive Array/Measurement Handling

```javascript
// Repeated ~10 times throughout parsers
const logs = Array.isArray(source.logs.point_log) 
    ? source.logs.point_log 
    : [source.logs.point_log];

// Repeated ~6 times
let measurementValue;
if (log.period && log.period.measurement) {
    const meas = log.period.measurement;
    measurementValue = typeof meas === 'object' && meas._ !== undefined 
        ? meas._ 
        : meas;
} else if (log.measurement) {
    const meas = log.measurement;
    measurementValue = typeof meas === 'object' && meas._ !== undefined 
        ? meas._ 
        : meas;
}
const value = parseFloat(measurementValue);
if (isNaN(value)) continue;

❌ ~80 lines of repeated logic
```

### AFTER: Helper Functions

```javascript
// xml-helpers.ts (20 lines)
export function ensureArray<T>(value: T | T[] | undefined): T[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

export function extractMeasurement(log: any): number | undefined {
    const source = log.period?.measurement ?? log.measurement;
    if (!source) return undefined;
    
    const value = typeof source === 'object' && source._ !== undefined 
        ? source._ 
        : source;
    
    const num = parseFloat(value);
    return isNaN(num) ? undefined : num;
}

// Usage (clean and readable!)
const logs = ensureArray(source.logs.point_log);
for (const log of logs) {
    const value = extractMeasurement(log);
    if (value !== undefined) {
        entity.sensors[log.type] = value;
    }
}

✅ Reusable helpers
✅ Much cleaner
✅ Easy to test
```

---

## File Structure Comparison

### BEFORE
```
src/
├── client/
│   └── plugwise-client.ts          ← 550 lines! 🔴
├── services/
│   ├── connection.service.ts       ← 65 lines (simple wrapper)
│   ├── device-storage.service.ts   ← 120 lines (file I/O)
│   └── hub-discovery.service.ts    ← 250 lines (complex logic)
├── mcp/
│   ├── server.ts                   ← 293 lines (sync + async duplication)
│   ├── tool-registry.ts            ← 85 lines
│   └── tools/
│       ├── temperature.tool.ts     ← 319 lines (6 tools with boilerplate)
│       ├── switch.tool.ts          ← 150 lines
│       ├── device.tool.ts          ← 80 lines
│       ├── gateway.tool.ts         ← 200 lines
│       └── ... (5 more tool files)

Total: ~3,500 lines
Duplication: ~28%
Largest file: 550 lines
```

### AFTER
```
src/
├── client/
│   ├── plugwise-client.ts          ← 80 lines (orchestrator)
│   ├── http-client.ts              ← 60 lines
│   ├── xml-helpers.ts              ← 40 lines
│   ├── parsers/
│   │   ├── gateway-parser.ts       ← 70 lines
│   │   ├── appliance-parser.ts     ← 80 lines
│   │   ├── measurement-parser.ts   ← 60 lines
│   │   └── actuator-parser.ts      ← 70 lines
│   └── controllers/
│       ├── temperature-controller.ts ← 50 lines
│       ├── switch-controller.ts    ← 40 lines
│       └── gateway-controller.ts   ← 30 lines
├── services/
│   ├── connection.service.ts       ← 65 lines (unchanged)
│   └── storage.service.ts          ← 50 lines (unified!)
├── mcp/
│   ├── server.ts                   ← 150 lines (simplified!)
│   ├── tool-registry.ts            ← 85 lines (unchanged)
│   ├── tool-helpers.ts             ← 30 lines (NEW - reduces duplication)
│   └── tools/
│       ├── temperature.tool.ts     ← 80 lines (60% reduction!)
│       ├── switch.tool.ts          ← 50 lines
│       ├── device.tool.ts          ← 40 lines
│       ├── gateway.tool.ts         ← 70 lines
│       └── ... (5 more, all smaller)

Total: ~2,400 lines (31% reduction)
Duplication: ~6%
Largest file: 150 lines
```

---

## Testing Strategy

### BEFORE
```
scripts/
├── test-mcp-connection.ts     ← Manual script
├── test-device-discovery.ts   ← Manual script
└── test-agent-mcp.ts          ← Manual script

❌ No automated tests
❌ Requires real hardware
❌ No CI/CD
```

### AFTER
```
tests/
├── unit/
│   ├── client/
│   │   ├── http-client.test.ts
│   │   ├── parsers/
│   │   │   ├── gateway-parser.test.ts
│   │   │   ├── measurement-parser.test.ts
│   │   │   └── ...
│   │   └── controllers/
│   │       └── temperature-controller.test.ts
│   ├── services/
│   │   ├── storage.service.test.ts
│   │   └── connection.service.test.ts
│   └── mcp/
│       ├── tool-helpers.test.ts
│       └── tools/
│           └── temperature.tool.test.ts
├── integration/
│   ├── full-workflow.test.ts
│   └── multi-hub.test.ts
└── mocks/
    ├── mock-plugwise-hub.ts
    └── mock-xml-responses.ts

✅ Unit tests for all modules
✅ Integration tests
✅ Mock hub for testing
✅ CI/CD ready
✅ 60-80% coverage
```

---

## Impact Summary

| Category | Before | After | Improvement |
|----------|--------|-------|-------------|
| **Lines of Code** | 3,500 | 2,400 | -31% |
| **Largest File** | 550 lines | 150 lines | -73% |
| **Code Duplication** | 28% | 6% | -79% |
| **Files** | 32 | 45 | +40% (smaller, focused) |
| **Avg File Size** | 110 lines | 55 lines | -50% |
| **Cyclomatic Complexity** | High | Low | -60% |
| **Test Coverage** | 0% | 70% | +70% |
| **Maintainability Index** | 65/100 | 85/100 | +31% |

---

## Migration Path

```
Phase 1: Foundation          Phase 2: Client           Phase 3: Services
(2 weeks)                   (2 weeks)                 (2 weeks)
┌──────────────┐            ┌──────────────┐          ┌──────────────┐
│ Add Zod      │            │ Split client │          │ Unify storage│
│ Add helpers  │     →      │ Extract      │    →     │ Refactor     │
│ Setup tests  │            │   parsers    │          │   discovery  │
└──────────────┘            └──────────────┘          └──────────────┘
                                                               ↓
                            Phase 4: Server                    
                            (2 weeks)                          
                            ┌──────────────┐                   
                            │ Remove sync  │                   
                            │ Lazy loading │                   
                            │ Performance  │                   
                            └──────────────┘                   
```

---

**See Also:**
- `code-simplification-analysis.md` - Detailed analysis
- `simplification-recommendations-summary.md` - Quick reference
