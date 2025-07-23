import React, { useCallback, useEffect, useState } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  ConnectionMode,
  useNodesState,
  useEdgesState,
  MiniMap,
  MarkerType,
} from 'react-flow-renderer'
import { useSwarmStore, SwarmTopology, AgentType, TaskPriority } from '../../stores/swarmStore'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { 
  Play, 
  Plus, 
  Trash2, 
  Users, 
  Activity, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Settings,
  Zap,
  RefreshCw,
  Database,
  Brain,
  FileText,
  History,
  ArrowRight,
  Layers,
  Search
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Agent type definitions (extends UI Agent)
interface Agent {
  id: string
  name: string
  type: AgentType
  status: 'idle' | 'busy' | 'error' | 'offline'
  tasks: number
  performance: number
  model?: string
  memory?: string
  cpu?: number
  currentTask?: string | null
  completedTasks?: number
  memoryUsage?: number
  lastActive?: string
}

interface MemoryEntry {
  id: string
  agentId: string
  key: string
  value: any
  timestamp: string
  type: string
}

interface TaskDetail {
  id: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  priority: TaskPriority
  assignedTo?: string
  result?: any
  startTime?: string
  endTime?: string
  dependencies?: string[]
}

// Custom node component for agents with memory indicator
const AgentNode = ({ data }: { data: Agent & { memoryEntries?: number } }) => {
  const statusColors = {
    idle: 'border-green-500',
    busy: 'border-yellow-500',
    error: 'border-red-500',
    offline: 'border-gray-500',
  }

  const typeColors = {
    researcher: 'bg-blue-900',
    architect: 'bg-purple-900',
    coder: 'bg-green-900',
    tester: 'bg-orange-900',
    reviewer: 'bg-pink-900',
    monitor: 'bg-gray-700',
    coordinator: 'bg-indigo-900',
    analyst: 'bg-cyan-900',
    optimizer: 'bg-red-900',
    documenter: 'bg-yellow-900',
    specialist: 'bg-violet-900',
  }

  return (
    <div className={`bg-black border-2 ${statusColors[data.status]} rounded-lg p-4 min-w-[220px] shadow-lg relative`}>
      {/* Memory indicator */}
      {data.memoryEntries && data.memoryEntries > 0 && (
        <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
          {data.memoryEntries}
        </div>
      )}
      
      <div className={`text-xs px-2 py-1 rounded ${typeColors[data.type] || 'bg-gray-700'} text-green-400 mb-2`}>
        {data.type.toUpperCase()}
      </div>
      <div className="text-green-400 font-bold text-sm mb-1">{data.name}</div>
      <div className="text-green-300 text-xs mb-2">{data.model || 'HiveMind'}</div>
      
      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
        <div className="text-green-500">
          <span className="text-green-600">Tasks:</span> {data.completedTasks || 0}/{data.tasks}
        </div>
        <div className="text-green-500">
          <span className="text-green-600">Perf:</span> {data.performance}%
        </div>
        <div className="text-blue-400">
          <span className="text-blue-600">Mem:</span> {data.memoryUsage || 0}KB
        </div>
        <div className="text-yellow-400">
          <span className="text-yellow-600">CPU:</span> {data.cpu || 0}%
        </div>
      </div>
      
      {data.currentTask && (
        <div className="mt-2 p-2 bg-green-900/30 rounded">
          <div className="text-green-300 text-xs truncate">
            <Clock className="inline w-3 h-3 mr-1" />
            {data.currentTask}
          </div>
        </div>
      )}
      
      {data.status === 'busy' && (
        <div className="mt-2 text-yellow-400 text-xs animate-pulse flex items-center">
          <Activity className="w-3 h-3 mr-1" />
          Processing...
        </div>
      )}
      
      {data.lastActive && (
        <div className="mt-1 text-gray-500 text-xs">
          Last: {new Date(data.lastActive).toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}

const nodeTypes = {
  agent: AgentNode,
}

function SwarmViewEnhanced() {
  const { 
    agents, 
    tasks, 
    connected,
    connecting,
    connectionError,
    topology,
    swarmId,
    swarmName,
    health,
    stats,
    warnings,
    connect,
    initSwarm,
    spawnAgent,
    removeAgent,
    submitTask,
    cancelTask,
    updateStatus
  } = useSwarmStore()

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [newAgentType, setNewAgentType] = useState<AgentType>('researcher')
  const [newTopology, setNewTopology] = useState<SwarmTopology>('hierarchical')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium')
  const [activeView, setActiveView] = useState<'topology' | 'tasks' | 'memory'>('topology')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Mock memory data - in real app, this would come from API
  const [memoryData, setMemoryData] = useState<MemoryEntry[]>([])
  const [taskDetails, setTaskDetails] = useState<TaskDetail[]>([])

  // Fetch memory and task data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch memory data
        const memResponse = await fetch('http://localhost:3001/api/memory/swarm')
        if (memResponse.ok) {
          const data = await memResponse.json()
          console.log('Memory data:', data)
          
          // Try multiple table sources for memory entries
          const memoryEntries: MemoryEntry[] = []
          
          // Check agent_interactions table
          if (data.tableData?.agent_interactions?.data) {
            data.tableData.agent_interactions.data.forEach((item: any, index: number) => {
              memoryEntries.push({
                id: item.id || `agent-int-${index}`,
                agentId: item.agent_id || 'unknown',
                key: item.action || item.interaction_type || 'interaction',
                value: item.details || item.data || item,
                timestamp: item.timestamp || new Date().toISOString(),
                type: 'interaction'
              })
            })
          }
          
          // Check memory_entries table
          if (data.tableData?.memory_entries?.data) {
            data.tableData.memory_entries.data.forEach((item: any, index: number) => {
              memoryEntries.push({
                id: item.id || `mem-${index}`,
                agentId: item.agent_id || 'system',
                key: item.key || 'memory',
                value: item.value || item.data || item,
                timestamp: item.created_at || item.timestamp || new Date().toISOString(),
                type: 'memory'
              })
            })
          }
          
          // Check for raw entries if no tableData
          if (memoryEntries.length === 0 && data.entries) {
            data.entries.forEach((item: any, index: number) => {
              memoryEntries.push({
                id: item.id || `entry-${index}`,
                agentId: item.agent_id || 'unknown',
                key: item.key || 'entry',
                value: item.value || item,
                timestamp: item.timestamp || new Date().toISOString(),
                type: 'entry'
              })
            })
          }
          
          // Add mock data if no real data exists
          if (memoryEntries.length === 0) {
            memoryEntries.push(
              {
                id: 'mock-1',
                agentId: agents[0]?.id || 'agent-1',
                key: 'initialization',
                value: { status: 'Agent initialized', config: { model: 'gpt-4' } },
                timestamp: new Date().toISOString(),
                type: 'system'
              },
              {
                id: 'mock-2',
                agentId: agents[0]?.id || 'agent-1',
                key: 'task_assignment',
                value: 'Processing research task on neural networks',
                timestamp: new Date(Date.now() - 60000).toISOString(),
                type: 'task'
              },
              {
                id: 'mock-3',
                agentId: agents[1]?.id || 'agent-2',
                key: 'analysis_result',
                value: { findings: ['Pattern detected', 'Optimization opportunity found'] },
                timestamp: new Date(Date.now() - 120000).toISOString(),
                type: 'analysis'
              }
            )
          }
          
          console.log('Processed memory entries:', memoryEntries)
          setMemoryData(memoryEntries)
        }

        // Fetch task details
        const taskResponse = await fetch('http://localhost:3001/api/hive/tasks')
        if (taskResponse.ok) {
          const data = await taskResponse.json()
          console.log('Task data:', data)
          let tasks = data.tasks || data || []
          
          // Add mock tasks if no real tasks exist
          if (tasks.length === 0 && agents.length > 0) {
            tasks = [
              {
                id: 'task-mock-1',
                description: 'Research neural network architectures',
                status: 'in_progress',
                priority: 'high',
                assignedTo: agents[0]?.id,
                startTime: new Date(Date.now() - 300000).toISOString(),
                dependencies: []
              },
              {
                id: 'task-mock-2',
                description: 'Implement data preprocessing pipeline',
                status: 'completed',
                priority: 'medium',
                assignedTo: agents[1]?.id,
                startTime: new Date(Date.now() - 600000).toISOString(),
                endTime: new Date(Date.now() - 60000).toISOString(),
                dependencies: [],
                result: { success: true, output: 'Pipeline implemented successfully' }
              },
              {
                id: 'task-mock-3',
                description: 'Optimize model performance',
                status: 'pending',
                priority: 'critical',
                dependencies: ['task-mock-1', 'task-mock-2']
              }
            ]
          }
          
          setTaskDetails(tasks)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  // Update nodes with memory counts
  useEffect(() => {
    if (agents.length === 0) {
      setNodes([])
      setEdges([])
      return
    }

    // Count memory entries per agent
    const memoryCountByAgent = memoryData.reduce((acc, entry) => {
      acc[entry.agentId] = (acc[entry.agentId] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const newNodes: Node[] = agents.map((agent, index) => {
      const angle = (index / agents.length) * 2 * Math.PI
      const radius = Math.min(250, 50 + agents.length * 15)
      const x = 400 + radius * Math.cos(angle)
      const y = 300 + radius * Math.sin(angle)

      return {
        id: agent.id,
        type: 'agent',
        position: { x, y },
        data: { 
          ...agent, 
          memoryEntries: memoryCountByAgent[agent.id] || 0,
          completedTasks: taskDetails.filter(t => t.assignedTo === agent.id && t.status === 'completed').length
        },
      }
    })
    setNodes(newNodes)

    // Create topology-based connections with task flow indicators
    const newEdges: Edge[] = []
    
    // Add task dependency edges
    taskDetails.forEach(task => {
      if (task.dependencies && task.assignedTo) {
        task.dependencies.forEach(depId => {
          const depTask = taskDetails.find(t => t.id === depId)
          if (depTask?.assignedTo && depTask.assignedTo !== task.assignedTo) {
            newEdges.push({
              id: `task-${depTask.id}-${task.id}`,
              source: depTask.assignedTo,
              target: task.assignedTo,
              type: 'smoothstep',
              animated: true,
              style: {
                stroke: '#ff00ff',
                strokeWidth: 2,
                strokeDasharray: '5 5'
              },
              label: 'task dep',
              labelStyle: { fill: '#ff00ff', fontSize: 10 }
            })
          }
        })
      }
    })

    // Add topology connections
    if (topology === 'mesh') {
      agents.forEach((agent1, i) => {
        agents.forEach((agent2, j) => {
          if (i < j) {
            newEdges.push({
              id: `${agent1.id}-${agent2.id}`,
              source: agent1.id,
              target: agent2.id,
              type: 'smoothstep',
              animated: agent1.status === 'busy' || agent2.status === 'busy',
              style: {
                stroke: '#00ff00',
                strokeWidth: 1,
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#00ff00',
              },
            })
          }
        })
      })
    } else if (topology === 'hierarchical') {
      const coordinators = agents.filter(a => a.type === 'coordinator')
      const workers = agents.filter(a => a.type !== 'coordinator')
      
      workers.forEach(worker => {
        coordinators.forEach(coordinator => {
          newEdges.push({
            id: `${coordinator.id}-${worker.id}`,
            source: coordinator.id,
            target: worker.id,
            type: 'smoothstep',
            animated: worker.status === 'busy' || coordinator.status === 'busy',
            style: {
              stroke: '#00ff00',
              strokeWidth: 2,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#00ff00',
            },
          })
        })
      })
    }
    
    setEdges(newEdges)
  }, [agents, topology, memoryData, taskDetails, setNodes, setEdges])

  const handleSpawnAgent = async () => {
    await spawnAgent(newAgentType, `${newAgentType.toUpperCase()}-${Date.now().toString().slice(-4)}`)
  }

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedAgent(node.id)
  }, [])

  const handleSubmitTask = async () => {
    if (taskDescription.trim()) {
      await submitTask(taskDescription, taskPriority)
      setTaskDescription('')
    }
  }

  // Get agent-specific memory and tasks
  const getAgentMemory = (agentId: string) => {
    return memoryData.filter(m => m.agentId === agentId)
  }

  const getAgentTasks = (agentId: string) => {
    return taskDetails.filter(t => t.assignedTo === agentId)
  }

  if (connecting) {
    return (
      <div className="w-full h-full bg-black text-green-400 font-mono flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-2xl mb-4">🧠 INITIALIZING HIVEMIND</div>
          <div className="text-green-600">Establishing neural network connections...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-black text-green-400 font-mono overflow-hidden">
      <div className="p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold animate-pulse">🧠 HIVEMIND SWARM CONTROL</h1>
            <p className="text-green-300">
              Real-time neural agent coordination • {swarmName || 'HiveMind Active'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`px-3 py-1 rounded text-sm ${
              health === 'healthy' ? 'bg-green-900 text-green-400' :
              health === 'degraded' ? 'bg-yellow-900 text-yellow-400' :
              health === 'critical' ? 'bg-red-900 text-red-400' :
              'bg-gray-900 text-gray-400'
            }`}>
              {health.toUpperCase()}
            </div>
            <Button 
              onClick={() => updateStatus()} 
              size="sm" 
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveView('topology')}
            className={`px-4 py-2 rounded font-mono text-sm transition-all flex items-center gap-2 ${
              activeView === 'topology' 
                ? 'bg-green-900 text-green-400 border border-green-400' 
                : 'bg-black border border-green-900 text-green-600 hover:border-green-400'
            }`}
          >
            <Layers className="w-4 h-4" />
            Topology View
          </button>
          <button
            onClick={() => setActiveView('tasks')}
            className={`px-4 py-2 rounded font-mono text-sm transition-all flex items-center gap-2 ${
              activeView === 'tasks' 
                ? 'bg-green-900 text-green-400 border border-green-400' 
                : 'bg-black border border-green-900 text-green-600 hover:border-green-400'
            }`}
          >
            <FileText className="w-4 h-4" />
            Task Flow ({taskDetails.length})
          </button>
          <button
            onClick={() => setActiveView('memory')}
            className={`px-4 py-2 rounded font-mono text-sm transition-all flex items-center gap-2 ${
              activeView === 'memory' 
                ? 'bg-green-900 text-green-400 border border-green-400' 
                : 'bg-black border border-green-900 text-green-600 hover:border-green-400'
            }`}
          >
            <Database className="w-4 h-4" />
            Memory Trace ({memoryData.length})
          </button>
        </div>

        {/* Control Panel */}
        <div className="grid grid-cols-6 gap-4 mb-4">
          {/* Agent Control */}
          <Card className="bg-black border-green-500">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-green-400 flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4" />
                Spawn Agent
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <select
                value={newAgentType}
                onChange={(e) => setNewAgentType(e.target.value as AgentType)}
                className="w-full mb-2 bg-black border border-green-500 text-green-400 p-1 text-xs rounded"
              >
                <option value="researcher">Researcher</option>
                <option value="architect">Architect</option>
                <option value="coder">Coder</option>
                <option value="tester">Tester</option>
                <option value="coordinator">Coordinator</option>
              </select>
              <Button
                onClick={handleSpawnAgent}
                className="w-full bg-green-500 hover:bg-green-600 text-black text-xs py-1"
                disabled={!connected}
              >
                Spawn
              </Button>
            </CardContent>
          </Card>

          {/* Task Control */}
          <Card className="bg-black border-green-500">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-green-400 flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4" />
                Submit Task
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <input
                type="text"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Task description..."
                className="w-full mb-1 bg-black border border-green-500 text-green-400 p-1 text-xs rounded"
              />
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                className="w-full mb-2 bg-black border border-green-500 text-green-400 p-1 text-xs rounded"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <Button
                onClick={handleSubmitTask}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black text-xs py-1"
                disabled={!connected || !taskDescription.trim()}
              >
                Submit
              </Button>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <Card className="bg-black border-green-500">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-green-400 text-sm">Agents</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-green-400">{agents.length}</div>
              <div className="text-xs text-green-600">
                Active: {agents.filter(a => a.status === 'busy').length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black border-green-500">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-green-400 text-sm">Tasks</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-yellow-400">{taskDetails.length}</div>
              <div className="text-xs text-yellow-600">
                Active: {taskDetails.filter(t => t.status === 'in_progress').length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black border-green-500">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-green-400 text-sm">Memory</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-blue-400">{memoryData.length}</div>
              <div className="text-xs text-blue-600">
                Entries
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black border-green-500">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-green-400 text-sm">Performance</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-purple-400">
                {Math.round(stats.agentUtilization)}%
              </div>
              <div className="text-xs text-purple-600">
                Utilization
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main View Area */}
        <div className="flex-1 border-2 border-green-500 rounded-lg overflow-hidden relative">
          {activeView === 'topology' && (
            <>
              <div className="absolute top-4 left-4 z-10">
                <Badge className="bg-green-500 text-black">
                  {topology.toUpperCase()} TOPOLOGY
                </Badge>
              </div>
              
              {agents.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-green-600 text-xl mb-4">🤖 No Agents Active</div>
                    <div className="text-green-400 text-sm">
                      Spawn agents to see the neural network topology
                    </div>
                  </div>
                </div>
              ) : (
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onNodeClick={handleNodeClick}
                  nodeTypes={nodeTypes}
                  connectionMode={ConnectionMode.Loose}
                  fitView
                  className="bg-black"
                >
                  <Background color="#00ff00" gap={20} />
                  <Controls className="bg-black border-green-500" />
                  <MiniMap
                    nodeStrokeColor="#00ff00"
                    nodeColor="#000000"
                    nodeBorderRadius={8}
                    className="bg-black border-green-500"
                  />
                </ReactFlow>
              )}
            </>
          )}

          {activeView === 'tasks' && (
            <div className="p-6 h-full overflow-y-auto">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-600" size={16} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search tasks..."
                    className="w-full pl-10 pr-4 py-2 bg-black/50 border border-green-900 text-green-400 placeholder-green-700 focus:outline-none focus:border-green-400 rounded font-mono text-sm"
                  />
                </div>
              </div>

              {taskDetails.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <FileText className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <div className="text-green-400 text-lg mb-2">No Tasks Yet</div>
                    <div className="text-green-600 text-sm">Submit a task to see it appear here</div>
                  </div>
                </div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {taskDetails
                  .filter(task => 
                    (task.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (task.id || '').includes(searchTerm)
                  )
                  .map(task => {
                    const agent = agents.find(a => a.id === task.assignedTo)
                    return (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-black/50 border border-green-900 rounded p-4 hover:border-green-400 transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="text-green-400 font-bold text-sm mb-1">
                              {task.description}
                            </div>
                            <div className="text-xs text-green-600">
                              ID: {task.id}
                            </div>
                          </div>
                          <Badge className={`text-xs ${
                            task.priority === 'critical' ? 'bg-red-500' :
                            task.priority === 'high' ? 'bg-orange-500' :
                            task.priority === 'medium' ? 'bg-yellow-500' :
                            'bg-green-500'
                          } text-black`}>
                            {task.priority}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-xs mb-2">
                          <div className={`flex items-center gap-1 ${
                            task.status === 'completed' ? 'text-green-400' :
                            task.status === 'in_progress' ? 'text-yellow-400' :
                            task.status === 'failed' ? 'text-red-400' :
                            'text-gray-400'
                          }`}>
                            {task.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                            {task.status === 'in_progress' && <Clock className="w-3 h-3" />}
                            {task.status === 'failed' && <AlertCircle className="w-3 h-3" />}
                            {task.status}
                          </div>
                          {agent && (
                            <div className="text-green-600">
                              <Users className="inline w-3 h-3 mr-1" />
                              {agent.name}
                            </div>
                          )}
                        </div>

                        {task.dependencies && task.dependencies.length > 0 && (
                          <div className="text-xs text-blue-400 mb-2">
                            <ArrowRight className="inline w-3 h-3 mr-1" />
                            Depends on: {task.dependencies.join(', ')}
                          </div>
                        )}

                        {task.result && (
                          <div className="mt-2 p-2 bg-black/30 rounded">
                            <div className="text-xs text-green-600 mb-1">Result:</div>
                            <div className="text-xs text-green-300">
                              {typeof task.result === 'string' 
                                ? task.result 
                                : JSON.stringify(task.result, null, 2)
                              }
                            </div>
                          </div>
                        )}

                        {task.startTime && (
                          <div className="text-xs text-gray-500 mt-2">
                            Started: {new Date(task.startTime).toLocaleTimeString()}
                            {task.endTime && ` • Ended: ${new Date(task.endTime).toLocaleTimeString()}`}
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
              </div>
              )}
            </div>
          )}

          {activeView === 'memory' && (
            <div className="p-6 h-full overflow-y-auto">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-600" size={16} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search memory entries..."
                    className="w-full pl-10 pr-4 py-2 bg-black/50 border border-green-900 text-green-400 placeholder-green-700 focus:outline-none focus:border-green-400 rounded font-mono text-sm"
                  />
                </div>
              </div>

              {memoryData.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <Database className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <div className="text-green-400 text-lg mb-2">No Memory Entries Yet</div>
                    <div className="text-green-600 text-sm">Memory traces will appear here as agents work</div>
                  </div>
                </div>
              ) : (
              <div className="space-y-2">
                {memoryData
                  .filter(mem => 
                    (mem.key || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    JSON.stringify(mem.value || {}).toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map(memory => {
                    const agent = agents.find(a => a.id === memory.agentId)
                    return (
                      <motion.div
                        key={memory.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-black/50 border border-green-900 rounded p-3 hover:border-green-400 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Brain className="w-4 h-4 text-blue-400" />
                              <span className="text-xs text-green-600">{memory.type.toUpperCase()}</span>
                              {agent && (
                                <span className="text-xs text-green-400">• {agent.name}</span>
                              )}
                              <span className="text-xs text-gray-500">
                                {new Date(memory.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="text-sm text-green-400 font-mono">
                              {memory.key}
                            </div>
                            {memory.value && (
                              <div className="mt-1 text-xs text-green-300 bg-black/30 p-2 rounded">
                                <pre className="whitespace-pre-wrap">
                                  {typeof memory.value === 'string' 
                                    ? memory.value 
                                    : JSON.stringify(memory.value, null, 2)
                                  }
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
              </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Agent Detail Panel */}
        {selectedAgent && activeView === 'topology' && (
          <div className="mt-4 p-4 bg-green-900/20 border border-green-500 rounded">
            <div className="text-green-400 font-bold mb-3 flex items-center justify-between">
              <span>Agent Details: {agents.find(a => a.id === selectedAgent)?.name}</span>
              <button
                onClick={() => setSelectedAgent(null)}
                className="text-red-400 hover:text-red-300"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Agent Info */}
              <div>
                <div className="text-sm text-green-600 mb-2">Agent Information</div>
                <div className="space-y-1 text-xs">
                  <div><span className="text-green-600">Type:</span> {agents.find(a => a.id === selectedAgent)?.type}</div>
                  <div><span className="text-green-600">Status:</span> {agents.find(a => a.id === selectedAgent)?.status}</div>
                  <div><span className="text-green-600">Performance:</span> {agents.find(a => a.id === selectedAgent)?.performance}%</div>
                  <div><span className="text-green-600">CPU:</span> {agents.find(a => a.id === selectedAgent)?.cpu || 0}%</div>
                  <div><span className="text-green-600">Memory:</span> {agents.find(a => a.id === selectedAgent)?.memoryUsage || 0}KB</div>
                </div>
              </div>

              {/* Task Summary */}
              <div>
                <div className="text-sm text-green-600 mb-2">Task Summary</div>
                <div className="space-y-1 text-xs">
                  {getAgentTasks(selectedAgent).length > 0 ? (
                    <>
                      <div className="text-green-400">
                        Total: {getAgentTasks(selectedAgent).length} tasks
                      </div>
                      <div className="text-yellow-400">
                        Active: {getAgentTasks(selectedAgent).filter(t => t.status === 'in_progress').length}
                      </div>
                      <div className="text-green-500">
                        Completed: {getAgentTasks(selectedAgent).filter(t => t.status === 'completed').length}
                      </div>
                      <div className="mt-2">
                        <div className="text-green-600 mb-1">Recent Tasks:</div>
                        {getAgentTasks(selectedAgent).slice(-3).map(task => (
                          <div key={task.id} className="text-green-400 truncate">
                            • {task.description}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-500">No tasks assigned</div>
                  )}
                </div>
              </div>

              {/* Memory Trace */}
              <div className="col-span-2 mt-2">
                <div className="text-sm text-green-600 mb-2">Memory Trace</div>
                <div className="space-y-1 text-xs max-h-32 overflow-y-auto">
                  {getAgentMemory(selectedAgent).length > 0 ? (
                    getAgentMemory(selectedAgent).slice(-5).map(mem => (
                      <div key={mem.id} className="bg-black/30 p-2 rounded">
                        <div className="text-blue-400">{mem.key}</div>
                        <div className="text-green-300 text-xs truncate">
                          {typeof mem.value === 'string' ? mem.value : JSON.stringify(mem.value)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500">No memory entries</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SwarmViewEnhanced