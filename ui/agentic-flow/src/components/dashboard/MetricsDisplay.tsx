import React from 'react'
import { motion } from 'framer-motion'

interface Metrics {
  cpu: number
  memory: number
  tokenRate: number
  tasksCompleted: number
  tasksActive: number
  tasksPending: number
}

interface MetricsDisplayProps {
  metrics: Metrics
  realTime?: boolean
}

const MetricsDisplay: React.FC<MetricsDisplayProps> = ({ metrics, realTime = false }) => {
  const cpuColor = metrics.cpu > 80 ? 'text-red-400' : metrics.cpu > 50 ? 'text-yellow-400' : 'text-green-400'
  const memoryColor = metrics.memory > 400 ? 'text-red-400' : metrics.memory > 200 ? 'text-yellow-400' : 'text-green-400'

  return (
    <div className="retro-panel">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-green-400">SYSTEM METRICS</h2>
        {realTime && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-400">LIVE</span>
          </div>
        )}
      </div>
      
      {/* Performance Metrics */}
      <div className="space-y-3">
        {/* CPU Usage */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-green-600">CPU USAGE</span>
            <span className={cpuColor}>{metrics.cpu.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-green-900/30 border border-green-900">
            <motion.div
              className={`h-full ${cpuColor === 'text-red-400' ? 'bg-red-400' : cpuColor === 'text-yellow-400' ? 'bg-yellow-400' : 'bg-green-400'}`}
              animate={{ width: `${metrics.cpu}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Memory Usage */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-green-600">MEMORY</span>
            <span className={memoryColor}>{metrics.memory.toFixed(1)}MB</span>
          </div>
          <div className="h-2 bg-green-900/30 border border-green-900">
            <motion.div
              className={`h-full ${memoryColor === 'text-red-400' ? 'bg-red-400' : memoryColor === 'text-yellow-400' ? 'bg-yellow-400' : 'bg-green-400'}`}
              animate={{ width: `${(metrics.memory / 512) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Token Rate */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-green-600">TOKEN RATE</span>
            <span className="text-green-400">{(metrics.tokenRate / 1000).toFixed(1)}K/s</span>
          </div>
          <div className="h-2 bg-green-900/30 border border-green-900">
            <motion.div
              className="h-full bg-green-400"
              animate={{ width: `${(metrics.tokenRate / 2000) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="my-4 border-t border-green-900" />

      {/* Task Statistics */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-green-600">TASKS COMPLETED:</span>
          <motion.span
            className="text-green-400"
            key={metrics.tasksCompleted}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
          >
            {metrics.tasksCompleted}
          </motion.span>
        </div>
        <div className="flex justify-between">
          <span className="text-green-600">ACTIVE TASKS:</span>
          <span className="text-yellow-400">{metrics.tasksActive}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-green-600">PENDING TASKS:</span>
          <span className="text-green-400">{metrics.tasksPending}</span>
        </div>
      </div>

      {/* ASCII Decoration */}
      <div className="mt-4 font-mono text-xs text-green-600 text-center">
        ═══════════════════
      </div>
    </div>
  )
}

export default MetricsDisplay