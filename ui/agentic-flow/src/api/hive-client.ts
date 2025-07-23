/**
 * HiveMind Client Integration
 * Connects to HiveMind WebSocket server at localhost:3006
 */

import { 
  SwarmStatus, 
  AgentSpawnOptions, 
  TaskSubmitOptions,
  Message,
  MessageType,
  SwarmTopology,
  AgentType,
  TaskStatus,
  MemoryEntry,
  NeuralPattern,
  PerformanceMetric
} from '../../src/hive-mind/types';

export interface HiveMindConnection {
  ws: WebSocket | null;
  connected: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
}

export interface HiveMindConfig {
  url: string;
  port: number;
  reconnect: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onMessage?: (message: any) => void;
}

export class HiveMindClient {
  private config: HiveMindConfig;
  private connection: HiveMindConnection;
  private messageHandlers: Map<string, (data: any) => void>;
  private requestCallbacks: Map<string, (response: any) => void>;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private baseUrl: string;

  constructor(config: Partial<HiveMindConfig> = {}) {
    this.config = {
      url: config.url || 'localhost',
      port: config.port || 3001, // Changed to match our backend server
      reconnect: config.reconnect !== false,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      reconnectDelay: config.reconnectDelay || 1000,
      ...config
    };

    this.baseUrl = `http://${this.config.url}:${this.config.port}`;

    this.connection = {
      ws: null,
      connected: false,
      reconnectAttempts: 0,
      maxReconnectAttempts: this.config.maxReconnectAttempts!,
      reconnectDelay: this.config.reconnectDelay!
    };

    this.messageHandlers = new Map();
    this.requestCallbacks = new Map();
    
    this.setupDefaultHandlers();
  }

  /**
   * Connect to HiveMind WebSocket server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `ws://${this.config.url}:${this.config.port}`;
        this.connection.ws = new WebSocket(wsUrl);

        this.connection.ws.onopen = () => {
          console.log(`Connected to HiveMind at ${wsUrl}`);
          this.connection.connected = true;
          this.connection.reconnectAttempts = 0;
          this.config.onConnect?.();
          resolve();
        };

        this.connection.ws.onclose = () => {
          console.log('Disconnected from HiveMind');
          this.connection.connected = false;
          this.config.onDisconnect?.();
          
          if (this.config.reconnect && 
              this.connection.reconnectAttempts < this.connection.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.connection.ws.onerror = (error) => {
          console.error('HiveMind connection error:', error);
          this.config.onError?.(new Error('WebSocket connection failed'));
          reject(new Error('Failed to connect to HiveMind'));
        };

        this.connection.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse HiveMind message:', error);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from HiveMind
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.connection.ws) {
      this.connection.ws.close();
      this.connection.ws = null;
    }
    
    this.connection.connected = false;
  }

  /**
   * Send a message to HiveMind
   */
  private send(type: string, data: any = {}): void {
    if (!this.connection.connected || !this.connection.ws) {
      throw new Error('Not connected to HiveMind');
    }

    const message = {
      type,
      data,
      timestamp: new Date().toISOString(),
      id: this.generateId()
    };

    this.connection.ws.send(JSON.stringify(message));
  }

  /**
   * Send a request and wait for response
   */
  private async request<T = any>(type: string, data: any = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = this.generateId();
      
      this.requestCallbacks.set(requestId, (response) => {
        this.requestCallbacks.delete(requestId);
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.data);
        }
      });

      this.send(type, { ...data, requestId });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.requestCallbacks.has(requestId)) {
          this.requestCallbacks.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    this.connection.reconnectAttempts++;
    const delay = this.connection.reconnectDelay * Math.pow(2, this.connection.reconnectAttempts - 1);
    
    console.log(`Reconnecting to HiveMind in ${delay}ms (attempt ${this.connection.reconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(console.error);
    }, delay);
  }

  /**
   * Setup default message handlers
   */
  private setupDefaultHandlers(): void {
    // Handle response messages
    this.on('response', (data) => {
      const callback = this.requestCallbacks.get(data.requestId);
      if (callback) {
        callback(data);
      }
    });

    // Handle status updates
    this.on('status-update', (data) => {
      this.config.onMessage?.({ type: 'status-update', data });
    });

    // Handle agent updates
    this.on('agent-update', (data) => {
      this.config.onMessage?.({ type: 'agent-update', data });
    });

    // Handle task updates
    this.on('task-update', (data) => {
      this.config.onMessage?.({ type: 'task-update', data });
    });

    // Handle error messages
    this.on('error', (data) => {
      console.error('HiveMind error:', data);
      this.config.onError?.(new Error(data.message || 'Unknown error'));
    });
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: any): void {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message.data || message);
    } else {
      this.config.onMessage?.(message);
    }
  }

  /**
   * Register a message handler
   */
  on(type: string, handler: (data: any) => void): void {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Remove a message handler
   */
  off(type: string): void {
    this.messageHandlers.delete(type);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // ===== SWARM OPERATIONS =====

  /**
   * Initialize a new swarm
   */
  async initSwarm(params: {
    topology: SwarmTopology;
    maxAgents?: number;
    strategy?: string;
  }): Promise<string> {
    try {
      // Try HTTP API first (more reliable for requests)
      const response = await fetch(`${this.baseUrl}/api/swarm/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      if (response.ok) {
        const result = await response.json();
        return result.swarmId;
      }

      // Fallback to WebSocket if HTTP fails
      return this.request('swarm-init', params);
    } catch (error) {
      // Final fallback to WebSocket
      return this.request('swarm-init', params);
    }
  }

  /**
   * Get swarm status
   */
  async getSwarmStatus(swarmId?: string): Promise<SwarmStatus> {
    return this.request('swarm-status', { swarmId });
  }

  /**
   * Destroy a swarm
   */
  async destroySwarm(swarmId: string): Promise<void> {
    return this.request('swarm-destroy', { swarmId });
  }

  // ===== AGENT OPERATIONS =====

  /**
   * Spawn a new agent
   */
  async spawnAgent(options: AgentSpawnOptions): Promise<string> {
    return this.request('agent-spawn', options);
  }

  /**
   * List all agents
   */
  async listAgents(swarmId?: string): Promise<any[]> {
    return this.request('agent-list', { swarmId });
  }

  /**
   * Get agent metrics
   */
  async getAgentMetrics(agentId?: string): Promise<any> {
    return this.request('agent-metrics', { agentId });
  }

  // ===== TASK OPERATIONS =====

  /**
   * Orchestrate a task
   */
  async orchestrateTask(task: string, options?: Partial<TaskSubmitOptions>): Promise<string> {
    return this.request('task-orchestrate', {
      task,
      ...options
    });
  }

  /**
   * Get task status
   */
  async getTaskStatus(taskId?: string): Promise<any> {
    return this.request('task-status', { taskId });
  }

  /**
   * Get task results
   */
  async getTaskResults(taskId: string): Promise<any> {
    return this.request('task-results', { taskId });
  }

  // ===== MEMORY OPERATIONS =====

  /**
   * Store memory
   */
  async storeMemory(key: string, value: any, namespace = 'default', ttl?: number): Promise<void> {
    return this.request('memory-store', {
      action: 'store',
      key,
      value: JSON.stringify(value),
      namespace,
      ttl
    });
  }

  /**
   * Retrieve memory
   */
  async retrieveMemory(key: string, namespace = 'default'): Promise<any> {
    const result = await this.request<string>('memory-retrieve', {
      action: 'retrieve',
      key,
      namespace
    });
    
    try {
      return JSON.parse(result);
    } catch {
      return result;
    }
  }

  /**
   * Search memory
   */
  async searchMemory(pattern: string, limit = 10): Promise<MemoryEntry[]> {
    return this.request('memory-search', {
      pattern,
      limit
    });
  }

  // ===== NEURAL OPERATIONS =====

  /**
   * Get neural status
   */
  async getNeuralStatus(modelId?: string): Promise<any> {
    return this.request('neural-status', { modelId });
  }

  /**
   * Train neural patterns
   */
  async trainNeural(patternType: string, trainingData: any): Promise<void> {
    return this.request('neural-train', {
      pattern_type: patternType,
      training_data: JSON.stringify(trainingData)
    });
  }

  /**
   * Get neural patterns
   */
  async getNeuralPatterns(action = 'analyze'): Promise<NeuralPattern[]> {
    return this.request('neural-patterns', { action });
  }

  // ===== PERFORMANCE OPERATIONS =====

  /**
   * Get performance report
   */
  async getPerformanceReport(format = 'summary', timeframe = '24h'): Promise<any> {
    return this.request('performance-report', { format, timeframe });
  }

  /**
   * Analyze bottlenecks
   */
  async analyzeBottlenecks(component?: string): Promise<any> {
    return this.request('bottleneck-analyze', { component });
  }

  /**
   * Get token usage
   */
  async getTokenUsage(operation?: string, timeframe = '24h'): Promise<any> {
    return this.request('token-usage', { operation, timeframe });
  }

  // ===== REAL-TIME SUBSCRIPTIONS =====

  /**
   * Subscribe to swarm updates
   */
  subscribeToSwarm(swarmId: string, callback: (update: any) => void): () => void {
    this.send('subscribe', { type: 'swarm', id: swarmId });
    
    const handler = (data: any) => {
      if (data.swarmId === swarmId) {
        callback(data);
      }
    };
    
    this.on('swarm-update', handler);
    
    return () => {
      this.send('unsubscribe', { type: 'swarm', id: swarmId });
      this.off('swarm-update');
    };
  }

  /**
   * Subscribe to agent updates
   */
  subscribeToAgent(agentId: string, callback: (update: any) => void): () => void {
    this.send('subscribe', { type: 'agent', id: agentId });
    
    const handler = (data: any) => {
      if (data.agentId === agentId) {
        callback(data);
      }
    };
    
    this.on('agent-update', handler);
    
    return () => {
      this.send('unsubscribe', { type: 'agent', id: agentId });
      this.off('agent-update');
    };
  }

  /**
   * Subscribe to task updates
   */
  subscribeToTask(taskId: string, callback: (update: any) => void): () => void {
    this.send('subscribe', { type: 'task', id: taskId });
    
    const handler = (data: any) => {
      if (data.taskId === taskId) {
        callback(data);
      }
    };
    
    this.on('task-update', handler);
    
    return () => {
      this.send('unsubscribe', { type: 'task', id: taskId });
      this.off('task-update');
    };
  }
}

// Singleton instance
let hiveClient: HiveMindClient | null = null;

/**
 * Get or create HiveMind client instance
 */
export function getHiveMindClient(config?: Partial<HiveMindConfig>): HiveMindClient {
  if (!hiveClient) {
    hiveClient = new HiveMindClient(config);
  }
  return hiveClient;
}

/**
 * Export types for convenience
 */
export type {
  SwarmStatus,
  AgentSpawnOptions,
  TaskSubmitOptions,
  Message,
  MessageType,
  SwarmTopology,
  AgentType,
  TaskStatus,
  MemoryEntry,
  NeuralPattern,
  PerformanceMetric
};