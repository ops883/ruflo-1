import React, { useEffect, useState } from 'react'
import { Search, Database, Clock, HardDrive, Activity } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface MemoryEntry {
  id: string
  key: string
  value: any
  timestamp: number
  type: 'session' | 'swarm' | 'agent' | 'task' | 'neural' | 'hivemind'
  size: number
  namespace?: string
  source?: 'swarm' | 'hivemind'
}

interface HiveMindData {
  memory: { entries: any[], total: number }
  hive: { entries: any[], total: number, tables?: string[], agents?: any[], tasks?: any[] }
  config: any
  sessions: any[]
}

const MemoryExplorer: React.FC = () => {
  const [memories, setMemories] = useState<MemoryEntry[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedMemory, setSelectedMemory] = useState<MemoryEntry | null>(null)
  const [swarmData, setSwarmData] = useState<any>(null)
  const [hiveMindData, setHiveMindData] = useState<HiveMindData | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch real memory data
  useEffect(() => {
    const fetchMemoryData = async () => {
      setLoading(true)
      const allMemories: MemoryEntry[] = []

      try {
        // Fetch Swarm memory
        const swarmResponse = await fetch('http://localhost:3001/api/memory/swarm')
        if (swarmResponse.ok) {
          const data = await swarmResponse.json()
          setSwarmData(data)
          
          // Convert swarm entries to MemoryEntry format
          if (data.entries) {
            data.entries.forEach((entry: any, index: number) => {
              allMemories.push({
                id: `swarm-${index}`,
                key: entry.key,
                value: entry.value,
                timestamp: new Date(entry.updated_at || entry.created_at).getTime(),
                type: determineType(entry.key),
                size: JSON.stringify(entry.value).length,
                namespace: entry.namespace,
                source: 'swarm'
              })
            })
          }
        }
      } catch (error) {
        console.error('Failed to fetch swarm memory:', error)
      }

      try {
        // Fetch HiveMind memory
        const hiveResponse = await fetch('http://localhost:3001/api/memory/hivemind')
        if (hiveResponse.ok) {
          const data = await hiveResponse.json()
          setHiveMindData(data)
          
          // Convert hivemind memory entries
          if (data.memory?.entries) {
            data.memory.entries.forEach((entry: any, index: number) => {
              allMemories.push({
                id: `hive-mem-${index}`,
                key: entry.key || entry.id || `memory-${index}`,
                value: entry.value || entry,
                timestamp: new Date(entry.updated_at || entry.created_at || Date.now()).getTime(),
                type: 'hivemind',
                size: JSON.stringify(entry).length,
                namespace: entry.namespace || 'hivemind',
                source: 'hivemind'
              })
            })
          }

          // Add session files as memories
          if (data.sessions) {
            data.sessions.forEach((session: any, index: number) => {
              if (session.data) {
                allMemories.push({
                  id: `session-${index}`,
                  key: `session/${session.filename}`,
                  value: session.data,
                  timestamp: Date.now() - index * 60000, // Stagger timestamps
                  type: 'session',
                  size: session.size || JSON.stringify(session.data).length,
                  source: 'hivemind'
                })
              }
            })
          }
        }
      } catch (error) {
        console.error('Failed to fetch hivemind memory:', error)
      }

      // If no real data, add some mock entries
      if (allMemories.length === 0) {
        const mockMemories: MemoryEntry[] = [
          {
            id: '1',
            key: 'demo/swarm/init',
            value: { info: 'No memory data found in .swarm/ or .hive-mind/' },
            timestamp: Date.now(),
            type: 'swarm',
            size: 128
          }
        ];
        allMemories.push(...mockMemories);
      }

      setMemories(allMemories.sort((a, b) => b.timestamp - a.timestamp));
      setLoading(false);
    }

    fetchMemoryData();
    const interval = setInterval(fetchMemoryData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [])

  // Helper function to determine type from key
  const determineType = (key: string): MemoryEntry['type'] => {
    if (key.includes('session')) return 'session'
    if (key.includes('agent')) return 'agent'
    if (key.includes('task')) return 'task'
    if (key.includes('neural')) return 'neural'
    if (key.includes('hive')) return 'hivemind'
    return 'swarm'
  }

  const filteredMemories = memories.filter(memory => {
    const matchesSearch = memory.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         JSON.stringify(memory.value).toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = selectedType === 'all' || memory.type === selectedType
    return matchesSearch && matchesType
  })

  const totalSize = memories.reduce((acc, mem) => acc + mem.size, 0)
  const swarmCount = memories.filter(m => m.source === 'swarm').length
  const hiveCount = memories.filter(m => m.source === 'hivemind').length
  const sessionCount = memories.filter(m => m.type === 'session').length
  const neuralCount = memories.filter(m => m.type === 'neural').length
  
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts)
    return date.toLocaleTimeString('en-US', { hour12: false })
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'session': return <Clock size={14} />
      case 'swarm': return <Activity size={14} />
      case 'agent': return <Database size={14} />
      case 'neural': return <HardDrive size={14} />
      default: return <Database size={14} />
    }
  }

  return (
    <div className="p-6 h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="text-green-400 text-xs mb-2 font-mono">
          ╔════════════════════════════════════════╗
        </div>
        <h1 className="text-2xl font-bold text-green-400 mb-2 px-2 font-mono">MEMORY EXPLORER</h1>
        <p className="text-sm text-green-600 px-2 font-mono">Neural Storage & Session History</p>
        <div className="text-green-400 text-xs mt-2 font-mono">
          ╚════════════════════════════════════════╝
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-black/50 border border-green-900 p-3 rounded">
          <div className="text-xs text-green-600 mb-1">TOTAL ENTRIES</div>
          <div className="text-xl font-bold text-green-400 font-mono">{memories.length}</div>
        </div>
        <div className="bg-black/50 border border-green-900 p-3 rounded">
          <div className="text-xs text-green-600 mb-1">TOTAL SIZE</div>
          <div className="text-xl font-bold text-green-400 font-mono">{formatSize(totalSize)}</div>
        </div>
        <div className="bg-black/50 border border-green-900 p-3 rounded">
          <div className="text-xs text-green-600 mb-1">SWARM MEMORIES</div>
          <div className="text-xl font-bold text-green-400 font-mono">{swarmCount}</div>
        </div>
        <div className="bg-black/50 border border-green-900 p-3 rounded">
          <div className="text-xs text-green-600 mb-1">HIVEMIND ENTRIES</div>
          <div className="text-xl font-bold text-green-400 font-mono">{hiveCount}</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-600" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search memory keys or values..."
            className="w-full pl-10 pr-4 py-2 bg-black/50 border border-green-900 text-green-400 placeholder-green-700 focus:outline-none focus:border-green-400 rounded font-mono text-sm"
          />
        </div>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-4 py-2 bg-black/50 border border-green-900 text-green-400 focus:outline-none focus:border-green-400 rounded font-mono text-sm"
        >
          <option value="all">ALL TYPES</option>
          <option value="session">SESSION</option>
          <option value="swarm">SWARM</option>
          <option value="agent">AGENT</option>
          <option value="task">TASK</option>
          <option value="neural">NEURAL</option>
          <option value="hivemind">HIVEMIND</option>
        </select>
      </div>

      {/* Memory List */}
      <div className="flex-1 flex gap-4 min-h-0">
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-pulse text-green-400 text-xl mb-2">Loading Memory Banks...</div>
                <div className="text-green-600 text-sm">Accessing .swarm/ and .hive-mind/ databases</div>
              </div>
            </div>
          ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {filteredMemories.map((memory) => (
                <motion.div
                  key={memory.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`p-3 bg-black/50 border border-green-900 rounded cursor-pointer transition-all hover:border-green-400 hover:shadow-[0_0_10px_rgba(0,255,0,0.3)] ${
                    selectedMemory?.id === memory.id ? 'border-green-400 shadow-[0_0_10px_rgba(0,255,0,0.3)]' : ''
                  }`}
                  onClick={() => setSelectedMemory(memory)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getTypeIcon(memory.type)}
                        <span className="text-xs text-green-600 uppercase font-mono">{memory.type}</span>
                        <span className="text-xs text-green-700 font-mono">{formatTimestamp(memory.timestamp)}</span>
                      </div>
                      <div className="text-sm text-green-400 font-mono break-all">{memory.key}</div>
                    </div>
                    <div className="text-xs text-green-600 font-mono ml-4">{formatSize(memory.size)}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          )}
        </div>

        {/* Detail View */}
        {selectedMemory && (
          <div className="w-96 bg-black/50 border border-green-900 rounded p-4 overflow-y-auto">
            <div className="text-green-400 text-xs mb-3 font-mono">
              ════ MEMORY DETAILS ════
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-green-600 mb-1">KEY</div>
                <div className="text-sm text-green-400 font-mono break-all">{selectedMemory.key}</div>
              </div>
              <div>
                <div className="text-xs text-green-600 mb-1">TYPE</div>
                <div className="text-sm text-green-400 font-mono uppercase">{selectedMemory.type}</div>
              </div>
              <div>
                <div className="text-xs text-green-600 mb-1">SIZE</div>
                <div className="text-sm text-green-400 font-mono">{formatSize(selectedMemory.size)}</div>
              </div>
              <div>
                <div className="text-xs text-green-600 mb-1">TIMESTAMP</div>
                <div className="text-sm text-green-400 font-mono">{new Date(selectedMemory.timestamp).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-green-600 mb-1">VALUE</div>
                <pre className="text-sm text-green-400 font-mono bg-black/30 p-2 rounded overflow-x-auto">
                  {JSON.stringify(selectedMemory.value, null, 2)}
                </pre>
              </div>
              {selectedMemory.namespace && (
                <div>
                  <div className="text-xs text-green-600 mb-1">NAMESPACE</div>
                  <div className="text-sm text-green-400 font-mono">{selectedMemory.namespace}</div>
                </div>
              )}
              {selectedMemory.source && (
                <div>
                  <div className="text-xs text-green-600 mb-1">SOURCE</div>
                  <div className="text-sm text-green-400 font-mono uppercase">{selectedMemory.source}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MemoryExplorer