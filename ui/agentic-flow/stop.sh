#!/bin/bash

# Agentic Flow - Stop Script
# This script stops all running services

echo "🛑 Stopping Agentic Flow Services..."
echo "=================================="

# Read PIDs from file if it exists
if [ -f .pids ]; then
    echo "📋 Reading PIDs from .pids file..."
    PIDS=$(cat .pids)
    for PID in $PIDS; do
        if kill -0 $PID 2>/dev/null; then
            echo "   Stopping process $PID..."
            kill $PID
        fi
    done
    rm .pids
fi

# Also kill by process name as backup
echo "🔄 Ensuring all processes are stopped..."
pkill -f "server.js" 2>/dev/null
pkill -f "sync-manager.js" 2>/dev/null
pkill -f "server/index.ts" 2>/dev/null
pkill -f "vite" 2>/dev/null

echo ""
echo "✅ All services stopped!"
echo "=================================="