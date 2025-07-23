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
  RefreshCw 
} from 'lucide-react'

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
}

// Custom node component for agents
const AgentNode = ({ data }: { data: Agent }) => {
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
    <div className={`bg-black border-2 ${statusColors[data.status]} rounded-lg p-4 min-w-[200px] shadow-lg`}>
      <div className={`text-xs px-2 py-1 rounded ${typeColors[data.type] || 'bg-gray-700'} text-green-400 mb-2`}>
        {data.type.toUpperCase()}
      </div>
      <div className="text-green-400 font-bold text-sm mb-1">{data.name}</div>
      <div className="text-green-300 text-xs mb-2">{data.model || 'HiveMind'}</div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-green-500">Tasks: {data.tasks}</span>
        <span className="text-green-500">Perf: {data.performance}%</span>
      </div>
      {data.memory && (
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-blue-400">Mem: {data.memory}</span>
          <span className="text-yellow-400">CPU: {data.cpu}%</span>
        </div>
      )}
      {data.currentTask && (
        <div className="mt-2 text-green-300 text-xs truncate">
          Task: {data.currentTask}
        </div>
      )}
      {data.status === 'busy' && (
        <div className="mt-2 text-yellow-400 text-xs animate-pulse">
          Processing...
        </div>
      )}
      {data.status === 'error' && (
        <div className="mt-2 text-red-400 text-xs">
          Error State
        </div>
      )}
    </div>
  )
}

const nodeTypes = {
  agent: AgentNode,
}

function SwarmView() {
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

  // Update nodes when agents change
  useEffect(() => {
    if (agents.length === 0) {
      setNodes([])
      setEdges([])
      return
    }

    const newNodes: Node[] = agents.map((agent, index) => {
      const angle = (index / agents.length) * 2 * Math.PI
      const radius = Math.min(250, 50 + agents.length * 15) // Dynamic radius based on agent count
      const x = 400 + radius * Math.cos(angle)
      const y = 300 + radius * Math.sin(angle)

      return {
        id: agent.id,
        type: 'agent',
        position: { x, y },
        data: agent,
      }
    })
    setNodes(newNodes)

    // Create topology-based connections
    const newEdges: Edge[] = []
    
    if (topology === 'mesh') {
      // Mesh: all agents connected to each other
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
      // Hierarchical: coordinators at center, others connect to them
      const coordinators = agents.filter(a => a.type === 'coordinator')
      const workers = agents.filter(a => a.type !== 'coordinator')
      
      // Connect workers to coordinators
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
      
      // Connect coordinators to each other
      coordinators.forEach((coord1, i) => {
        coordinators.forEach((coord2, j) => {
          if (i < j) {
            newEdges.push({
              id: `${coord1.id}-${coord2.id}`,
              source: coord1.id,
              target: coord2.id,
              type: 'smoothstep',
              animated: coord1.status === 'busy' || coord2.status === 'busy',
              style: {
                stroke: '#ffff00',
                strokeWidth: 3,
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#ffff00',
              },
            })
          }
        })
      })
    } else if (topology === 'ring') {
      // Ring: agents connected in a circle
      agents.forEach((agent, i) => {
        const nextAgent = agents[(i + 1) % agents.length]
        newEdges.push({
          id: `${agent.id}-${nextAgent.id}`,
          source: agent.id,
          target: nextAgent.id,
          type: 'smoothstep',
          animated: agent.status === 'busy' || nextAgent.status === 'busy',
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
    } else if (topology === 'star') {
      // Star: one central coordinator, others connect to it
      const central = agents.find(a => a.type === 'coordinator') || agents[0]
      if (central) {
        agents.forEach(agent => {
          if (agent.id !== central.id) {
            newEdges.push({
              id: `${central.id}-${agent.id}`,
              source: central.id,
              target: agent.id,
              type: 'smoothstep',
              animated: agent.status === 'busy' || central.status === 'busy',
              style: {
                stroke: '#00ff00',
                strokeWidth: 2,
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#00ff00',
              },
            })
          }
        })
      }
    }
    
    setEdges(newEdges)
  }, [agents, topology, setNodes, setEdges])

  const handleSpawnAgent = async () => {
    await spawnAgent(newAgentType, `${newAgentType.toUpperCase()}-${Date.now().toString().slice(-4)}`)
  }

  const handleRemoveAgent = async (id: string) => {
    await removeAgent(id)
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

  const handleInitSwarm = async () => {
    await initSwarm({
      topology: newTopology,
      maxAgents: 8,
      name: `${newTopology.toUpperCase()}-Swarm-${Date.now().toString().slice(-4)}`
    })
  }

  // Show connection status
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

  if (connectionError) {
    return (
      <div className="w-full h-full bg-black text-green-400 font-mono flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-2xl mb-4">❌ CONNECTION FAILED</div>
          <div className="text-red-600 mb-4">{connectionError}</div>
          <Button onClick={() => connect()} className="bg-green-500 hover:bg-green-600 text-black">
            🔄 RECONNECT TO HIVEMIND
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-black text-green-400 font-mono">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
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

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-500 rounded">
            <div className="text-yellow-400 font-bold text-sm mb-1">⚠️ System Alerts:</div>
            {warnings.slice(0, 3).map((warning, i) => (
              <div key={i} className="text-yellow-300 text-xs">• {warning}</div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-5 gap-4 mb-6">
          {/* Agent Control */}
          <Card className="bg-black border-green-500">
            <CardHeader className="pb-2">
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
                <option value="reviewer">Reviewer</option>
                <option value="monitor">Monitor</option>
                <option value="coordinator">Coordinator</option>
                <option value="analyst">Analyst</option>
                <option value="optimizer">Optimizer</option>
                <option value="documenter">Documenter</option>
                <option value="specialist">Specialist</option>
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
            <CardHeader className="pb-2">
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

          {/* Topology Control */}
          <Card className="bg-black border-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-green-400 flex items-center gap-2 text-sm">
                <Settings className="w-4 h-4" />
                Topology
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <select
                value={newTopology}
                onChange={(e) => setNewTopology(e.target.value as SwarmTopology)}
                className="w-full mb-2 bg-black border border-green-500 text-green-400 p-1 text-xs rounded"
              >
                <option value="hierarchical">Hierarchical</option>
                <option value="mesh">Mesh</option>
                <option value="ring">Ring</option>
                <option value="star">Star</option>
              </select>
              <Button
                onClick={handleInitSwarm}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white text-xs py-1"
                disabled={!connected}
              >
                Reconfigure
              </Button>
            </CardContent>
          </Card>

          {/* Active Agents */}
          <Card className="bg-black border-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-green-400 flex items-center gap-2 text-sm">
                <Users className="w-4 h-4" />
                Agents ({agents.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {agents.slice(0, 4).map(agent => (
                  <div key={agent.id} className="flex items-center justify-between text-xs">
                    <span className={`truncate mr-1 ${
                      agent.status === 'busy' ? 'text-yellow-400' :
                      agent.status === 'error' ? 'text-red-400' :
                      'text-green-400'
                    }`}>
                      {agent.name}
                    </span>
                    <Button
                      onClick={() => handleRemoveAgent(agent.id)}
                      size="sm"
                      className="bg-red-500 hover:bg-red-600 text-white p-0 h-4 w-4"
                    >
                      <Trash2 className="w-2 h-2" />
                    </Button>
                  </div>
                ))}
                {agents.length > 4 && (
                  <div className="text-xs text-green-600">+{agents.length - 4} more</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Status */}
          <Card className="bg-black border-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-green-400 text-sm">System Status</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Active: {stats.activeAgents}/{stats.totalAgents}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="w-3 h-3 text-yellow-500" />
                  <span>Tasks: {stats.totalTasks}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-blue-500" />
                  <span>Pending: {stats.pendingTasks}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-purple-500" />
                  <span>Util: {Math.round(stats.agentUtilization)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Topology View */}
        <div className="relative">
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
            <Badge className="bg-green-500 text-black">
              {topology.toUpperCase()} TOPOLOGY
            </Badge>
            {swarmId && (
              <Badge className="bg-blue-500 text-white text-xs">
                ID: {swarmId.slice(-8)}
              </Badge>
            )}
          </div>
          
          {/* Tasks Display */}
          <div className="absolute top-4 right-4 z-10 bg-black/80 p-2 rounded border border-green-500 max-w-xs">
            <div className="text-green-400 text-xs font-bold mb-1">Recent Tasks:</div>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {tasks.slice(-3).map(task => (
                <div key={task.id} className="text-xs">
                  <div className={`truncate ${
                    task.status === 'completed' ? 'text-green-400' :
                    task.status === 'in_progress' ? 'text-yellow-400' :
                    task.status === 'failed' ? 'text-red-400' :
                    'text-gray-400'
                  }`}>
                    {task.description}
                  </div>
                  <div className="text-gray-500 text-xs">
                    {task.status} • {task.priority}
                  </div>
                </div>
              )) || (
                <div className="text-gray-500 text-xs">No tasks submitted</div>
              )}
            </div>
          </div>
          
          <div className="h-[500px] border-2 border-green-500 rounded-lg overflow-hidden">
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
          </div>
        </div>

        {/* Selected Agent Info */}
        {selectedAgent && (
          <div className="mt-4 p-4 bg-green-900/20 border border-green-500 rounded">
            <div className="text-green-400 font-bold mb-2">
              Selected Agent: {agents.find(a => a.id === selectedAgent)?.name}
            </div>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-green-600">Type:</div>
                <div>{agents.find(a => a.id === selectedAgent)?.type}</div>
              </div>
              <div>
                <div className="text-green-600">Status:</div>
                <div>{agents.find(a => a.id === selectedAgent)?.status}</div>
              </div>
              <div>
                <div className="text-green-600">Tasks:</div>
                <div>{agents.find(a => a.id === selectedAgent)?.tasks}</div>
              </div>
              <div>
                <div className="text-green-600">Performance:</div>
                <div>{agents.find(a => a.id === selectedAgent)?.performance}%</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SwarmView