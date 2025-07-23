import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { getRealHiveClient, UIAgent, UITask, UISwarmStatus } from '../api/real-hive-client'
import type { SwarmTopology, AgentType, TaskPriority } from '../../../../src/hive-mind/types.js'

// Re-export types for convenience
export type { SwarmTopology, AgentType, TaskPriority }

interface Agent extends UIAgent {
  taskCount: number
}

interface Task extends UITask {
  // Additional UI-specific properties
}

interface SwarmState {
  // Connection state
  connected: boolean
  connecting: boolean
  connectionError: string | null
  
  // Swarm configuration
  topology: SwarmTopology
  swarmId: string | null
  swarmName: string | null
  maxAgents: number
  
  // Agents and tasks from real HiveMind
  agents: Agent[]
  tasks: Task[]
  
  // Status and metrics
  swarmStatus: UISwarmStatus | null
  health: 'healthy' | 'degraded' | 'critical' | 'unknown'
  uptime: number
  
  // Statistics
  stats: {
    totalAgents: number
    activeAgents: number
    totalTasks: number
    pendingTasks: number
    completedTasks: number
    failedTasks: number
    avgTaskCompletion: number
    messageThroughput: number
    consensusSuccessRate: number
    memoryHitRate: number
    agentUtilization: number
  }
  
  warnings: string[]
  
  // Actions
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  initSwarm: (params: { topology: SwarmTopology, maxAgents?: number, name?: string }) => Promise<void>
  spawnAgent: (type: AgentType, name?: string) => Promise<void>
  removeAgent: (agentId: string) => Promise<void>
  submitTask: (description: string, priority: TaskPriority, strategy?: string) => Promise<void>
  cancelTask: (taskId: string) => Promise<void>
  updateStatus: () => Promise<void>
  
  // Legacy compatibility
  setTopology: (topology: SwarmTopology) => void
  addAgent: (agent: Agent) => void
  updateAgentStatus: (agentId: string, status: Agent['status']) => void
  incrementTaskCount: () => void
  activeTaskCount: number
  completedTaskCount: number
}

export const useSwarmStore = create<SwarmState>()(
  subscribeWithSelector((set, get) => ({
    // Connection state
    connected: false,
    connecting: false,
    connectionError: null,
    
    // Swarm configuration
    topology: 'hierarchical',
    swarmId: null,
    swarmName: null,
    maxAgents: 8,
    
    // Data from real HiveMind
    agents: [],
    tasks: [],
    
    // Status
    swarmStatus: null,
    health: 'unknown',
    uptime: 0,
    
    // Statistics
    stats: {
      totalAgents: 0,
      activeAgents: 0,
      totalTasks: 0,
      pendingTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      avgTaskCompletion: 0,
      messageThroughput: 0,
      consensusSuccessRate: 0,
      memoryHitRate: 0,
      agentUtilization: 0
    },
    
    warnings: [],
    
    // Legacy compatibility
    activeTaskCount: 0,
    completedTaskCount: 0,

    // Real HiveMind actions
    connect: async () => {
      const state = get()
      if (state.connecting || state.connected) return
      
      set({ connecting: true, connectionError: null })
      
      try {
        const client = getRealHiveClient()
        
        // Set up event listeners
        client.on('connected', ({ swarmId }) => {
          set({ 
            connected: true, 
            connecting: false, 
            swarmId,
            connectionError: null 
          })
          // Start periodic status updates
          get().updateStatus()
        })
        
        client.on('disconnected', () => {
          set({ 
            connected: false, 
            connecting: false, 
            swarmId: null,
            agents: [],
            tasks: [],
            swarmStatus: null 
          })
        })
        
        client.on('error', (error) => {
          set({ 
            connecting: false, 
            connectionError: error.message || 'Connection failed' 
          })
        })
        
        client.on('statusUpdate', (status: UISwarmStatus) => {
          set({
            swarmStatus: status,
            agents: status.agents.map(a => ({ ...a, taskCount: a.tasks })),
            tasks: status.tasks,
            health: status.health,
            uptime: status.uptime,
            stats: status.stats,
            warnings: status.warnings,
            topology: status.topology,
            swarmName: status.name
          })
        })
        
        client.on('agentSpawned', (agent: UIAgent) => {
          set((state) => ({
            agents: [...state.agents, { ...agent, taskCount: agent.tasks }]
          }))
        })
        
        client.on('taskSubmitted', (task: UITask) => {
          set((state) => ({
            tasks: [...state.tasks, task]
          }))
        })
        
        // Connect to HiveMind
        if (!client.isConnected()) {
          await client.connect()
        }
        
      } catch (error) {
        console.error('Failed to connect to HiveMind:', error)
        set({ 
          connecting: false, 
          connectionError: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    },
    
    disconnect: async () => {
      try {
        const client = getRealHiveClient()
        await client.disconnect()
      } catch (error) {
        console.error('Error disconnecting:', error)
      }
    },
    
    initSwarm: async (params) => {
      try {
        const client = getRealHiveClient()
        const swarmId = await client.initSwarm(params)
        set({ 
          swarmId, 
          topology: params.topology, 
          maxAgents: params.maxAgents || 8,
          swarmName: params.name || 'Custom Swarm'
        })
        await get().updateStatus()
      } catch (error) {
        console.error('Failed to initialize swarm:', error)
        set({ connectionError: error instanceof Error ? error.message : 'Failed to initialize swarm' })
      }
    },
    
    spawnAgent: async (type, name) => {
      try {
        const client = getRealHiveClient()
        await client.spawnAgent({ type, name })
        // Agent will be added via the 'agentSpawned' event
      } catch (error) {
        console.error('Failed to spawn agent:', error)
      }
    },
    
    removeAgent: async (agentId) => {
      try {
        // Note: Real HiveMind doesn't have removeAgent method yet
        // For now, just remove from UI state
        set((state) => ({
          agents: state.agents.filter(a => a.id !== agentId)
        }))
      } catch (error) {
        console.error('Failed to remove agent:', error)
      }
    },
    
    submitTask: async (description, priority, strategy = 'adaptive') => {
      try {
        const client = getRealHiveClient()
        await client.submitTask({ 
          description, 
          priority, 
          strategy: strategy as any
        })
        // Task will be added via the 'taskSubmitted' event
      } catch (error) {
        console.error('Failed to submit task:', error)
      }
    },
    
    cancelTask: async (taskId) => {
      try {
        const client = getRealHiveClient()
        await client.cancelTask(taskId)
        // Remove from local state
        set((state) => ({
          tasks: state.tasks.filter(t => t.id !== taskId)
        }))
      } catch (error) {
        console.error('Failed to cancel task:', error)
      }
    },
    
    updateStatus: async () => {
      try {
        const client = getRealHiveClient()
        if (!client.isConnected()) return
        
        const status = await client.getSwarmStatus()
        if (status) {
          set({
            swarmStatus: status,
            agents: status.agents.map(a => ({ ...a, taskCount: a.tasks })),
            tasks: status.tasks,
            health: status.health,
            uptime: status.uptime,
            stats: status.stats,
            warnings: status.warnings,
            topology: status.topology,
            swarmName: status.name
          })
        }
      } catch (error) {
        console.error('Failed to update status:', error)
      }
    },
    
    // Legacy compatibility methods
    setTopology: (topology) => set({ topology }),
    
    addAgent: (agent) => set((state) => ({
      agents: [...state.agents, agent]
    })),
    
    updateAgentStatus: (agentId, status) => set((state) => ({
      agents: state.agents.map(a => 
        a.id === agentId ? { ...a, status } : a
      )
    })),
    
    incrementTaskCount: () => set((state) => ({
      completedTaskCount: state.completedTaskCount + 1,
      stats: { ...state.stats, completedTasks: state.stats.completedTasks + 1 }
    })),
  }))
)

// Initialize connection on store creation
setTimeout(() => {
  const store = useSwarmStore.getState()
  if (!store.connected && !store.connecting) {
    store.connect().catch(console.error)
  }
}, 100)