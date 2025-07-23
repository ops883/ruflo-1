#!/bin/bash

# Agentic Flow - Complete Startup Script
# This script starts all required services for the Agentic Flow UI

echo "🚀 Starting Agentic Flow Services..."
echo "=================================="

# Kill any existing processes
echo "🔄 Cleaning up existing processes..."
pkill -f "server.js" 2>/dev/null
pkill -f "sync-manager.js" 2>/dev/null
pkill -f "server/index.ts" 2>/dev/null
sleep 2

# Start Backend API Server (port 3001)
echo "📡 Starting Backend API Server..."
node server.js &
API_PID=$!
echo "   ✅ API Server PID: $API_PID"

# Wait for API server to be ready
sleep 3

# Start Sync Manager (port 3007)
echo "🔄 Starting Sync Manager..."
node sync-manager.js &
SYNC_PID=$!
echo "   ✅ Sync Manager PID: $SYNC_PID"

# Start TypeScript Backend Server (also port 3001)
echo "🎯 Starting TypeScript Backend..."
npx tsx server/index.ts &
TS_PID=$!
echo "   ✅ TypeScript Server PID: $TS_PID"

# Wait for all services to initialize
sleep 3

# Start Vite Dev Server (port 5173)
echo "🎨 Starting UI Development Server..."
npm run dev &
UI_PID=$!
echo "   ✅ UI Server PID: $UI_PID"

echo ""
echo "=================================="
echo "✅ All services started!"
echo ""
echo "🌐 Access the UI at:"
echo "   http://localhost:5173"
echo ""
echo "📊 Service Status:"
echo "   API Server: http://localhost:3001"
echo "   Sync Manager: ws://localhost:3007"
echo "   Health Check: http://localhost:3001/api/health"
echo ""
echo "💡 To stop all services, run: ./stop.sh"
echo "=================================="

# Create PID file for cleanup
echo "$API_PID $SYNC_PID $TS_PID $UI_PID" > .pids

# Keep script running
wait