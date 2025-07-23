import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface RealTimeSystemState {
  // Connection state
  connected: boolean;
  lastUpdate: Date | null;
  error: string | null;
  
  // Swarm state
  swarms: SwarmState[];
  activeSwarmId: string | null;
  
  // Agent state
  agents: AgentState[];
  
  // Task state
  tasks: TaskState[];
  
  // Memory state
  memory: MemoryNamespace[];
  
  // Performance state
  performance: PerformanceMetrics;
  
  // System logs
  logs: LogEntry[];
  
  // Actions
  connect: () => void;
  disconnect: () => void;
  updateState: (newState: Partial<RealTimeSystemState>) => void;
  handleUpdate: (type: string, data: any) => void;
  addLog: (entry: LogEntry) => void;
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

export interface MemoryNamespace {
  namespace: string;
  totalEntries: number;
  totalSize: number;
  recentEntries: Array<{
    key: string;
    size: number;
    timestamp: Date;
    operation: 'store' | 'retrieve' | 'delete';
  }>;
}

export interface PerformanceMetrics {
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

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  component?: string;
  data?: any;
}

const useRealTimeStore = create<RealTimeSystemState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    connected: false,
    lastUpdate: null,
    error: null,
    swarms: [],
    activeSwarmId: null,
    agents: [],
    tasks: [],
    memory: [],
    performance: {
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
    },
    logs: [],
    
    // Actions
    connect: () => {
      set({ connected: true, error: null });
    },
    
    disconnect: () => {
      set({ connected: false });
    },
    
    updateState: (newState) => {
      set({ 
        ...newState, 
        lastUpdate: new Date() 
      });
    },
    
    handleUpdate: (type, data) => {
      const state = get();
      
      switch (type) {
        case 'initial-state':
          set({
            swarms: data.swarms || [],
            agents: data.agents || [],
            tasks: data.tasks || [],
            memory: data.memory || [],
            performance: data.performance || state.performance,
            lastUpdate: new Date()
          });
          break;
          
        case 'swarm-update':
          if (data.action === 'created') {
            set({
              swarms: [...state.swarms, data.data],
              lastUpdate: new Date()
            });
          } else if (data.action === 'updated') {
            set({
              swarms: state.swarms.map(s => 
                s.id === data.data.id ? { ...s, ...data.data } : s
              ),
              lastUpdate: new Date()
            });
          }
          break;
          
        case 'agent-update':
          if (data.action === 'created') {
            set({
              agents: [...state.agents, data.data],
              lastUpdate: new Date()
            });
          } else if (data.action === 'updated') {
            set({
              agents: state.agents.map(a => 
                a.id === data.data.id ? { ...a, ...data.data } : a
              ),
              lastUpdate: new Date()
            });
          }
          break;
          
        case 'task-update':
          if (data.action === 'created') {
            set({
              tasks: [...state.tasks, data.data],
              lastUpdate: new Date()
            });
          } else if (data.action === 'updated') {
            set({
              tasks: state.tasks.map(t => 
                t.id === data.data.id ? { ...t, ...data.data } : t
              ),
              lastUpdate: new Date()
            });
          }
          break;
          
        case 'performance-update':
          set({
            performance: { ...state.performance, ...data },
            lastUpdate: new Date()
          });
          break;
          
        case 'memory-update':
          set({
            memory: Array.isArray(data) ? data : [data],
            lastUpdate: new Date()
          });
          break;
          
        case 'log-update':
          const logEntry: LogEntry = {
            id: `${Date.now()}-${Math.random()}`,
            timestamp: new Date(data.timestamp),
            level: 'info',
            message: data.line,
            component: data.filename?.replace('.log', '')
          };
          
          set({
            logs: [...state.logs.slice(-999), logEntry], // Keep last 1000 logs
            lastUpdate: new Date()
          });
          break;
          
        case 'system-update':
          get().addLog({
            id: `${Date.now()}-${Math.random()}`,
            timestamp: new Date(data.timestamp),
            level: data.status === 'online' ? 'info' : 'warn',
            message: `${data.component} is ${data.status}`,
            component: data.component
          });
          break;
          
        default:
          console.warn('Unknown update type:', type);
      }
    },
    
    addLog: (entry) => {
      set(state => ({
        logs: [...state.logs.slice(-999), entry],
        lastUpdate: new Date()
      }));
    }
  }))
);

export default useRealTimeStore;