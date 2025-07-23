/**
 * Sync Manager - WebSocket Server for Real-time Updates
 * Provides WebSocket connections for UI real-time synchronization
 */

import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const port = process.env.SYNC_PORT || 3007;

// Create HTTP server
const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Store connected clients
const clients = new Set();

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  console.log(`New WebSocket connection from ${req.socket.remoteAddress}`);
  
  // Add client to set
  clients.add(ws);
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Connected to Sync Manager',
    timestamp: new Date().toISOString()
  }));
  
  // Handle messages from client
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('Received:', message);
      
      // Broadcast to all other clients
      clients.forEach(client => {
        if (client !== ws && client.readyState === 1) {
          client.send(JSON.stringify({
            ...message,
            timestamp: new Date().toISOString()
          }));
        }
      });
    } catch (error) {
      console.error('Failed to process message:', error);
    }
  });
  
  // Handle client disconnect
  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
  
  // Send periodic heartbeat
  const heartbeat = setInterval(() => {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      }));
    } else {
      clearInterval(heartbeat);
    }
  }, 30000); // 30 seconds
});

// Start server
server.listen(port, () => {
  console.log(`🔄 Sync Manager running on ws://localhost:${port}`);
  console.log(`📋 Health check: http://localhost:${port}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing connections...');
  
  // Close all WebSocket connections
  clients.forEach(client => {
    client.close(1001, 'Server shutting down');
  });
  
  // Close servers
  wss.close(() => {
    server.close(() => {
      console.log('Sync Manager shut down');
      process.exit(0);
    });
  });
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});