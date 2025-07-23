import React, { useEffect, useState } from 'react'
import { Search, Database, Clock, HardDrive, Activity, Server, Folder } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface TableData {
  count: number
  data: any[]
  columns: string[]
  error?: string
}

interface SwarmData {
  tables: string[]
  tableData: Record<string, TableData>
  entries: any[]
  total: number
  path: string
}

interface HiveMindData {
  memory: { entries: any[], total: number }
  hive: { 
    entries: any[], 
    total: number, 
    tables?: string[], 
    agents?: any[], 
    tasks?: any[],
    [key: string]: any 
  }
  config: any
  sessions: any[]
}

const MemoryExplorerV2: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'swarm' | 'hivemind'>('swarm')
  const [activeTable, setActiveTable] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [swarmData, setSwarmData] = useState<SwarmData | null>(null)
  const [hiveMindData, setHiveMindData] = useState<HiveMindData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedRow, setSelectedRow] = useState<any>(null)
  const [page, setPage] = useState(0)
  const [pageSize] = useState(50)

  // Fetch memory data
  useEffect(() => {
    const fetchMemoryData = async () => {
      setLoading(true)

      try {
        // Fetch Swarm memory with all tables
        const swarmResponse = await fetch('http://localhost:3001/api/memory/swarm')
        if (swarmResponse.ok) {
          const data = await swarmResponse.json()
          setSwarmData(data)
          if (data.tables?.length > 0 && !activeTable) {
            // Default to memory_entries if it exists and has data
            const memoryEntriesTable = data.tables.find(t => t === 'memory_entries')
            if (memoryEntriesTable && data.tableData?.memory_entries?.count > 0) {
              setActiveTable('memory_entries')
            } else {
              setActiveTable(data.tables[0])
            }
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
        }
      } catch (error) {
        console.error('Failed to fetch hivemind memory:', error)
      }

      setLoading(false)
    }

    fetchMemoryData()
    const interval = setInterval(fetchMemoryData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const formatValue = (value: any, key?: string): string => {
    if (value === null || value === undefined) return 'null'
    
    // Special formatting for specific fields
    if (key === 'value' && typeof value === 'string') {
      try {
        // Try to parse as JSON for better display
        const parsed = JSON.parse(value)
        return JSON.stringify(parsed, null, 2)
      } catch {
        return value
      }
    }
    
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2)
      } catch {
        return String(value)
      }
    }
    
    // Truncate long strings in table view
    if (typeof value === 'string' && value.length > 100) {
      return value.substring(0, 100) + '...'
    }
    
    return String(value)
  }

  const formatTimestamp = (ts: any): string => {
    if (!ts) return 'N/A'
    if (typeof ts === 'number') {
      // Unix timestamp
      if (ts < 10000000000) ts = ts * 1000 // Convert seconds to milliseconds
      return new Date(ts).toLocaleString()
    }
    return new Date(ts).toLocaleString()
  }

  const getCurrentTableData = () => {
    if (activeTab === 'swarm' && swarmData) {
      return swarmData.tableData[activeTable] || null
    } else if (activeTab === 'hivemind' && hiveMindData) {
      if (activeTable === 'agents') return { data: hiveMindData.hive.agents || [], count: hiveMindData.hive.agents?.length || 0, columns: hiveMindData.hive.agents?.length > 0 ? Object.keys(hiveMindData.hive.agents[0]) : [] }
      if (activeTable === 'tasks') return { data: hiveMindData.hive.tasks || [], count: hiveMindData.hive.tasks?.length || 0, columns: hiveMindData.hive.tasks?.length > 0 ? Object.keys(hiveMindData.hive.tasks[0]) : [] }
      if (activeTable === 'sessions') return { data: hiveMindData.sessions || [], count: hiveMindData.sessions?.length || 0, columns: ['filename', 'size', 'data'] }
      if (activeTable === 'memory') return { data: hiveMindData.memory.entries || [], count: hiveMindData.memory.total, columns: hiveMindData.memory.entries?.length > 0 ? Object.keys(hiveMindData.memory.entries[0]) : [] }
    }
    return null
  }

  const filteredData = () => {
    const tableData = getCurrentTableData()
    if (!tableData || !tableData.data) return []
    
    let filtered = tableData.data
    
    if (searchTerm) {
      filtered = filtered.filter(row => 
        Object.values(row).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }
    
    return filtered
  }
  
  const paginatedData = () => {
    const data = filteredData()
    const start = page * pageSize
    const end = start + pageSize
    return data.slice(start, end)
  }
  
  const totalPages = Math.ceil(filteredData().length / pageSize)

  return (
    <div className="p-6 h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="text-green-400 text-xs mb-2 font-mono">
          ╔═══════════════════════════════════════════════════════════╗
        </div>
        <h1 className="text-2xl font-bold text-green-400 mb-2 px-2 font-mono">MEMORY DATABASE EXPLORER</h1>
        <p className="text-sm text-green-600 px-2 font-mono">Real-time access to .swarm/ and .hive-mind/ databases</p>
        <div className="text-green-400 text-xs mt-2 font-mono">
          ╚═══════════════════════════════════════════════════════════╝
        </div>
      </div>

      {/* Table Info Bar */}
      {activeTable && (
        <div className="mb-4 p-3 bg-green-900/20 border border-green-900 rounded">
          <div className="flex items-center justify-between">
            <div className="text-green-400 font-mono text-sm">
              <span className="text-green-600">Current Table:</span> {activeTable}
              {activeTable === 'memory_entries' && (
                <span className="text-xs text-green-600 ml-2">(Agent memory storage)</span>
              )}
              {activeTable === 'agent_interactions' && (
                <span className="text-xs text-green-600 ml-2">(Agent communication logs)</span>
              )}
              {activeTable === 'code_patterns' && (
                <span className="text-xs text-green-600 ml-2">(Learned code patterns)</span>
              )}
              {activeTable === 'error_patterns' && (
                <span className="text-xs text-green-600 ml-2">(Error pattern recognition)</span>
              )}
              {activeTable === 'knowledge_graph' && (
                <span className="text-xs text-green-600 ml-2">(Knowledge relationships)</span>
              )}
              {activeTable === 'mcp_tool_usage' && (
                <span className="text-xs text-green-600 ml-2">(MCP tool execution history)</span>
              )}
            </div>
            <div className="text-green-600 font-mono text-xs">
              {getCurrentTableData()?.count || 0} records
            </div>
          </div>
        </div>
      )}

      {/* Database Tabs */}
      <div className="flex gap-4 mb-4">
        <button
          onClick={() => {
            setActiveTab('swarm')
            setActiveTable(swarmData?.tables?.[0] || '')
          }}
          className={`px-4 py-2 rounded font-mono text-sm transition-all ${
            activeTab === 'swarm' 
              ? 'bg-green-900 text-green-400 border border-green-400' 
              : 'bg-black border border-green-900 text-green-600 hover:border-green-400'
          }`}
        >
          <Server className="inline-block w-4 h-4 mr-2" />
          .swarm/memory.db
        </button>
        <button
          onClick={() => {
            setActiveTab('hivemind')
            setActiveTable('agents')
          }}
          className={`px-4 py-2 rounded font-mono text-sm transition-all ${
            activeTab === 'hivemind' 
              ? 'bg-green-900 text-green-400 border border-green-400' 
              : 'bg-black border border-green-900 text-green-600 hover:border-green-400'
          }`}
        >
          <Database className="inline-block w-4 h-4 mr-2" />
          .hive-mind/
        </button>
      </div>

      {/* Table Navigation */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {activeTab === 'swarm' && swarmData?.tables.map(table => (
            <button
              key={table}
              onClick={() => {
                setActiveTable(table)
                setPage(0)
              }}
              className={`px-3 py-1 rounded font-mono text-xs transition-all ${
                activeTable === table 
                  ? 'bg-green-500 text-black' 
                  : 'bg-black border border-green-900 text-green-400 hover:border-green-400'
              }`}
            >
              {table}
              {swarmData.tableData[table]?.count !== undefined && (
                <span className="ml-1 opacity-70">({swarmData.tableData[table].count})</span>
              )}
            </button>
          ))}
          {activeTab === 'hivemind' && (
            <>
              <button
                onClick={() => setActiveTable('agents')}
                className={`px-3 py-1 rounded font-mono text-xs transition-all ${
                  activeTable === 'agents' 
                    ? 'bg-green-500 text-black' 
                    : 'bg-black border border-green-900 text-green-400 hover:border-green-400'
                }`}
              >
                agents ({hiveMindData?.hive.agents?.length || 0})
              </button>
              <button
                onClick={() => setActiveTable('tasks')}
                className={`px-3 py-1 rounded font-mono text-xs transition-all ${
                  activeTable === 'tasks' 
                    ? 'bg-green-500 text-black' 
                    : 'bg-black border border-green-900 text-green-400 hover:border-green-400'
                }`}
              >
                tasks ({hiveMindData?.hive.tasks?.length || 0})
              </button>
              <button
                onClick={() => setActiveTable('memory')}
                className={`px-3 py-1 rounded font-mono text-xs transition-all ${
                  activeTable === 'memory' 
                    ? 'bg-green-500 text-black' 
                    : 'bg-black border border-green-900 text-green-400 hover:border-green-400'
                }`}
              >
                memory ({hiveMindData?.memory.total || 0})
              </button>
              <button
                onClick={() => setActiveTable('sessions')}
                className={`px-3 py-1 rounded font-mono text-xs transition-all ${
                  activeTable === 'sessions' 
                    ? 'bg-green-500 text-black' 
                    : 'bg-black border border-green-900 text-green-400 hover:border-green-400'
                }`}
              >
                sessions ({hiveMindData?.sessions?.length || 0})
              </button>
              {hiveMindData?.hive.tables?.map(table => (
                !['agents', 'tasks'].includes(table) && (
                  <button
                    key={table}
                    onClick={() => setActiveTable(table)}
                    className={`px-3 py-1 rounded font-mono text-xs transition-all ${
                      activeTable === table 
                        ? 'bg-green-500 text-black' 
                        : 'bg-black border border-green-900 text-green-400 hover:border-green-400'
                    }`}
                  >
                    {table}
                  </button>
                )
              ))}
            </>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-600" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search in ${activeTable}...`}
            className="w-full pl-10 pr-4 py-2 bg-black/50 border border-green-900 text-green-400 placeholder-green-700 focus:outline-none focus:border-green-400 rounded font-mono text-sm"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-1 flex gap-4 min-h-0">
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-pulse text-green-400 text-xl mb-2">Loading Database...</div>
                <div className="text-green-600 text-sm">Accessing {activeTab === 'swarm' ? '.swarm/memory.db' : '.hive-mind/'}</div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {getCurrentTableData()?.error ? (
                <div className="text-red-400 p-4">Error: {getCurrentTableData()?.error}</div>
              ) : (
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-green-900">
                      {getCurrentTableData()?.columns?.map(col => (
                        <th key={col} className="text-left p-2 text-green-600 font-normal">
                          {col.toUpperCase()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData().map((row, idx) => (
                      <tr 
                        key={idx}
                        className={`border-b border-green-900/50 hover:bg-green-900/20 cursor-pointer ${
                          selectedRow === row ? 'bg-green-900/30' : ''
                        }`}
                        onClick={() => setSelectedRow(row)}
                      >
                        {getCurrentTableData()?.columns?.map(col => (
                          <td key={col} className="p-2 text-green-400 max-w-xs">
                            <div className="truncate" title={String(row[col] || '')}>
                              {col.includes('time') || col.includes('created') || col.includes('updated') 
                                ? formatTimestamp(row[col])
                                : formatValue(row[col], col)
                              }
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {filteredData().length === 0 && !getCurrentTableData()?.error && (
                <div className="text-center py-8 text-green-600">
                  No data found in {activeTable}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Detail View */}
        {selectedRow && (
          <div className="w-96 bg-black/50 border border-green-900 rounded p-4 overflow-y-auto">
            <div className="text-green-400 text-xs mb-3 font-mono">
              ════ RECORD DETAILS ════
            </div>
            <div className="space-y-3">
              {Object.entries(selectedRow).map(([key, value]) => (
                <div key={key}>
                  <div className="text-xs text-green-600 mb-1">{key.toUpperCase()}</div>
                  <div className="text-sm text-green-400 font-mono">
                    {key.includes('time') || key.includes('created') || key.includes('updated') 
                      ? formatTimestamp(value)
                      : (
                        <pre className="bg-black/30 p-2 rounded overflow-x-auto whitespace-pre-wrap text-xs">
                          {formatValue(value, key)}
                        </pre>
                      )
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {filteredData().length > pageSize && (
        <div className="mt-4 flex justify-center items-center gap-4">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className={`px-3 py-1 rounded font-mono text-xs ${
              page === 0 
                ? 'bg-gray-900 text-gray-600 cursor-not-allowed' 
                : 'bg-green-900 text-green-400 hover:bg-green-800'
            }`}
          >
            ← Previous
          </button>
          
          <div className="text-green-400 font-mono text-xs">
            Page {page + 1} of {totalPages} ({filteredData().length} total records)
          </div>
          
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className={`px-3 py-1 rounded font-mono text-xs ${
              page >= totalPages - 1 
                ? 'bg-gray-900 text-gray-600 cursor-not-allowed' 
                : 'bg-green-900 text-green-400 hover:bg-green-800'
            }`}
          >
            Next →
          </button>
        </div>
      )}

      {/* Status Bar */}
      <div className="mt-4 pt-4 border-t border-green-900 flex justify-between items-center text-xs text-green-600">
        <div>
          {activeTab === 'swarm' && swarmData && (
            <span>Tables: {swarmData.tables.length} | Path: {swarmData.path}</span>
          )}
          {activeTab === 'hivemind' && hiveMindData && (
            <span>Tables: {hiveMindData.hive.tables?.length || 4} | Config: {hiveMindData.config ? '✓' : '✗'}</span>
          )}
        </div>
        <div>
          {getCurrentTableData() && (
            <span>Records: {filteredData().length} / {getCurrentTableData()?.count || 0}</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default MemoryExplorerV2