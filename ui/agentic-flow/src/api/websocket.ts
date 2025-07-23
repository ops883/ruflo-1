/**
 * WebSocket Integration for Real-time Swarm Updates
 */

// Browser-compatible EventEmitter
class EventEmitter {
  private events: Map<string, Array<(...args: any[]) => void>> = new Map();

  on(event: string, listener: (...args: any[]) => void): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    if (!this.events.has(event)) return false;
    this.events.get(event)!.forEach(listener => listener(...args));
    return true;
  }

  off(event: string, listener: (...args: any[]) => void): this {
    if (!this.events.has(event)) return this;
    const listeners = this.events.get(event)!;
    const index = listeners.indexOf(listener);
    if (index > -1) listeners.splice(index, 1);
    return this;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }
}
import { getHiveMindClient, HiveMindClient } from './hive-client';

export interface WebSocketConfig {
  url?: string;
  port?: number;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface SwarmUpdate {
  type: 'agent' | 'task' | 'memory' | 'performance' | 'status';
  action: 'created' | 'updated' | 'deleted' | 'completed' | 'failed';
  data: any;
  timestamp: Date;
}

export interface AgentUpdate {
  agentId: string;
  status: string;
  currentTask?: string;
  metrics?: {
    tasksCompleted: number;
    messagesProcessed: number;
    avgResponseTime: number;
  };
}

export interface TaskUpdate {
  taskId: string;
  status: string;
  progress: number;
  assignedAgents?: string[];
  result?: any;
  error?: string;
}

export interface MemoryUpdate {
  action: 'stored' | 'retrieved' | 'deleted';
  key: string;
  namespace: string;
  size?: number;
}

export interface PerformanceUpdate {
  metric: string;
  value: number;
  component?: string;
  trend?: 'up' | 'down' | 'stable';
}

export class SwarmWebSocket extends EventEmitter {
  private client: HiveMindClient;
  private config: WebSocketConfig;
  private subscriptions: Map<string, () => void>;
  private connected: boolean = false;

  constructor(config: WebSocketConfig = {}) {
    super();
    
    this.config = {
      url: config.url || 'localhost',
      port: config.port || 3001, // Changed to match our backend server
      autoConnect: config.autoConnect !== false,
      reconnectInterval: config.reconnectInterval || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10
    };

    this.subscriptions = new Map();
    
    // Create HiveMind client with event handlers
    this.client = getHiveMindClient({
      url: this.config.url,
      port: this.config.port,
      onConnect: () => this.handleConnect(),
      onDisconnect: () => this.handleDisconnect(),
      onError: (error) => this.handleError(error),
      onMessage: (message) => this.handleMessage(message)
    });

    if (this.config.autoConnect) {
      this.connect();
    }
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.connected = true;
      this.emit('connected');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.client.disconnect();
    this.connected = false;
    this.clearSubscriptions();
    this.emit('disconnected');
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Handle connection established
   */
  private handleConnect(): void {
    console.log('WebSocket connected to HiveMind');
    this.connected = true;
    this.emit('connected');
    
    // Re-establish subscriptions after reconnect
    this.reestablishSubscriptions();
  }

  /**
   * Handle connection lost
   */
  private handleDisconnect(): void {
    console.log('WebSocket disconnected from HiveMind');
    this.connected = false;
    this.emit('disconnected');
  }

  /**
   * Handle connection error
   */
  private handleError(error: Error): void {
    console.error('WebSocket error:', error);
    this.emit('error', error);
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: any): void {
    // Parse message type and emit appropriate events
    switch (message.type) {
      case 'swarm-update':
        this.emit('swarm:update', this.createSwarmUpdate('status', 'updated', message.data));
        break;
        
      case 'agent-update':
        this.emit('agent:update', this.createAgentUpdate(message.data));
        break;
        
      case 'task-update':
        this.emit('task:update', this.createTaskUpdate(message.data));
        break;
        
      case 'memory-update':
        this.emit('memory:update', this.createMemoryUpdate(message.data));
        break;
        
      case 'performance-update':
        this.emit('performance:update', this.createPerformanceUpdate(message.data));
        break;
        
      default:
        this.emit('message', message);
    }
  }

  /**
   * Create swarm update object
   */
  private createSwarmUpdate(type: SwarmUpdate['type'], action: SwarmUpdate['action'], data: any): SwarmUpdate {
    return {
      type,
      action,
      data,
      timestamp: new Date()
    };
  }

  /**
   * Create agent update object
   */
  private createAgentUpdate(data: any): AgentUpdate {
    return {
      agentId: data.agentId || data.id,
      status: data.status,
      currentTask: data.currentTask,
      metrics: data.metrics
    };
  }

  /**
   * Create task update object
   */
  private createTaskUpdate(data: any): TaskUpdate {
    return {
      taskId: data.taskId || data.id,
      status: data.status,
      progress: data.progress || 0,
      assignedAgents: data.assignedAgents,
      result: data.result,
      error: data.error
    };
  }

  /**
   * Create memory update object
   */
  private createMemoryUpdate(data: any): MemoryUpdate {
    return {
      action: data.action,
      key: data.key,
      namespace: data.namespace || 'default',
      size: data.size
    };
  }

  /**
   * Create performance update object
   */
  private createPerformanceUpdate(data: any): PerformanceUpdate {
    return {
      metric: data.metric,
      value: data.value,
      component: data.component,
      trend: data.trend
    };
  }

  /**
   * Subscribe to swarm updates
   */
  subscribeToSwarm(swarmId: string): void {
    if (this.subscriptions.has(`swarm:${swarmId}`)) {
      return;
    }

    const unsubscribe = this.client.subscribeToSwarm(swarmId, (update) => {
      this.emit('swarm:update', this.createSwarmUpdate('status', 'updated', update));
    });

    this.subscriptions.set(`swarm:${swarmId}`, unsubscribe);
  }

  /**
   * Subscribe to agent updates
   */
  subscribeToAgent(agentId: string): void {
    if (this.subscriptions.has(`agent:${agentId}`)) {
      return;
    }

    const unsubscribe = this.client.subscribeToAgent(agentId, (update) => {
      this.emit('agent:update', this.createAgentUpdate(update));
    });

    this.subscriptions.set(`agent:${agentId}`, unsubscribe);
  }

  /**
   * Subscribe to task updates
   */
  subscribeToTask(taskId: string): void {
    if (this.subscriptions.has(`task:${taskId}`)) {
      return;
    }

    const unsubscribe = this.client.subscribeToTask(taskId, (update) => {
      this.emit('task:update', this.createTaskUpdate(update));
    });

    this.subscriptions.set(`task:${taskId}`, unsubscribe);
  }

  /**
   * Subscribe to all updates for a swarm
   */
  subscribeToAllUpdates(swarmId: string): void {
    this.subscribeToSwarm(swarmId);
    
    // Subscribe to performance metrics
    this.client.on('performance-metrics', (data) => {
      if (data.swarmId === swarmId) {
        this.emit('performance:update', this.createPerformanceUpdate(data));
      }
    });
    
    // Subscribe to memory updates
    this.client.on('memory-update', (data) => {
      if (data.swarmId === swarmId || !data.swarmId) {
        this.emit('memory:update', this.createMemoryUpdate(data));
      }
    });
  }

  /**
   * Unsubscribe from specific updates
   */
  unsubscribe(type: string, id: string): void {
    const key = `${type}:${id}`;
    const unsubscribe = this.subscriptions.get(key);
    
    if (unsubscribe) {
      unsubscribe();
      this.subscriptions.delete(key);
    }
  }

  /**
   * Clear all subscriptions
   */
  private clearSubscriptions(): void {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions.clear();
  }

  /**
   * Re-establish subscriptions after reconnect
   */
  private reestablishSubscriptions(): void {
    // Subscriptions will be re-established by components
    // This is a placeholder for future enhancement
    console.log('Re-establishing WebSocket subscriptions');
  }

  /**
   * Get HiveMind client instance
   */
  getClient(): HiveMindClient {
    return this.client;
  }
}

// Singleton instance
let wsInstance: SwarmWebSocket | null = null;

/**
 * Get or create WebSocket instance
 */
export function getWebSocket(config?: WebSocketConfig): SwarmWebSocket {
  if (!wsInstance) {
    wsInstance = new SwarmWebSocket(config);
  }
  return wsInstance;
}

/**
 * Typed event emitter for better TypeScript support
 */
export interface SwarmWebSocketEvents {
  connected: () => void;
  disconnected: () => void;
  error: (error: Error) => void;
  message: (message: any) => void;
  'swarm:update': (update: SwarmUpdate) => void;
  'agent:update': (update: AgentUpdate) => void;
  'task:update': (update: TaskUpdate) => void;
  'memory:update': (update: MemoryUpdate) => void;
  'performance:update': (update: PerformanceUpdate) => void;
}

// Type augmentation for EventEmitter
declare module 'events' {
  interface EventEmitter {
    emit<K extends keyof SwarmWebSocketEvents>(
      event: K,
      ...args: Parameters<SwarmWebSocketEvents[K]>
    ): boolean;
    
    on<K extends keyof SwarmWebSocketEvents>(
      event: K,
      listener: SwarmWebSocketEvents[K]
    ): this;
    
    once<K extends keyof SwarmWebSocketEvents>(
      event: K,
      listener: SwarmWebSocketEvents[K]
    ): this;
    
    off<K extends keyof SwarmWebSocketEvents>(
      event: K,
      listener: SwarmWebSocketEvents[K]
    ): this;
  }
}