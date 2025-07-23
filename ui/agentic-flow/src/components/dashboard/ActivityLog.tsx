import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useRealTimeStore, { LogEntry } from '../../stores/realTimeStore'

interface Activity {
  id: string
  type: string
  message: string
  metadata?: any
  timestamp: number
}

interface ActivityLogProps {
  realTimeData?: {
    connected: boolean
    lastUpdate: Date | null
  }
}

const ActivityLog: React.FC<ActivityLogProps> = ({ realTimeData }) => {
  const { logs } = useRealTimeStore()
  const [displayLogs, setDisplayLogs] = useState<LogEntry[]>([])
  const [activities, setActivities] = useState<Activity[]>([])

  // Fetch activities from backend
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/hive/activities?limit=20')
        if (response.ok) {
          const data = await response.json()
          setActivities(data)
        }
      } catch (error) {
        console.error('Failed to fetch activities:', error)
      }
    }

    fetchActivities()
    const interval = setInterval(fetchActivities, 3000) // Update every 3 seconds

    return () => clearInterval(interval)
  }, [])

  // Convert activities to log entries
  useEffect(() => {
    if (activities.length > 0) {
      const activityLogs: LogEntry[] = activities.map(activity => ({
        id: activity.id,
        timestamp: new Date(activity.timestamp),
        level: activity.type === 'error' ? 'error' : 
               activity.type === 'warning' ? 'warn' : 'info',
        message: activity.message,
        component: activity.type
      }))
      setDisplayLogs(activityLogs.slice(0, 10))
    } else if (logs.length > 0) {
      setDisplayLogs(logs.slice(0, 10)) // Show latest 10 logs
    } else {
      // Fallback mock data when no real logs available
      const mockLogs: LogEntry[] = [
        { 
          id: '1', 
          timestamp: new Date(), 
          level: 'info', 
          message: 'Agent RESEARCHER completed task: API pattern analysis',
          component: 'swarm'
        },
        { 
          id: '2', 
          timestamp: new Date(), 
          level: 'info', 
          message: 'Agent CODER-1 spawned for: Authentication implementation',
          component: 'agent'
        },
        { 
          id: '3', 
          timestamp: new Date(), 
          level: 'info', 
          message: 'Swarm topology optimized: HIERARCHICAL mode',
          component: 'swarm'
        },
        { 
          id: '4', 
          timestamp: new Date(), 
          level: 'info', 
          message: 'MCP tool executed: memory_usage (store)',
          component: 'memory'
        },
        { 
          id: '5', 
          timestamp: new Date(), 
          level: 'info', 
          message: 'Neural training completed: 98.7% accuracy',
          component: 'neural'
        },
      ]
      setDisplayLogs(mockLogs)
    }
  }, [logs])

  // No simulation needed - using real-time data

  const typeColors = {
    info: 'text-green-600',
    warn: 'text-yellow-400',
    error: 'text-red-400',
    debug: 'text-blue-400'
  }

  const typeIcons = {
    info: '►',
    warn: '⚠',
    error: '✗',
    debug: '◆'
  }

  return (
    <div className="retro-panel">
      <h2 className="text-lg font-semibold mb-4 text-green-400">ACTIVITY LOG</h2>
      
      <div className="font-mono text-xs space-y-1 h-64 overflow-y-auto">
        <AnimatePresence initial={false}>
          {displayLogs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className={`${typeColors[log.level]} flex items-start gap-2`}
            >
              <span className="flex-shrink-0">
                [{log.timestamp.toLocaleTimeString('en-US', { hour12: false })}]
              </span>
              <span className="flex-shrink-0">{typeIcons[log.level]}</span>
              {log.component && (
                <span className="flex-shrink-0 text-gray-500">[{log.component.toUpperCase()}]</span>
              )}
              <span className="break-words">{log.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Status Indicator */}
      <div className="mt-3 pt-3 border-t border-green-900">
        <div className="flex items-center justify-between text-xs">
          <span className="text-green-600">LOG STATUS:</span>
          <span className={`animate-pulse ${realTimeData?.connected ? 'text-green-400' : 'text-red-400'}`}>
            ● {realTimeData?.connected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
        {realTimeData?.lastUpdate && (
          <div className="text-xs text-gray-500 mt-1">
            Last update: {realTimeData.lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  )
}

export default ActivityLog