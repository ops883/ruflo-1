import React, { useState, useRef, useEffect, KeyboardEvent, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

interface CommandOutput {
  command: string
  output: string[]
  timestamp: Date
  type: 'input' | 'output' | 'error' | 'success' | 'info'
}

interface TerminalSession {
  id: string
  cwd: string
  shell: string
  cols: number
  rows: number
}

// Helper function to convert ANSI escape codes to HTML
const ansiToHtml = (text: string): string => {
  // Basic ANSI color code conversion
  return text
    .replace(/\x1b\[0m/g, '</span>') // Reset
    .replace(/\x1b\[1m/g, '<span style="font-weight: bold">') // Bold
    .replace(/\x1b\[30m/g, '<span style="color: #000000">') // Black
    .replace(/\x1b\[31m/g, '<span style="color: #ff5555">') // Red
    .replace(/\x1b\[32m/g, '<span style="color: #50fa7b">') // Green
    .replace(/\x1b\[33m/g, '<span style="color: #f1fa8c">') // Yellow
    .replace(/\x1b\[34m/g, '<span style="color: #bd93f9">') // Blue
    .replace(/\x1b\[35m/g, '<span style="color: #ff79c6">') // Magenta
    .replace(/\x1b\[36m/g, '<span style="color: #8be9fd">') // Cyan
    .replace(/\x1b\[37m/g, '<span style="color: #f8f8f2">') // White
    .replace(/\x1b\[90m/g, '<span style="color: #6272a4">') // Bright Black
    .replace(/\x1b\[91m/g, '<span style="color: #ff6e6e">') // Bright Red
    .replace(/\x1b\[92m/g, '<span style="color: #69ff94">') // Bright Green
    .replace(/\x1b\[93m/g, '<span style="color: #ffffa5">') // Bright Yellow
    .replace(/\x1b\[94m/g, '<span style="color: #d6acff">') // Bright Blue
    .replace(/\x1b\[95m/g, '<span style="color: #ff92df">') // Bright Magenta
    .replace(/\x1b\[96m/g, '<span style="color: #a4ffff">') // Bright Cyan
    .replace(/\x1b\[97m/g, '<span style="color: #ffffff">') // Bright White
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '')
}

const Terminal: React.FC = () => {
  const [history, setHistory] = useState<CommandOutput[]>([])
  const [currentCommand, setCurrentCommand] = useState('')
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [session, setSession] = useState<TerminalSession | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const terminalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [terminalSize, setTerminalSize] = useState({ cols: 80, rows: 24 })

  // Initialize WebSocket connection
  useEffect(() => {
    const newSocket = io('ws://localhost:3001', {
      transports: ['websocket']
    })

    setSocket(newSocket)

    // Connection handlers
    newSocket.on('connect', () => {
      console.log('Terminal WebSocket connected')
      setIsConnected(true)
      
      // Create terminal session
      newSocket.emit('terminal-create', (response: { success: boolean; sessionId?: string; error?: string }) => {
        if (response.success) {
          setSession({ id: response.sessionId!, connected: true })
          setIsLoading(false)
          
          // Add welcome message
          setHistory([{
            command: '',
            output: ['Connected to real terminal session', ''],
            timestamp: new Date(),
            type: 'success'
          }])
        } else {
          console.error('Failed to create terminal:', response.error)
          setIsLoading(false)
        }
      })
    })

    newSocket.on('disconnect', () => {
      console.log('Terminal WebSocket disconnected')
      setIsConnected(false)
      setSession(null)
    })

    // Terminal output handler
    newSocket.on('terminal-output', (data: string) => {
      setHistory(prev => {
        const lastEntry = prev[prev.length - 1]
        
        // If last entry is output type and recent, append to it
        if (lastEntry && lastEntry.type === 'output' && 
            Date.now() - lastEntry.timestamp.getTime() < 100) {
          const updatedEntry = {
            ...lastEntry,
            output: [...lastEntry.output.slice(0, -1), (lastEntry.output[lastEntry.output.length - 1] || '') + data],
            timestamp: new Date()
          }
          return [...prev.slice(0, -1), updatedEntry]
        }
        
        // Create new entry
        const newEntry: CommandOutput = {
          command: '',
          output: [data],
          timestamp: new Date(),
          type: 'output'
        }
        
        return [...prev, newEntry]
      })
    })

    // Terminal exit handler
    newSocket.on('terminal-exit', () => {
      console.log('Terminal session exited')
      setSession(null)
      setHistory(prev => [...prev, {
        command: '',
        output: ['Terminal session ended'],
        timestamp: new Date(),
        type: 'error'
      }])
    })

    newSocket.on('error', (error: any) => {
      setHistory(prev => [...prev, {
        command: '',
        output: [`Error: ${data.error}`],
        timestamp: new Date(),
        type: 'error'
      }])
    })

    newSocket.on('terminal:exit', (data: { sessionId: string; exitCode: number }) => {
      setHistory(prev => [...prev, {
        command: '',
        output: [`Process exited with code ${data.exitCode}`],
        timestamp: new Date(),
        type: 'info'
      }])
    })

    return () => {
      newSocket.disconnect()
    }
  }, [])

  // Auto-scroll to bottom when new output is added
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [history])

  // Focus input on mount and when connected
  useEffect(() => {
    if (isConnected && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isConnected])

  // Handle window resize for terminal
  useEffect(() => {
    const handleResize = () => {
      if (!terminalRef.current) return
      
      const rect = terminalRef.current.getBoundingClientRect()
      const cols = Math.floor(rect.width / 8.4) // Approximate character width
      const rows = Math.floor(rect.height / 18) // Approximate line height
      
      if (cols !== terminalSize.cols || rows !== terminalSize.rows) {
        setTerminalSize({ cols, rows })
        
        if (socket && session) {
          socket.emit('terminal:resize', {
            sessionId: session.id,
            cols,
            rows
          })
        }
      }
    }

    window.addEventListener('resize', handleResize)
    handleResize() // Initial size calculation
    
    return () => window.removeEventListener('resize', handleResize)
  }, [socket, session, terminalSize])

  const executeCommand = useCallback((cmd: string) => {
    if (!socket || !session || !cmd.trim()) {
      return
    }

    const trimmedCmd = cmd.trim()
    
    // Handle local terminal commands
    if (trimmedCmd === 'clear') {
      setHistory([])
      setCommandHistory(prev => [...prev, cmd])
      setCurrentCommand('')
      setHistoryIndex(-1)
      return
    }

    // Add command to history
    setCommandHistory(prev => [...prev, cmd])
    setCurrentCommand('')
    setHistoryIndex(-1)

    // Add command to output history
    setHistory(prev => [...prev, {
      command: cmd,
      output: [],
      timestamp: new Date(),
      type: 'input'
    }])

    // Send command to terminal
    socket.emit('terminal-input', trimmedCmd + '\n')
  }, [socket, session, commandHistory])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      executeCommand(currentCommand)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex
        setHistoryIndex(newIndex)
        setCurrentCommand(commandHistory[commandHistory.length - 1 - newIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setCurrentCommand(commandHistory[commandHistory.length - 1 - newIndex])
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setCurrentCommand('')
      }
    } else if (e.key === 'Tab') {
      e.preventDefault()
      // Simple tab completion for common commands
      const commonCommands = [
        'claude-flow help', 'claude-flow swarm init', 'claude-flow agent spawn',
        'ls', 'pwd', 'cd', 'npm install', 'npm test', 'git status', 'git add', 'git commit'
      ]
      const matches = commonCommands.filter(cmd => cmd.startsWith(currentCommand.toLowerCase()))
      if (matches.length === 1) {
        setCurrentCommand(matches[0])
      }
    } else if (e.key === 'Escape') {
      setCurrentCommand('')
    } else if (e.ctrlKey && e.key === 'c') {
      // Send Ctrl+C to terminal
      if (socket && session) {
        socket.emit('terminal:input', {
          sessionId: session.id,
          input: '\u0003' // Ctrl+C
        })
      }
    }
  }, [currentCommand, commandHistory, historyIndex, executeCommand, socket, session])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentCommand(e.target.value)
  }, [])

  const renderOutput = useCallback((entry: CommandOutput) => {
    const colorClass = {
      input: 'text-green-400',
      output: 'text-green-400',
      error: 'text-red-400',
      success: 'text-green-500',
      info: 'text-cyan-400',
      command: 'text-yellow-400'
    }[entry.type] || 'text-green-400'

    if (entry.type === 'input') {
      return (
        <div className="flex mb-1" key={`input-${entry.timestamp.getTime()}`}>
          <span className="text-green-600 mr-2">❯</span>
          <span className={colorClass}>{entry.command}</span>
        </div>
      )
    }

    return (
      <div className={`mb-1 ${colorClass}`} key={`output-${entry.timestamp.getTime()}`}>
        {entry.output.map((line, i) => {
          // Convert ANSI codes to HTML and render
          const htmlLine = ansiToHtml(line)
          return (
            <div 
              key={i} 
              className="whitespace-pre font-mono text-sm leading-tight"
              dangerouslySetInnerHTML={{ __html: htmlLine || '&nbsp;' }}
            />
          )
        })}
      </div>
    )
  }, [])

  // Show loading state
  if (isLoading) {
    return (
      <div className="p-6 h-full flex flex-col">
        <h1 className="text-2xl font-bold mb-6 glitch" data-text="TERMINAL">
          TERMINAL
        </h1>
        <div className="retro-panel flex-1 bg-black p-4 font-mono text-sm flex items-center justify-center">
          <div className="text-center text-green-400">
            <div className="animate-spin text-4xl mb-4">⚙️</div>
            <p>Connecting to terminal session...</p>
            {!isConnected && <p className="text-yellow-400 mt-2">WebSocket connecting...</p>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <h1 className="text-2xl font-bold mb-6 glitch" data-text="REAL TERMINAL">
        REAL TERMINAL
      </h1>
      <div className="retro-panel flex-1 bg-black p-4 font-mono text-sm flex flex-col relative overflow-hidden">
        {/* Connection status */}
        <div className={`absolute top-2 right-2 px-2 py-1 text-xs rounded z-10 ${
          isConnected ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
        }`}>
          {isConnected ? '🔗 Connected' : '❌ Disconnected'}
          {session && <span className="ml-2 text-gray-400">PID: {session.id.split('_')[1]}</span>}
        </div>

        {/* Scanline effect */}
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <div className="h-px bg-green-400 animate-scan-line" 
               style={{ animation: 'scan-line 6s linear infinite' }} />
        </div>
        
        {/* Terminal content */}
        <div ref={terminalRef} className="flex-1 overflow-y-auto pr-2 text-green-400 pt-8">
          {history.map((entry, index) => (
            <div key={`${index}-${entry.timestamp.getTime()}`}>
              {renderOutput(entry)}
            </div>
          ))}
          
          {/* Current input line */}
          {isConnected && (
            <div className="flex items-center relative mt-1">
              <span className="text-green-600 mr-2">❯</span>
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={currentCommand}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  className="bg-transparent border-none outline-none text-green-400 w-full font-mono"
                  style={{ caretColor: '#50fa7b' }}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={!isConnected}
                  placeholder={isConnected ? "Enter command..." : "Not connected"}
                />
                <span 
                  className="terminal-cursor absolute"
                  style={{ 
                    left: `${currentCommand.length * 0.6}em`,
                    top: '0'
                  }}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Terminal info bar */}
        <div className="mt-2 pt-2 border-t border-green-900 text-xs text-green-600 flex justify-between">
          <span className="flex items-center gap-2">
            <span>claude-flow@2.0.0</span>
            {session && (
              <span className="text-gray-500">
                [{session.shell}] {session.cols}x{session.rows}
              </span>
            )}
          </span>
          <span>{session?.cwd || '/workspaces/claude-code-flow'}</span>
        </div>
      </div>
    </div>
  )
}

export default Terminal