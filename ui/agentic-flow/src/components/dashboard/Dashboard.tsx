import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSwarmStore } from '../../stores/swarmStore'
import AgentCard from './AgentCard'
import SwarmTopology from './SwarmTopology'
import MetricsDisplay from './MetricsDisplay'
import ActivityLog from './ActivityLog'
import SystemStatus from './SystemStatus'

const Dashboard: React.FC = () => {
  const [time, setTime] = useState(new Date())
  const [systemMetrics, setSystemMetrics] = useState<any>(null)
  
  // Get real data from HiveMind
  const { 
    agents, 
    tasks, 
    stats, 
    health, 
    connected, 
    connecting, 
    connectionError,
    swarmName,
    topology,
    warnings,
    connect,
    updateStatus
  } = useSwarmStore()
  
  // Fetch system metrics
  useEffect(() => {
    const fetchSystemMetrics = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/system/metrics')
        if (response.ok) {
          const data = await response.json()
          setSystemMetrics(data)
        }
      } catch (error) {
        console.error('Failed to fetch system metrics:', error)
      }
    }

    fetchSystemMetrics()
    const interval = setInterval(fetchSystemMetrics, 5000)
    return () => clearInterval(interval)
  }, [])
  
  // Convert stats to metrics format expected by UI
  const metrics = {
    cpu: systemMetrics ? systemMetrics.cpu.usage : (stats.agentUtilization * 100),
    memory: systemMetrics ? systemMetrics.memory.usage : (stats.memoryHitRate * 100),
    tokenRate: stats.messageThroughput,
    tasksCompleted: stats.completedTasks,
    tasksActive: stats.totalTasks - stats.completedTasks - stats.failedTasks,
    tasksPending: stats.pendingTasks
  }

  // Update time and connect to HiveMind
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)
    
    // Connect to HiveMind if not connected
    if (!connected && !connecting && !connectionError) {
      connect()
    }
    
    // Update status periodically
    const statusTimer = setInterval(() => {
      if (connected) {
        updateStatus()
      }
    }, 5000)
    
    return () => {
      clearInterval(timer)
      clearInterval(statusTimer)
    }
  }, [connected, connecting, connectionError, connect, updateStatus])
  
  // Show connection status
  if (connecting) {
    return (
      <div className="p-6 max-h-screen overflow-y-auto flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-green-400 text-xl mb-4">Connecting to HiveMind...</div>
          <div className="text-green-600">Initializing neural swarm protocols...</div>
        </div>
      </div>
    )
  }
  
  if (connectionError) {
    return (
      <div className="p-6 max-h-screen overflow-y-auto flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">Connection Failed</div>
          <div className="text-red-600 mb-4">{connectionError}</div>
          <button 
            onClick={() => connect()} 
            className="bg-green-500 hover:bg-green-600 text-black px-4 py-2 rounded"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }
  
  if (!connected) {
    return (
      <div className="p-6 max-h-screen overflow-y-auto flex items-center justify-center">
        <div className="text-center">
          <div className="text-yellow-400 text-xl mb-4">HiveMind Offline</div>
          <div className="text-yellow-600 mb-4">Neural swarm is not active</div>
          <button 
            onClick={() => connect()} 
            className="bg-green-500 hover:bg-green-600 text-black px-4 py-2 rounded"
          >
            Initialize Swarm
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-h-screen overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* ASCII Art Header */}
        <div className="mb-6 font-mono text-xs text-green-600 whitespace-pre">
          {`╔══════════════════════════════════════════════════════════════════════════════╗
║  ██╗  ██╗██╗██╗   ██╗███████╗███╗   ███╗██╗███╗   ██╗██████╗               ║
║  ██║  ██║██║██║   ██║██╔════╝████╗ ████║██║████╗  ██║██╔══██╗              ║
║  ███████║██║██║   ██║█████╗  ██╔████╔██║██║██╔██╗ ██║██║  ██║              ║
║  ██╔══██║██║╚██╗ ██╔╝██╔══╝  ██║╚██╔╝██║██║██║╚██╗██║██║  ██║              ║
║  ██║  ██║██║ ╚████╔╝ ███████╗██║ ╚═╝ ██║██║██║ ╚████║██████╔╝              ║
║  ╚═╝  ╚═╝╚═╝  ╚═══╝  ╚══════╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═════╝  v2.0.0      ║
╚══════════════════════════════════════════════════════════════════════════════╝`}
        </div>
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold glitch" data-text="NEURAL SWARM CONTROL CENTER">
              NEURAL SWARM CONTROL CENTER
            </h1>
            <div className="text-green-400 text-sm mt-1">
              {swarmName ? `Active Swarm: ${swarmName}` : 'HiveMind Active'} • {topology.toUpperCase()} Topology
            </div>
          </div>
          <div className={`px-3 py-1 rounded text-sm ${
            health === 'healthy' ? 'bg-green-900 text-green-400' :
            health === 'degraded' ? 'bg-yellow-900 text-yellow-400' :
            health === 'critical' ? 'bg-red-900 text-red-400' :
            'bg-gray-900 text-gray-400'
          }`}>
            HEALTH: {health.toUpperCase()}
          </div>
        </div>
        
        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="mb-4 p-4 bg-yellow-900/50 border border-yellow-500 rounded">
            <div className="text-yellow-400 font-bold mb-2">⚠️ System Warnings:</div>
            {warnings.map((warning, i) => (
              <div key={i} className="text-yellow-300 text-sm">• {warning}</div>
            ))}
          </div>
        )}
        
        {/* System Status Bar */}
        <SystemStatus time={time} swarmActive={connected} />
        
        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Left Column - Swarm Topology */}
          <div className="lg:col-span-2 space-y-6">
            <SwarmTopology agents={agents} />
            
            {/* Agent Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agents.length === 0 ? (
                <div className="col-span-2 text-center py-8 text-green-600">
                  <div className="mb-4">No agents active</div>
                  <div className="text-sm">Agents will appear here once spawned by the HiveMind</div>
                </div>
              ) : (
                agents.map(agent => (
                  <AgentCard key={agent.id} agent={agent} />
                ))
              )}
            </div>
          </div>
          
          {/* Right Column - Metrics and Activity */}
          <div className="space-y-6">
            <MetricsDisplay metrics={metrics} />

            <ActivityLog />
          </div>
        </div>
        
        {/* Bottom ASCII Art with Real Stats */}
        <div className="mt-8 font-mono text-xs text-green-600 text-center whitespace-pre">
          {`═══════════════════════════════════════════════════════════════════════════════
[ HIVEMIND ACTIVE ] - [ ${stats.totalAgents} AGENTS ] - [ ${stats.completedTasks} TASKS COMPLETED ] - [ ${health.toUpperCase()} ]`}
        </div>
      </motion.div>
    </div>
  )
}

export default Dashboard