#!/usr/bin/env node

/**
 * Minimal server test for terminal functionality
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { TerminalHandler } from './server/terminal-handler.js';

const PORT = 3001;

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'terminal-test-server'
  });
});

// Initialize terminal handler
console.log('💻 Initializing terminal handler...');
const terminalHandler = new TerminalHandler(io);

io.on('connection', (socket) => {
  console.log(`👤 Client connected: ${socket.id}`);
  
  socket.emit('server:ready', {
    message: 'Terminal server ready',
    timestamp: new Date().toISOString()
  });
  
  socket.on('disconnect', () => {
    console.log(`👤 Client disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`\n✅ Terminal Test Server started!\n`);
  console.log(`📊 Server: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log(`📋 Health: http://localhost:${PORT}/health`);
  console.log(`\n💻 Terminal WebSocket handlers ready`);
  console.log(`   - terminal:create`);
  console.log(`   - terminal:input`);
  console.log(`   - terminal:claude-flow`);
  console.log(`   - terminal:resize`);
});

// Graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function shutdown() {
  console.log('\n🛑 Shutting down test server...');
  
  try {
    await terminalHandler.cleanup();
    console.log('💻 Terminal cleanup complete');
    
    server.close(() => {
      console.log('✅ Server shutdown complete');
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}