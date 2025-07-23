# Agentic Flow UI v2.0 - Real Integration

This is the complete Agentic Flow UI with **real backend integration** to HiveMind and Mastra systems.

## 🚀 Features

- **Real HiveMind Integration**: Direct connection to claude-flow CLI and HiveMind system
- **Real Mastra Integration**: Native integration with Mastra agents, workflows, and tools  
- **WebSocket Real-time Updates**: Live updates from running swarms and agents
- **REST API**: Full REST API for all operations
- **Fallback Mode**: Graceful degradation when services are unavailable

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React UI      │    │  Backend Server │    │   HiveMind      │
│   (Port 5173)   │◄──►│   (Port 3001)   │◄──►│   System        │
│                 │    │                 │    │                 │
│  - Dashboard    │    │  - REST API     │    │  - Swarms       │
│  - Swarm View   │    │  - WebSocket    │    │  - Agents       │
│  - Agent Cards  │    │  - Integration  │    │  - Memory       │
│  - Real-time    │    │  - Fallback     │    │  - Tasks        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Mastra        │
                       │   System        │
                       │                 │
                       │  - Agents       │
                       │  - Workflows    │
                       │  - Tools        │
                       └─────────────────┘
```

## 🛠️ Setup

### Prerequisites

1. Node.js 18+ installed
2. Claude Flow CLI available (`npx claude-flow@alpha`)
3. Access to the HiveMind system

### Installation

```bash
# Install all dependencies (UI + Server)
npm run setup

# Or install separately
npm install              # UI dependencies
npm run server:install   # Server dependencies
```

## 🏃‍♂️ Running the System

### Development Mode (Full Stack)

```bash
# Run both UI and backend server concurrently
npm run dev:full
```

This starts:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **WebSocket**: ws://localhost:3001

### Separate Processes

```bash
# Terminal 1: Start backend server
npm run dev:backend

# Terminal 2: Start UI
npm run dev
```

### Production Build

```bash
# Build everything
npm run build:full

# Or build separately
npm run build:server  # Server build
npm run build        # UI build
```

## 🔌 API Endpoints

### Health & Status
- `GET /health` - Server health check
- `GET /api/docs` - API documentation
- `GET /api/status` - Full system status

### Swarm Operations
- `POST /api/swarm/init` - Initialize new swarm
- `GET /api/swarm/status` - Get swarm status
- `DELETE /api/swarm/:id` - Destroy swarm

### Agent Operations  
- `POST /api/agents/spawn` - Spawn new agent
- `GET /api/agents` - List all agents
- `GET /api/agents/metrics` - Agent performance

### Task Operations
- `POST /api/tasks/orchestrate` - Create and orchestrate task
- `GET /api/tasks/status` - Get task status
- `GET /api/tasks/:id/results` - Get task results

### Memory Operations
- `POST /api/memory/store` - Store memory entry
- `GET /api/memory/retrieve` - Retrieve memory entry
- `GET /api/memory/search` - Search memory

### Mastra Operations
- `GET /api/mastra/agents` - Get Mastra agents
- `POST /api/mastra/agents/:id/run` - Run Mastra agent
- `GET /api/mastra/workflows` - Get workflows
- `POST /api/mastra/workflows/:id/run` - Run workflow
- `GET /api/mastra/tools` - Get available tools
- `POST /api/mastra/tools/:name/execute` - Execute tool

## 🔄 WebSocket Events

### Client → Server
- `subscribe:swarm` - Subscribe to swarm updates
- `subscribe:agent` - Subscribe to agent updates
- `subscribe:task` - Subscribe to task updates
- `action:init-swarm` - Initialize swarm
- `action:spawn-agent` - Spawn agent
- `action:orchestrate-task` - Create task
- `action:run-mastra-agent` - Run Mastra agent
- `action:run-mastra-workflow` - Run workflow

### Server → Client
- `swarm:update` - Swarm state changes
- `agent:update` - Agent state changes
- `task:update` - Task progress updates  
- `system:heartbeat` - System status (every 30s)
- `mastra:agent:executed` - Mastra agent results
- `mastra:workflow:executed` - Workflow results

## 🧠 Real Integration Details

### HiveMind Integration
- **Direct CLI Integration**: Spawns `npx claude-flow@alpha` processes
- **Real Database**: Connects to existing SQLite databases
- **Memory System**: Uses real HiveMind memory bank
- **Swarm Coordination**: Actual swarm topology management

### Mastra Integration  
- **HTTP API**: Connects to Mastra server (port 4111)
- **Real Agents**: Uses actual Mastra agent definitions
- **Live Workflows**: Executes real workflow steps
- **Tool Execution**: Calls actual Mastra tools
- **Fallback Mode**: Mock responses when server unavailable

## 🔧 Configuration

### Environment Variables

```bash
# Backend server port (default: 3001)
PORT=3001

# UI dev server port (default: 5173)  
UI_PORT=5173

# Mastra server port (default: 4111)
MASTRA_PORT=4111

# Mastra base URL
MASTRA_BASE_URL=http://localhost:4111
```

### Backend Configuration

The backend automatically detects and connects to:
- HiveMind database at `../data/hive-mind.db`
- Memory system at `../memory/`
- Claude Flow CLI via `npx claude-flow@alpha`
- Mastra server at configured port

## 🚨 Error Handling

### Graceful Degradation
- **HiveMind Unavailable**: Shows error states, disables swarm features
- **Mastra Unavailable**: Runs in fallback mode with mock data
- **WebSocket Disconnected**: Auto-reconnection with exponential backoff
- **API Failures**: Graceful error messages and retry mechanisms

### Monitoring
- Real-time connection status indicators
- System health monitoring
- Performance metrics tracking
- Error logging and reporting

## 🔍 Debugging

### Backend Logs
```bash
# Start server with verbose logging
DEBUG=* npm run dev:backend
```

### Frontend Debug
- Open browser dev tools
- Check WebSocket connection in Network tab
- Monitor API calls in Console

### Health Checks
- Backend: http://localhost:3001/health
- API Status: http://localhost:3001/api/status
- WebSocket: Connect to ws://localhost:3001

## 📝 Development Notes

### Code Structure
```
server/
├── index.ts              # Main server entry point
├── hive-integration.ts   # HiveMind system integration  
├── mastra-integration.ts # Mastra system integration
├── routes.ts             # REST API routes
├── websocket.ts          # WebSocket server setup
├── package.json          # Server dependencies
└── tsconfig.json         # TypeScript config

src/api/
├── hive-client.ts        # HiveMind client (updated for real backend)
├── websocket.ts          # WebSocket client (updated for real backend)
└── ...
```

### Key Integration Points
1. **CLI Spawning**: Uses Node.js `child_process` to run claude-flow commands
2. **Database Access**: Direct SQLite connection to HiveMind data
3. **HTTP Fallback**: REST API calls when WebSocket unavailable  
4. **Event Forwarding**: Real-time updates from integrations to UI
5. **Error Recovery**: Automatic retry and fallback mechanisms

This implementation provides a **complete, production-ready integration** between the Agentic Flow UI and the real HiveMind/Mastra backend systems.