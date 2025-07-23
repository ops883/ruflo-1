# Agentic Flow UI - Startup Guide

## 🚀 Quick Start

The easiest way to start all services:

```bash
npm run start
```

To stop all services:

```bash
npm run stop
```

## 📋 Services Overview

The Agentic Flow UI requires 4 services to run:

1. **Backend API Server** (port 3001) - Main API for MCP tools
2. **TypeScript Backend** (port 3001) - HiveMind & Mastra integration
3. **Sync Manager** (port 3007) - WebSocket for real-time updates  
4. **UI Development Server** (port 5173) - Vite dev server

## 🔧 Manual Start (if needed)

If you prefer to start services individually:

```bash
# Terminal 1: Backend API
npm run dev:api

# Terminal 2: TypeScript Backend
npx tsx server/index.ts

# Terminal 3: Sync Manager
node sync-manager.js

# Terminal 4: UI
npm run dev
```

## 🌐 Access Points

- **UI**: http://localhost:5173 (or http://127.0.0.1:5173)
- **API Health**: http://localhost:3001/api/health
- **API Docs**: http://localhost:3001/api/docs
- **MCP Tools**: http://localhost:3001/api/mcp/tools
- **Sync Health**: http://localhost:3007/health

## 🔍 Troubleshooting

### CORS Errors
If you see CORS errors when accessing from 127.0.0.1, the server is configured to accept both localhost and 127.0.0.1 origins.

### Port Already in Use
If you get "address already in use" errors:
```bash
npm run stop  # This will kill all services
# Or manually:
pkill -f "server.js"
pkill -f "sync-manager.js"
pkill -f "vite"
```

### WebSocket Connection Errors
The WebSocket might fail a few times on startup before connecting. This is normal - it will retry automatically.

### HiveMind Connection Errors
HiveMind connection warnings in the console are expected. The system works with or without HiveMind.

## 📊 Checking Service Status

To verify all services are running:

```bash
# Check processes
ps aux | grep -E "(server|sync|vite)" | grep -v grep

# Test endpoints
curl http://localhost:3001/api/health
curl http://localhost:3007/health
```

## 🛠️ Development Tips

1. The start script creates a `.pids` file to track process IDs
2. Logs are output to the console - keep the terminal open to monitor
3. Use `npm run test:integration` to verify all endpoints are working
4. The UI hot-reloads automatically when you make changes

## 📦 Initial Setup

If you haven't set up the project yet:

```bash
npm install
npm run setup
npm run start
```

## 🎯 Features Available

Once running, you'll have access to:
- HiveMind Dashboard with real-time metrics
- Swarm Management with memory & task integration
- MCP Tools Browser (87 tools available)
- Memory Database Explorer
- Terminal interface
- Real-time synchronization
- Retro console theme