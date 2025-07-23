# Real-time UI Synchronization System

## Overview

The UI state synchronization system ensures that the Agentic Flow interface always reflects the actual system state in real-time. This eliminates the disconnect between simulated UI data and actual swarm operations.

## Architecture

### 1. Sync Manager (`server/sync-manager.ts`)

A WebSocket server that monitors all system changes and broadcasts updates to UI clients:

- **Port**: 3007 (configurable)
- **Protocol**: WebSocket + HTTP REST API
- **Monitoring**:
  - HiveMind process output
  - Swarm memory database changes
  - System performance metrics
  - Command execution logs
  - Agent spawn/destroy events
  - Task progress updates

### 2. Real-time Store (`src/stores/realTimeStore.ts`)

Zustand store that maintains synchronized state:

```typescript
interface RealTimeSystemState {
  connected: boolean;
  swarms: SwarmState[];
  agents: AgentState[];
  tasks: TaskState[];
  memory: MemoryNamespace[];
  performance: PerformanceMetrics;
  logs: LogEntry[];
}
```

### 3. Real-time Hook (`src/hooks/useRealTimeSync.ts`)

React hook that manages WebSocket connections:

- Auto-reconnection with exponential backoff
- Connection state management
- Subscription management for different data types
- Command execution interface

## Features

### ✅ Implemented Components

#### Dashboard (`src/components/dashboard/Dashboard.tsx`)
- **Real-time metrics**: CPU, memory, token usage
- **Live agent data**: Status, tasks, performance
- **Connection indicators**: Shows sync status
- **Dynamic task counters**: Completed, active, pending

#### System Status (`src/components/dashboard/SystemStatus.tsx`)  
- **Sync status indicator**: Connected/disconnected state
- **Real-time timestamps**: Last update tracking
- **System health**: MCP, hooks, memory status

#### Metrics Display (`src/components/dashboard/MetricsDisplay.tsx`)
- **Live indicator**: Animated dot when receiving real data
- **Performance graphs**: Real CPU/memory usage
- **Token tracking**: Actual token consumption

#### Activity Log (`src/components/dashboard/ActivityLog.tsx`)
- **Real log streaming**: From sync manager
- **Component filtering**: Swarm, agent, memory, neural
- **Live status indicator**: Connection state
- **Timestamp tracking**: Last update display

#### App Status Bar (`src/App.tsx`)
- **Live sync status**: Connection indicator
- **Real agent counts**: Active vs total
- **Actual performance**: CPU, memory from system
- **Swarm status**: Based on real swarm state

### 🔄 Data Flow

1. **System Events** → Sync Manager monitors:
   - HiveMind WebSocket output
   - SQLite database changes (`.swarm/memory.db`)
   - Process logs
   - Performance metrics

2. **Sync Manager** → Processes and broadcasts:
   - Parses structured data
   - Maintains system state
   - Broadcasts to all connected clients

3. **UI Clients** → Receive updates:
   - WebSocket connection to port 3007
   - Real-time state synchronization
   - Automatic reconnection on failures

### 📡 WebSocket Messages

#### From Sync Manager to UI:
```javascript
// Initial state on connection
{ type: 'initial-state', data: { swarms, agents, tasks, ... } }

// Real-time updates
{ type: 'swarm-update', data: { action: 'created|updated', data: swarm } }
{ type: 'agent-update', data: { action: 'created|updated', data: agent } }
{ type: 'task-update', data: { action: 'created|updated', data: task } }
{ type: 'performance-update', data: performanceMetrics }
{ type: 'log-update', data: { filename, line, timestamp } }
{ type: 'system-update', data: { component, status, timestamp } }
```

#### From UI to Sync Manager:
```javascript
// Subscriptions
{ type: 'subscribe', entityType: 'swarm|agent|task', entityId?: 'id' }
{ type: 'unsubscribe', entityType: 'swarm|agent|task', entityId?: 'id' }

// Commands
{ type: 'command', command: 'get-state', data: {}, requestId: 'uuid' }
```

## Usage

### 1. Start the Backend
```bash
# Start sync manager only
npm run dev:backend

# Start both UI and backend
npm run dev:full
```

### 2. UI Integration

Components automatically connect to the sync manager and display real-time data:

```tsx
import useRealTimeSync from '../hooks/useRealTimeSync';
import useRealTimeStore from '../stores/realTimeStore';

function MyComponent() {
  const { connected, agents, performance } = useRealTimeStore();
  const { connecting, error } = useRealTimeSync({ autoConnect: true });
  
  return (
    <div>
      {!connected && <div>Connecting to sync manager...</div>}
      <div>Active agents: {agents.length}</div>
      <div>CPU: {performance.cpu}%</div>
    </div>
  );
}
```

## Error Handling

### Connection Failures
- Automatic reconnection with exponential backoff
- Visual indicators in UI
- Graceful fallback to simulated data
- Toast notifications for connection issues

### Data Inconsistency
- Timestamp-based conflict resolution
- Full state synchronization on reconnect
- Memory persistence for offline periods
- Validation of incoming data

### Process Management
- Auto-restart of HiveMind process
- Health monitoring of all components
- Error logging and reporting
- Recovery mechanisms for failed states

## Configuration

### Sync Manager Settings
```typescript
const config = {
  port: 3007,                    // WebSocket server port
  hiveMindPort: 3006,           // HiveMind connection port
  reconnectInterval: 5000,       // Reconnection delay (ms)
  maxReconnectAttempts: 10,     // Max auto-reconnects
  performanceUpdateInterval: 2000 // Performance metrics frequency
};
```

### UI Settings
```typescript
const syncOptions = {
  url: 'localhost',
  port: 3007,
  autoConnect: true,
  reconnectInterval: 3000,
  maxReconnectAttempts: 10
};
```

## Development

### Adding New Real-time Data

1. **Monitor the source** in `sync-manager.ts`:
   ```typescript
   private watchNewDataSource(): void {
     // Monitor file/process/API
     // Parse relevant events
     // Broadcast updates
   }
   ```

2. **Update the store** in `realTimeStore.ts`:
   ```typescript
   // Add new state properties
   // Handle update types in handleUpdate()
   ```

3. **Use in components**:
   ```tsx
   const { newData } = useRealTimeStore();
   // Display real data instead of mocked
   ```

## Testing

### Local Development
```bash
# Terminal 1: Start HiveMind
npx claude-flow@alpha swarm init --topology hierarchical

# Terminal 2: Start sync manager
npm run dev:backend

# Terminal 3: Start UI
npm run dev

# Terminal 4: Test sync
npx claude-flow@alpha agent spawn --type researcher
npx claude-flow@alpha task orchestrate --task "test synchronization"
```

### Monitoring Sync
- Check browser console for WebSocket connection logs
- Monitor sync manager console for system events
- Use browser dev tools to inspect WebSocket messages
- Check `.swarm/memory.db` for persisted state

## Benefits

1. **Accurate State Display**: UI shows real system state, not simulations
2. **Real-time Updates**: Changes reflected immediately across all clients  
3. **Better Debugging**: See actual agent behavior and task progress
4. **Improved UX**: Users see genuine system activity
5. **Production Ready**: Handles failures, reconnections, and scale

## Future Enhancements

- [ ] Multi-user synchronization
- [ ] Historical state playback
- [ ] Advanced filtering and subscriptions
- [ ] Performance optimization for large swarms
- [ ] Integration with external monitoring systems
- [ ] REST API endpoints for external integrations
- [ ] Authentication and authorization
- [ ] Rate limiting and throttling

---

**Status**: ✅ Implemented and Integrated
**Version**: 2.0.0
**Last Updated**: 2025-07-22