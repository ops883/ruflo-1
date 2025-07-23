# 🚀 Agentic-Flow UI - Complete Integration Guide

## 🎯 What's Been Implemented

The UI is now **fully integrated** with the real agentic-flow system:

- ✅ **Real HiveMind Integration** - Actual swarm management
- ✅ **Real Mastra AI Agents** - Live agent execution  
- ✅ **Real Terminal** - Full shell integration with node-pty
- ✅ **Real MCP Tools** - 71+ actual tool execution
- ✅ **Real-time Sync** - Live system state monitoring

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd /workspaces/claude-code-flow/ui/agentic-flow
npm install
```

### 2. Start the Full System
```bash
# Option 1: Full stack (recommended)
npm run dev:full

# Option 2: Start components separately
npm run dev:backend    # Start backend services
npm run dev           # Start UI (in another terminal)
```

### 3. Access Points
- **UI**: http://localhost:5173
- **Backend API**: http://localhost:3001  
- **Sync Manager**: ws://localhost:3007
- **Terminal**: WebSocket via UI
- **MCP Tools**: Integrated via backend

## 🎮 How to Use

### Dashboard
- Shows **real swarm status** from HiveMind
- Displays **actual agent metrics** and performance
- **Live activity log** from real system events
- **System health** indicators

### Swarm Management
- **Spawn real agents** using HiveMind system
- **Submit actual tasks** to swarm orchestrator
- **Visualize live topology** with agent connections
- **Monitor real-time progress** and coordination

### Terminal
- **Full shell access** with real command execution
- **Claude-flow commands** work natively
- **ANSI color support** and terminal features
- **Real-time I/O** via WebSocket

### MCP Tools
- **71+ real tools** from Claude-flow system
- **Parameter validation** and dynamic forms
- **Live execution** with progress tracking
- **Real results** from actual tool invocations

### Memory Explorer
- **Real database contents** from memory.db
- **Live memory usage** statistics
- **Session history** and search

## 🔧 Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   UI (React)    │◄──►│  Backend API    │◄──►│  HiveMind Core  │
│  localhost:5173 │    │ localhost:3001  │    │   Real System   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Sync Manager   │◄──►│ Terminal Handler│◄──►│  Mastra Agents  │
│ localhost:3007  │    │   (node-pty)    │    │  Real Execution │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Development

### Backend Services
- **Express Server** (port 3001) - REST API for all operations
- **WebSocket Server** (port 3001) - Real-time bidirectional communication  
- **Sync Manager** (port 3007) - System state monitoring and broadcasting
- **Terminal Handler** - Real shell processes via node-pty
- **MCP Handler** - Direct Claude-flow CLI integration

### Real System Integration
- **HiveMind**: Uses actual `/src/hive-mind/core/HiveMind.ts`
- **Mastra**: HTTP connection to real Mastra server (port 4111)
- **MCP Tools**: Direct CLI execution of `claude-flow` commands
- **Database**: Real SQLite connections to `memory.db` and `hive.db`
- **Terminal**: Real shell sessions via `node-pty`

## 🎯 Testing Real Integration

### 1. Test HiveMind Integration
```bash
# In Terminal tab of UI:
claude-flow swarm init --topology mesh
claude-flow agent spawn --type researcher
claude-flow task orchestrate --task "test real swarm"
```

### 2. Test MCP Tools
- Go to MCP Tools tab
- Select a tool (e.g., "swarm_status")
- Execute and see real results

### 3. Test Real-time Sync
- Open Dashboard
- Run commands in Terminal
- Watch real-time updates in Dashboard

## 🔍 Verification

The system is working correctly when you see:

### Dashboard
- **Real agent cards** with actual status
- **Live metrics** updating automatically
- **Connection indicators** showing "Connected"
- **Activity log** showing real system events

### Swarm View  
- **Agent spawning** creates real HiveMind agents
- **Topology visualization** reflects actual connections
- **Task submission** runs through real orchestrator

### Terminal
- **Real shell prompt** (not mock)
- **Actual command output** with colors
- **File system operations** work normally
- **Claude-flow commands** execute successfully

### MCP Tools
- **Tool discovery** finds 71+ real tools
- **Execution results** show actual data
- **Performance metrics** show real timing

## 🚨 Troubleshooting

### Backend Not Starting
```bash
# Check if ports are free
lsof -i :3001
lsof -i :3007

# Kill any conflicting processes
pkill -f "node.*server"
```

### Terminal Not Working
- Ensure `node-pty` is installed: `npm install node-pty`
- Check WebSocket connection in browser dev tools
- Verify backend logs for terminal handler errors

### MCP Tools Not Loading
- Verify Claude-flow is in PATH: `which claude-flow`
- Check backend logs for CLI execution errors
- Test CLI manually: `npx claude-flow@alpha help`

### Real-time Updates Not Working
- Check Sync Manager WebSocket connection
- Verify file system permissions for database access
- Check browser console for connection errors

## 🎉 Success!

You now have a **fully functional Agentic-Flow UI** with:
- Real HiveMind swarm management
- Actual Mastra AI agent execution
- Working terminal with full shell access
- 71+ real MCP tools
- Live system state synchronization

The UI provides a complete visual interface to the entire Claude-flow ecosystem! 🚀