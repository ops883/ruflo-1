/**
 * Real HiveMind Client Integration
 * 
 * This module connects the UI to the actual HiveMind system from src/hive-mind/
 * It manages real swarm instances, agent spawning, and task execution.
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
// Local type definitions for browser compatibility
export type SwarmTopology = 'mesh' | 'hierarchical' | 'ring' | 'star';
export type AgentType = 'researcher' | 'analyst' | 'coder' | 'tester' | 'coordinator' | 'specialist';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStrategy = 'parallel' | 'sequential' | 'adaptive';

export interface MemoryEntry {
  key: string;
  value: string;
  namespace: string;
  created_at: string;
  ttl?: number;
}

// Note: HiveMind and DatabaseManager are accessed via backend API
// Direct imports don't work in browser due to Node.js dependencies

export interface RealHiveClientConfig {
  autoConnect?: boolean;
  persistState?: boolean;
  enableRealTime?: boolean;
  memoryTTL?: number;
  consensusThreshold?: number;
}

export interface UIAgent {
  id: string;
  name: string;
  type: AgentType;
  status: 'idle' | 'busy' | 'error' | 'offline';
  tasks: number;
  performance: number;
  memory?: string;
  cpu?: number;
  currentTask?: string | null;
  messageCount?: number;
  createdAt?: number;
}

export interface UITask {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  priority: TaskPriority;
  progress: number;
  assignedAgent?: string | null;
  createdAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
}

export interface UISwarmStatus {
  swarmId: string;
  name: string;
  topology: SwarmTopology;
  health: 'healthy' | 'degraded' | 'critical' | 'unknown';
  uptime: number;
  agents: UIAgent[];
  tasks: UITask[];
  stats: {
    totalAgents: number;
    activeAgents: number;
    totalTasks: number;
    pendingTasks: number;
    completedTasks: number;
    failedTasks: number;
    avgTaskCompletion: number;
    messageThroughput: number;
    consensusSuccessRate: number;
    memoryHitRate: number;
    agentUtilization: number;
  };
  warnings: string[];
}

export class RealHiveClient extends EventEmitter {
  private apiUrl: string;
  private config: RealHiveClientConfig;
  private connected: boolean = false;
  private currentSwarmId: string | null = null;
  private updateInterval: number | null = null;
  
  constructor(config: RealHiveClientConfig = {}) {
    super();
    this.apiUrl = 'http://localhost:3001/api';
    this.config = {
      autoConnect: true,
      persistState: true,
      enableRealTime: true,
      memoryTTL: 86400, // 24 hours
      consensusThreshold: 0.6,
      ...config
    };
    
    if (this.config.autoConnect) {
      this.connect().catch(console.error);
    }
  }

  /**
   * Connect to the HiveMind system
   */
  async connect(): Promise<void> {
    try {
      // Check backend API health
      const healthResponse = await fetch(`${this.apiUrl}/health`);
      if (!healthResponse.ok) {
        throw new Error('Backend API not available');
      }
      
      // Try to get existing active swarm
      const swarmResponse = await fetch(`${this.apiUrl}/hive/status`);
      if (swarmResponse.ok) {
        const swarmData = await swarmResponse.json();
        if (swarmData.swarmId) {
          this.currentSwarmId = swarmData.swarmId;
          console.log(`Connected to existing swarm: ${swarmData.name} (${swarmData.swarmId})`);
        }
      }
      
      // If no swarm exists, initialize one
      if (!this.currentSwarmId) {
        await this.initializeNewSwarm();
      }
      
      this.connected = true;
      
      // Start real-time updates if enabled
      if (this.config.enableRealTime) {
        this.startRealTimeUpdates();
      }
      
      this.emit('connected', { swarmId: this.currentSwarmId });
      
    } catch (error) {
      console.error('Failed to connect to HiveMind:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Initialize a new swarm with default configuration
   */
  private async initializeNewSwarm(): Promise<void> {
    const config = {
      name: 'UI-Swarm',
      topology: 'hierarchical',
      maxAgents: 8,
      strategy: 'balanced'
    };
    
    const response = await fetch(`${this.apiUrl}/hive/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    
    if (!response.ok) {
      throw new Error('Failed to initialize swarm');
    }
    
    const result = await response.json();
    this.currentSwarmId = result.swarmId;
    
    console.log(`Created new swarm: ${config.name} (${this.currentSwarmId})`);
  }

  /**
   * Initialize swarm with specific configuration
   */
  async initSwarm(params: {
    name?: string;
    topology: SwarmTopology;
    maxAgents?: number;
    strategy?: string;
    autoSpawn?: boolean;
  }): Promise<string> {
    const config = {
      name: params.name || 'Custom-Swarm',
      topology: params.topology,
      maxAgents: params.maxAgents || 8,
      strategy: params.strategy || 'balanced'
    };
    
    const response = await fetch(`${this.apiUrl}/hive/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    
    if (!response.ok) {
      throw new Error('Failed to initialize swarm');
    }
    
    const result = await response.json();
    this.currentSwarmId = result.swarmId;
    
    this.emit('swarmInitialized', { swarmId: this.currentSwarmId, config });
    
    return this.currentSwarmId;
  }

  /**
   * Get comprehensive swarm status
   */
  async getSwarmStatus(): Promise<UISwarmStatus | null> {
    if (!this.connected) {
      return null;
    }
    
    try {
      const response = await fetch(`${this.apiUrl}/hive/status`);
      if (!response.ok) {
        return null;
      }
      
      const status = await response.json();
      
      // Return the status directly as it comes from the backend API
      return status;
      
    } catch (error) {
      console.error('Failed to get swarm status:', error);
      return null;
    }
  }

  /**
   * Spawn a new agent
   */
  async spawnAgent(options: {
    type: AgentType;
    name?: string;
    autoAssign?: boolean;
  }): Promise<UIAgent | null> {
    if (!this.connected) {
      throw new Error('Not connected to HiveMind');
    }
    
    try {
      const response = await fetch(`${this.apiUrl}/hive/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: options.type,
          name: options.name,
          autoAssign: options.autoAssign || true
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to spawn agent');
      }
      
      const agent = await response.json();
      this.emit('agentSpawned', agent);
      return agent;
      
    } catch (error) {
      console.error('Failed to spawn agent:', error);
      this.emit('error', error);
      return null;
    }
  }

  /**
   * Submit a task to the swarm
   */
  async submitTask(options: {
    description: string;
    priority: TaskPriority;
    strategy?: TaskStrategy;
    requireConsensus?: boolean;
    maxAgents?: number;
  }): Promise<UITask | null> {
    if (!this.connected) {
      throw new Error('Not connected to HiveMind');
    }
    
    try {
      const response = await fetch(`${this.apiUrl}/hive/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: options.description,
          priority: options.priority,
          strategy: options.strategy || 'adaptive',
          requireConsensus: options.requireConsensus || false,
          maxAgents: options.maxAgents || 3
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit task');
      }
      
      const task = await response.json();
      this.emit('taskSubmitted', task);
      return task;
      
    } catch (error) {
      console.error('Failed to submit task:', error);
      this.emit('error', error);
      return null;
    }
  }

  /**
   * Cancel a task
   */
  async cancelTask(taskId: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to HiveMind');
    }
    
    try {
      const response = await fetch(`${this.apiUrl}/hive/tasks/${taskId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel task');
      }
      
      this.emit('taskCancelled', { taskId });
    } catch (error) {
      console.error('Failed to cancel task:', error);
      this.emit('error', error);
    }
  }

  /**
   * Get agents list
   */
  async getAgents(): Promise<UIAgent[]> {
    if (!this.connected) {
      return [];
    }
    
    try {
      const response = await fetch(`${this.apiUrl}/hive/agents`);
      if (!response.ok) {
        return [];
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get agents:', error);
      return [];
    }
  }

  /**
   * Get tasks list
   */
  async getTasks(): Promise<UITask[]> {
    if (!this.connected) {
      return [];
    }
    
    try {
      const response = await fetch(`${this.apiUrl}/hive/tasks`);
      if (!response.ok) {
        return [];
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get tasks:', error);
      return [];
    }
  }

  /**
   * Store memory
   */
  async storeMemory(key: string, value: any, namespace = 'ui', ttl?: number): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to HiveMind');
    }
    
    try {
      await fetch(`${this.apiUrl}/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: JSON.stringify(value), namespace, ttl })
      });
    } catch (error) {
      console.error('Failed to store memory:', error);
    }
  }

  /**
   * Retrieve memory
   */
  async retrieveMemory(key: string, namespace = 'ui'): Promise<any> {
    if (!this.connected) {
      return null;
    }
    
    try {
      const response = await fetch(`${this.apiUrl}/memory/${namespace}/${key}`);
      if (!response.ok) {
        return null;
      }
      const result = await response.json();
      return result ? JSON.parse(result.value) : null;
    } catch (error) {
      console.error('Failed to retrieve memory:', error);
      return null;
    }
  }

  /**
   * Search memory
   */
  async searchMemory(pattern: string, limit = 10): Promise<MemoryEntry[]> {
    if (!this.connected) {
      return [];
    }
    
    try {
      const response = await fetch(`${this.apiUrl}/memory/search?pattern=${encodeURIComponent(pattern)}&limit=${limit}`);
      if (!response.ok) {
        return [];
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to search memory:', error);
      return [];
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceReport(): Promise<any> {
    if (!this.connected) {
      return null;
    }
    
    try {
      const response = await fetch(`${this.apiUrl}/hive/performance`);
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get performance report:', error);
      return null;
    }
  }

  /**
   * Start real-time updates
   */
  private startRealTimeUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = setInterval(async () => {
      try {
        const status = await this.getSwarmStatus();
        if (status) {
          this.emit('statusUpdate', status);
        }
      } catch (error) {
        console.error('Real-time update failed:', error);
      }
    }, 2000); // Update every 2 seconds
  }

  /**
   * Stop real-time updates
   */
  private stopRealTimeUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }


  /**
   * Disconnect from HiveMind
   */
  async disconnect(): Promise<void> {
    this.stopRealTimeUpdates();
    
    this.connected = false;
    this.currentSwarmId = null;
    this.emit('disconnected');
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get current swarm ID
   */
  getCurrentSwarmId(): string | null {
    return this.currentSwarmId;
  }
}

// Singleton instance
let realHiveClient: RealHiveClient | null = null;

/**
 * Get or create RealHiveClient instance
 */
export function getRealHiveClient(config?: RealHiveClientConfig): RealHiveClient {
  if (!realHiveClient) {
    realHiveClient = new RealHiveClient(config);
  }
  return realHiveClient;
}

/**
 * Initialize RealHiveClient with specific config
 */
export function initRealHiveClient(config: RealHiveClientConfig): RealHiveClient {
  if (realHiveClient) {
    realHiveClient.disconnect().catch(console.error);
  }
  realHiveClient = new RealHiveClient(config);
  return realHiveClient;
}

export default RealHiveClient;