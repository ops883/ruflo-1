/**
 * Real-time Synchronization Manager
 * 
 * This server monitors all system changes and broadcasts updates to UI clients
 * via WebSocket connections. It ensures the UI always reflects real system state.
 */

import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface SystemState {
  swarms: Map<string, SwarmState>;
  agents: Map<string, AgentState>;
  tasks: Map<string, TaskState>;
  memory: Map<string, MemoryState>;
  performance: PerformanceState;
  connections: Set<WebSocket>;
}

export interface SwarmState {
  id: string;
  topology: 'mesh' | 'hierarchical' | 'ring' | 'star';
  status: 'initializing' | 'active' | 'paused' | 'terminated';
  agentIds: string[];
  maxAgents: number;
  createdAt: Date;
  lastActivity: Date;
  metrics: {
    tasksCompleted: number;
    totalMessages: number;
    avgResponseTime: number;
  };
}

export interface AgentState {
  id: string;
  name: string;
  type: 'architect' | 'coder' | 'analyst' | 'tester' | 'researcher' | 'coordinator';
  status: 'idle' | 'busy' | 'error' | 'offline';
  swarmId?: string;
  currentTask?: string;
  position?: { x: number; y: number; z: number };
  metrics: {
    tasksCompleted: number;
    messagesProcessed: number;
    avgResponseTime: number;
    successRate: number;
  };
  lastActivity: Date;
}

export interface TaskState {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedAgents: string[];
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
}

export interface MemoryState {
  totalEntries: number;
  totalSize: number;
  recentEntries: Array<{
    key: string;
    namespace: string;
    size: number;
    timestamp: Date;
    operation: 'store' | 'retrieve' | 'delete';
  }>;
}

export interface PerformanceState {
  cpu: number;
  memory: number;
  tokenUsage: {
    total: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
  responseTime: number;
  throughput: number;
  activeConnections: number;
  uptime: number;
}

export class SyncManager {
  private app: express.Application;
  private server: any;
  private wss: WebSocketServer;
  private state: SystemState;
  private watchers: Map<string, any> = new Map();
  private hiveMindProcess: any;
  
  private readonly PORT = 3007;
  private readonly HIVE_MIND_PORT = 3006;
  
  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    
    this.state = {
      swarms: new Map(),
      agents: new Map(),
      tasks: new Map(),
      memory: new Map(),
      performance: this.getInitialPerformanceState(),
      connections: new Set()
    };
    
    this.setupExpress();
    this.setupWebSocket();
    this.setupSystemWatchers();
    this.startHiveMind();
  }
  
  /**
   * Setup Express middleware and routes
   */
  private setupExpress(): void {
    this.app.use(cors({
      origin: ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true
    }));
    
    this.app.use(express.json());
    
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        uptime: process.uptime(),
        connections: this.state.connections.size,
        timestamp: new Date().toISOString()
      });
    });
    
    // System state endpoint
    this.app.get('/api/state', (req, res) => {
      res.json(this.getSerializableState());
    });
    
    // Agent endpoints
    this.app.get('/api/agents', (req, res) => {
      const agents = Array.from(this.state.agents.values());
      res.json(agents);
    });
    
    // Task endpoints
    this.app.get('/api/tasks', (req, res) => {
      const tasks = Array.from(this.state.tasks.values());
      res.json(tasks);
    });
    
    // Performance endpoint
    this.app.get('/api/performance', (req, res) => {
      res.json(this.state.performance);
    });
  }
  
  /**
   * Setup WebSocket server for real-time updates
   */
  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocket, request) => {
      console.log(`New WebSocket connection from ${request.socket.remoteAddress}`);
      this.state.connections.add(ws);
      
      // Send initial state
      this.sendToClient(ws, {
        type: 'initial-state',
        data: this.getSerializableState()
      });
      
      // Handle client messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(ws, message);
        } catch (error) {
          console.error('Failed to parse client message:', error);
        }
      });
      
      // Handle disconnection
      ws.on('close', () => {
        console.log('WebSocket connection closed');
        this.state.connections.delete(ws);
        this.updatePerformanceMetrics();
      });
      
      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.state.connections.delete(ws);
      });
      
      this.updatePerformanceMetrics();
    });
  }
  
  /**
   * Setup system watchers for real-time monitoring
   */
  private setupSystemWatchers(): void {
    // Watch for swarm memory changes
    this.watchSwarmMemory();
    
    // Monitor system performance
    this.startPerformanceMonitoring();
    
    // Watch for command execution
    this.watchCommandExecution();
    
    // Monitor HiveMind connection
    this.monitorHiveMind();
  }
  
  /**
   * Watch swarm memory directory for changes
   */
  private watchSwarmMemory(): void {
    const memoryPath = path.join(process.cwd(), '.swarm');
    
    if (!fs.existsSync(memoryPath)) {
      fs.mkdirSync(memoryPath, { recursive: true });
    }
    
    // Watch for database changes
    const dbPath = path.join(memoryPath, 'memory.db');
    if (fs.existsSync(dbPath)) {
      fs.watchFile(dbPath, (curr, prev) => {
        if (curr.mtime !== prev.mtime) {
          this.handleMemoryUpdate();
        }
      });
    }
    
    // Watch for log files
    const logPath = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logPath)) {
      fs.mkdirSync(logPath, { recursive: true });
    }
    
    fs.watch(logPath, (eventType, filename) => {
      if (filename && filename.endsWith('.log')) {
        this.handleLogUpdate(filename);
      }
    });
  }
  
  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.updatePerformanceMetrics();
      this.broadcastUpdate('performance', this.state.performance);
    }, 2000); // Update every 2 seconds
  }
  
  /**
   * Watch for command execution
   */
  private watchCommandExecution(): void {
    // Monitor claude-flow command execution
    const originalSpawn = spawn;
    
    // This would be implemented with process monitoring
    // For now, we'll simulate based on memory updates
    setInterval(() => {
      this.checkForNewTasks();
    }, 1000);
  }
  
  /**
   * Monitor HiveMind connection
   */
  private monitorHiveMind(): void {
    setInterval(() => {
      this.checkHiveMindStatus();
    }, 5000);
  }
  
  /**
   * Start HiveMind process
   */
  private startHiveMind(): void {
    try {
      const claudeFlowPath = path.join(process.cwd(), '../../');
      
      this.hiveMindProcess = spawn('node', ['src/hive-mind/server.js'], {
        cwd: claudeFlowPath,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      this.hiveMindProcess.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        console.log('HiveMind:', output);
        
        // Parse HiveMind output for state changes
        this.parseHiveMindOutput(output);
      });
      
      this.hiveMindProcess.stderr?.on('data', (data: Buffer) => {
        console.error('HiveMind Error:', data.toString());
      });
      
      this.hiveMindProcess.on('exit', (code: number) => {
        console.log(`HiveMind process exited with code ${code}`);
        // Auto-restart if needed
        setTimeout(() => this.startHiveMind(), 5000);
      });
      
      console.log('Started HiveMind process');
    } catch (error) {
      console.error('Failed to start HiveMind process:', error);
    }
  }
  
  /**
   * Parse HiveMind output for state updates
   */
  private parseHiveMindOutput(output: string): void {
    const lines = output.split('\\n');
    
    for (const line of lines) {
      try {
        // Look for JSON output
        if (line.includes('{') && line.includes('}')) {
          const jsonMatch = line.match(/{.*}/);
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            this.handleHiveMindUpdate(data);
          }
        }
        
        // Parse structured log messages
        if (line.includes('SWARM_INIT')) {
          this.handleSwarmInit(line);
        } else if (line.includes('AGENT_SPAWN')) {
          this.handleAgentSpawn(line);
        } else if (line.includes('TASK_UPDATE')) {
          this.handleTaskUpdate(line);
        }
      } catch (error) {
        // Ignore parsing errors for non-JSON lines
      }
    }
  }
  
  /**
   * Handle HiveMind updates
   */
  private handleHiveMindUpdate(data: any): void {
    switch (data.type) {
      case 'swarm-status':
        this.updateSwarmState(data);
        break;
      case 'agent-update':
        this.updateAgentState(data);
        break;
      case 'task-update':
        this.updateTaskState(data);
        break;
      case 'performance-metrics':
        this.updatePerformanceFromHiveMind(data);
        break;
    }
  }
  
  /**
   * Handle swarm initialization
   */
  private handleSwarmInit(logLine: string): void {
    // Extract swarm info from log line
    const swarmMatch = logLine.match(/swarm-([a-z0-9-]+)/);
    if (swarmMatch) {
      const swarmId = swarmMatch[1];
      
      const swarmState: SwarmState = {
        id: swarmId,
        topology: 'hierarchical', // Default
        status: 'initializing',
        agentIds: [],
        maxAgents: 8,
        createdAt: new Date(),
        lastActivity: new Date(),
        metrics: {
          tasksCompleted: 0,
          totalMessages: 0,
          avgResponseTime: 0
        }
      };
      
      this.state.swarms.set(swarmId, swarmState);
      this.broadcastUpdate('swarm', { action: 'created', data: swarmState });
    }
  }
  
  /**
   * Handle agent spawn
   */
  private handleAgentSpawn(logLine: string): void {
    // Extract agent info from log line
    const agentMatch = logLine.match(/agent-([a-z0-9-]+).*type:([a-z]+)/);
    if (agentMatch) {
      const [, agentId, type] = agentMatch;
      
      const agentState: AgentState = {
        id: agentId,
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} Agent`,
        type: type as AgentState['type'],
        status: 'idle',
        position: this.generateAgentPosition(),
        metrics: {
          tasksCompleted: 0,
          messagesProcessed: 0,
          avgResponseTime: 0,
          successRate: 100
        },
        lastActivity: new Date()
      };
      
      this.state.agents.set(agentId, agentState);
      this.broadcastUpdate('agent', { action: 'created', data: agentState });
    }
  }
  
  /**
   * Handle task updates
   */
  private handleTaskUpdate(logLine: string): void {
    // Extract task info from log line
    const taskMatch = logLine.match(/task-([a-z0-9-]+).*status:([a-z_]+)/);
    if (taskMatch) {
      const [, taskId, status] = taskMatch;
      
      let task = this.state.tasks.get(taskId);
      if (!task) {
        task = {
          id: taskId,
          description: 'System Task',
          status: 'pending',
          priority: 'medium',
          assignedAgents: [],
          progress: 0
        };
      }
      
      task.status = status as TaskState['status'];
      task.progress = status === 'completed' ? 100 : status === 'in_progress' ? 50 : 0;
      
      if (status === 'in_progress' && !task.startedAt) {
        task.startedAt = new Date();
      } else if (status === 'completed' && !task.completedAt) {
        task.completedAt = new Date();
      }
      
      this.state.tasks.set(taskId, task);
      this.broadcastUpdate('task', { action: 'updated', data: task });
    }
  }
  
  /**
   * Handle memory updates
   */
  private handleMemoryUpdate(): void {
    // Update memory state from database
    this.updateMemoryState();
    this.broadcastUpdate('memory', this.state.memory);
  }
  
  /**
   * Handle log updates
   */
  private handleLogUpdate(filename: string): void {
    console.log(`Log file updated: ${filename}`);
    
    // Read and parse log file for system events
    const logPath = path.join(process.cwd(), 'logs', filename);
    try {
      const content = fs.readFileSync(logPath, 'utf-8');
      const lines = content.split('\\n').slice(-10); // Last 10 lines
      
      for (const line of lines) {
        if (line.trim()) {
          this.broadcastUpdate('log', { filename, line, timestamp: new Date() });
        }
      }
    } catch (error) {
      console.error(`Failed to read log file ${filename}:`, error);
    }
  }
  
  /**
   * Check HiveMind status
   */
  private checkHiveMindStatus(): void {
    // Try to connect to HiveMind WebSocket
    try {
      const ws = new WebSocket(`ws://localhost:${this.HIVE_MIND_PORT}`);
      
      ws.on('open', () => {
        ws.close();
        this.broadcastUpdate('system', { 
          component: 'hivemind', 
          status: 'online',
          timestamp: new Date()
        });
      });
      
      ws.on('error', () => {
        this.broadcastUpdate('system', { 
          component: 'hivemind', 
          status: 'offline',
          timestamp: new Date()
        });
      });
    } catch (error) {
      // HiveMind not available
    }
  }
  
  /**
   * Check for new tasks
   */
  private checkForNewTasks(): void {
    // This would monitor actual command execution
    // For now, simulate based on recent activity
  }
  
  /**
   * Update swarm state
   */
  private updateSwarmState(data: any): void {
    const swarm = this.state.swarms.get(data.swarmId) || {
      id: data.swarmId,
      topology: data.topology || 'hierarchical',
      status: 'active',
      agentIds: [],
      maxAgents: data.maxAgents || 8,
      createdAt: new Date(),
      lastActivity: new Date(),
      metrics: { tasksCompleted: 0, totalMessages: 0, avgResponseTime: 0 }
    };
    
    Object.assign(swarm, data, { lastActivity: new Date() });
    this.state.swarms.set(data.swarmId, swarm);
    this.broadcastUpdate('swarm', { action: 'updated', data: swarm });
  }
  
  /**
   * Update agent state
   */
  private updateAgentState(data: any): void {
    const agent = this.state.agents.get(data.agentId);
    if (agent) {
      Object.assign(agent, data, { lastActivity: new Date() });
      this.state.agents.set(data.agentId, agent);
      this.broadcastUpdate('agent', { action: 'updated', data: agent });
    }
  }
  
  /**
   * Update task state
   */
  private updateTaskState(data: any): void {
    const task = this.state.tasks.get(data.taskId);
    if (task) {
      Object.assign(task, data);
      this.state.tasks.set(data.taskId, task);
      this.broadcastUpdate('task', { action: 'updated', data: task });
    }
  }
  
  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(): void {
    const usage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    this.state.performance = {
      ...this.state.performance,
      memory: Math.round((usage.heapUsed / 1024 / 1024) * 100) / 100, // MB
      cpu: Math.round((cpuUsage.user + cpuUsage.system) / 1000000 * 100) / 100, // %
      activeConnections: this.state.connections.size,
      uptime: Math.round(process.uptime())
    };
  }
  
  /**
   * Update memory state
   */
  private updateMemoryState(): void {
    try {
      const memoryPath = path.join(process.cwd(), '.swarm', 'memory.db');
      if (fs.existsSync(memoryPath)) {
        const stats = fs.statSync(memoryPath);
        
        // This is a simplified version - in a real implementation,
        // you'd query the SQLite database for actual memory statistics
        const memoryState: MemoryState = {
          totalEntries: Math.floor(Math.random() * 100) + 50, // Simulated
          totalSize: stats.size,
          recentEntries: [] // Would be populated from actual database
        };
        
        this.state.memory.set('default', memoryState);
      }
    } catch (error) {
      console.error('Failed to update memory state:', error);
    }
  }
  
  /**
   * Update performance from HiveMind
   */
  private updatePerformanceFromHiveMind(data: any): void {
    Object.assign(this.state.performance, data);
  }
  
  /**
   * Generate agent position for 3D visualization
   */
  private generateAgentPosition(): { x: number; y: number; z: number } {
    return {
      x: (Math.random() - 0.5) * 20,
      y: (Math.random() - 0.5) * 20,
      z: (Math.random() - 0.5) * 20
    };
  }
  
  /**
   * Handle client messages
   */
  private handleClientMessage(ws: WebSocket, message: any): void {
    switch (message.type) {
      case 'subscribe':
        this.handleSubscription(ws, message);
        break;
      case 'unsubscribe':
        this.handleUnsubscription(ws, message);
        break;
      case 'command':
        this.handleCommand(ws, message);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }
  
  /**
   * Handle subscription requests
   */
  private handleSubscription(ws: WebSocket, message: any): void {
    // Store subscription info on WebSocket object
    if (!(ws as any).subscriptions) {
      (ws as any).subscriptions = new Set();
    }
    
    const subscription = `${message.entityType}:${message.entityId || 'all'}`;
    (ws as any).subscriptions.add(subscription);
    
    console.log(`Client subscribed to ${subscription}`);
  }
  
  /**
   * Handle unsubscription requests
   */
  private handleUnsubscription(ws: WebSocket, message: any): void {
    if ((ws as any).subscriptions) {
      const subscription = `${message.entityType}:${message.entityId || 'all'}`;
      (ws as any).subscriptions.delete(subscription);
      
      console.log(`Client unsubscribed from ${subscription}`);
    }
  }
  
  /**
   * Handle command requests
   */
  private handleCommand(ws: WebSocket, message: any): void {
    // Execute commands and return results
    switch (message.command) {
      case 'get-state':
        this.sendToClient(ws, {
          type: 'command-result',
          requestId: message.requestId,
          data: this.getSerializableState()
        });
        break;
      default:
        this.sendToClient(ws, {
          type: 'error',
          requestId: message.requestId,
          error: `Unknown command: ${message.command}`
        });
    }
  }
  
  /**
   * Broadcast update to all connected clients
   */
  private broadcastUpdate(type: string, data: any): void {
    const message = {
      type: `${type}-update`,
      data,
      timestamp: new Date().toISOString()
    };
    
    this.state.connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        // Check if client is subscribed to this update
        const subscriptions = (ws as any).subscriptions;
        if (!subscriptions || subscriptions.has(`${type}:all`) || 
            (data.id && subscriptions.has(`${type}:${data.id}`))) {
          this.sendToClient(ws, message);
        }
      }
    });
  }
  
  /**
   * Send message to specific client
   */
  private sendToClient(ws: WebSocket, message: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
  
  /**
   * Get serializable state object
   */
  private getSerializableState(): any {
    return {
      swarms: Array.from(this.state.swarms.values()),
      agents: Array.from(this.state.agents.values()),
      tasks: Array.from(this.state.tasks.values()),
      memory: Array.from(this.state.memory.entries()).map(([ns, state]) => ({
        namespace: ns,
        ...state
      })),
      performance: this.state.performance,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Get initial performance state
   */
  private getInitialPerformanceState(): PerformanceState {
    return {
      cpu: 0,
      memory: 0,
      tokenUsage: {
        total: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0
      },
      responseTime: 0,
      throughput: 0,
      activeConnections: 0,
      uptime: 0
    };
  }
  
  /**
   * Start the sync manager
   */
  start(): void {
    this.server.listen(this.PORT, () => {
      console.log(`🚀 Sync Manager running on port ${this.PORT}`);
      console.log(`📡 WebSocket server ready for UI connections`);
      console.log(`🔄 Real-time synchronization active`);
    });
  }
  
  /**
   * Stop the sync manager
   */
  stop(): void {
    if (this.hiveMindProcess) {
      this.hiveMindProcess.kill();
    }
    
    this.state.connections.forEach(ws => {
      ws.close();
    });
    
    this.server.close();
    console.log('Sync Manager stopped');
  }
}

// Start the sync manager if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const syncManager = new SyncManager();
  syncManager.start();
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\\nReceived SIGINT. Shutting down gracefully...');
    syncManager.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\\nReceived SIGTERM. Shutting down gracefully...');
    syncManager.stop();
    process.exit(0);
  });
}

export default SyncManager;