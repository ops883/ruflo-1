/**
 * Terminal Handler - Real terminal integration using node-pty
 * Provides real shell execution with WebSocket communication
 */

import { spawn as ptySpawn, IPty } from 'node-pty';
import { Server, Socket } from 'socket.io';
import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

interface TerminalSession {
  id: string;
  pty: IPty;
  workingDirectory: string;
  lastActivity: Date;
  socket: Socket;
}

export class TerminalHandler {
  private sessions: Map<string, TerminalSession> = new Map();
  private io: Server;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(io: Server) {
    this.io = io;
    this.setupSocketHandlers();
    this.startCleanupTimer();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Terminal client connected: ${socket.id}`);

      // Create new terminal session
      socket.on('terminal:create', (data: { cols?: number; rows?: number; cwd?: string }) => {
        this.createTerminalSession(socket, data);
      });

      // Send input to terminal
      socket.on('terminal:input', (data: { sessionId: string; input: string }) => {
        this.handleInput(data.sessionId, data.input);
      });

      // Resize terminal
      socket.on('terminal:resize', (data: { sessionId: string; cols: number; rows: number }) => {
        this.resizeTerminal(data.sessionId, data.cols, data.rows);
      });

      // Execute claude-flow command
      socket.on('terminal:claude-flow', async (data: { sessionId: string; command: string }) => {
        await this.executeClaudeFlowCommand(data.sessionId, data.command);
      });

      // Execute system command
      socket.on('terminal:command', async (data: { sessionId: string; command: string }) => {
        await this.executeSystemCommand(data.sessionId, data.command);
      });

      // Cleanup on disconnect
      socket.on('disconnect', () => {
        this.cleanupSocketSessions(socket.id);
      });
    });
  }

  private createTerminalSession(socket: Socket, options: { cols?: number; rows?: number; cwd?: string }): void {
    const sessionId = `terminal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const cwd = options.cwd || process.cwd();
    
    // Determine shell based on OS
    const shell = os.platform() === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/bash';
    
    try {
      // Create PTY process
      const pty = ptySpawn(shell, [], {
        name: 'xterm-color',
        cols: options.cols || 80,
        rows: options.rows || 24,
        cwd: cwd,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
          // Add claude-flow to PATH if not already there
          PATH: this.ensureClaudeFlowInPath(process.env.PATH || ''),
        },
      });

      // Handle PTY output
      pty.onData((data: string) => {
        socket.emit('terminal:output', {
          sessionId,
          data,
          type: 'stdout'
        });
      });

      // Handle PTY exit
      pty.onExit(({ exitCode, signal }) => {
        console.log(`Terminal session ${sessionId} exited with code ${exitCode}, signal ${signal}`);
        socket.emit('terminal:exit', {
          sessionId,
          exitCode,
          signal
        });
        this.sessions.delete(sessionId);
      });

      // Store session
      const session: TerminalSession = {
        id: sessionId,
        pty,
        workingDirectory: cwd,
        lastActivity: new Date(),
        socket
      };

      this.sessions.set(sessionId, session);

      // Send session info to client
      socket.emit('terminal:created', {
        sessionId,
        cwd,
        shell,
        cols: options.cols || 80,
        rows: options.rows || 24
      });

      // Send welcome message with claude-flow info
      setTimeout(() => {
        this.sendClaudeFlowWelcome(sessionId);
      }, 100);

    } catch (error) {
      console.error('Failed to create terminal session:', error);
      socket.emit('terminal:error', {
        sessionId: null,
        error: `Failed to create terminal: ${error.message}`
      });
    }
  }

  private handleInput(sessionId: string, input: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`Terminal session not found: ${sessionId}`);
      return;
    }

    session.lastActivity = new Date();
    session.pty.write(input);
  }

  private resizeTerminal(sessionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`Terminal session not found: ${sessionId}`);
      return;
    }

    try {
      session.pty.resize(cols, rows);
    } catch (error) {
      console.error(`Failed to resize terminal ${sessionId}:`, error);
    }
  }

  private async executeClaudeFlowCommand(sessionId: string, command: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`Terminal session not found: ${sessionId}`);
      return;
    }

    try {
      // Ensure we're using the claude-flow CLI
      const claudeFlowCommand = command.startsWith('claude-flow') ? command : `claude-flow ${command}`;
      
      session.socket.emit('terminal:output', {
        sessionId,
        data: `\r\n$ ${claudeFlowCommand}\r\n`,
        type: 'command'
      });

      // Execute via PTY for real-time output
      session.pty.write(`${claudeFlowCommand}\r`);
      session.lastActivity = new Date();

    } catch (error) {
      session.socket.emit('terminal:output', {
        sessionId,
        data: `\r\nError executing claude-flow command: ${error.message}\r\n`,
        type: 'error'
      });
    }
  }

  private async executeSystemCommand(sessionId: string, command: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`Terminal session not found: ${sessionId}`);
      return;
    }

    try {
      session.socket.emit('terminal:output', {
        sessionId,
        data: `\r\n$ ${command}\r\n`,
        type: 'command'
      });

      // Execute via PTY for real-time output and interaction
      session.pty.write(`${command}\r`);
      session.lastActivity = new Date();

    } catch (error) {
      session.socket.emit('terminal:output', {
        sessionId,
        data: `\r\nError executing command: ${error.message}\r\n`,
        type: 'error'
      });
    }
  }

  private sendClaudeFlowWelcome(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const welcomeMessage = `
\x1b[36m╔══════════════════════════════════════════════════╗\x1b[0m
\x1b[36m║           Claude Flow Terminal v2.0.0            ║\x1b[0m
\x1b[36m║         Real Terminal with MCP Integration       ║\x1b[0m
\x1b[36m╚══════════════════════════════════════════════════╝\x1b[0m

\x1b[32m🚀 Claude Flow Commands Available:\x1b[0m
  \x1b[33mclaude-flow help\x1b[0m                 - Show help
  \x1b[33mclaude-flow swarm init\x1b[0m           - Initialize swarm
  \x1b[33mclaude-flow agent spawn\x1b[0m          - Spawn agents
  \x1b[33mclaude-flow hooks pre-task\x1b[0m       - Execute hooks
  \x1b[33mclaude-flow memory usage\x1b[0m         - Memory operations
  \x1b[33mclaude-flow benchmark run\x1b[0m        - Run benchmarks

\x1b[32m💡 System Commands:\x1b[0m
  \x1b[33mls, pwd, cd, mkdir, rm\x1b[0m           - File operations
  \x1b[33mnpm, node, git\x1b[0m                   - Development tools
  \x1b[33mclear, exit\x1b[0m                      - Terminal control

\x1b[90mWorking directory: ${session.workingDirectory}\x1b[0m
\r\n`;

    session.socket.emit('terminal:output', {
      sessionId,
      data: welcomeMessage,
      type: 'info'
    });
  }

  private ensureClaudeFlowInPath(currentPath: string): string {
    // Add common claude-flow locations to PATH if not already present
    const claudeFlowPaths = [
      '/usr/local/bin',
      '/opt/homebrew/bin',
      path.join(os.homedir(), '.local/bin'),
      path.join(os.homedir(), 'node_modules/.bin'),
      './node_modules/.bin'
    ];

    const pathEntries = currentPath.split(path.delimiter);
    let modifiedPath = currentPath;

    claudeFlowPaths.forEach(claudePath => {
      if (!pathEntries.includes(claudePath)) {
        modifiedPath = `${modifiedPath}${path.delimiter}${claudePath}`;
      }
    });

    return modifiedPath;
  }

  private cleanupSocketSessions(socketId: string): void {
    console.log(`Cleaning up sessions for socket: ${socketId}`);
    
    // Find and cleanup sessions for this socket
    for (const [sessionId, session] of this.sessions) {
      if (session.socket.id === socketId) {
        console.log(`Terminating terminal session: ${sessionId}`);
        
        try {
          session.pty.kill();
        } catch (error) {
          console.warn(`Error killing PTY for session ${sessionId}:`, error);
        }
        
        this.sessions.delete(sessionId);
      }
    }
  }

  private startCleanupTimer(): void {
    // Cleanup inactive sessions every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = new Date();
      const timeout = 30 * 60 * 1000; // 30 minutes

      for (const [sessionId, session] of this.sessions) {
        if (now.getTime() - session.lastActivity.getTime() > timeout) {
          console.log(`Cleaning up inactive session: ${sessionId}`);
          
          try {
            session.pty.kill();
            session.socket.emit('terminal:timeout', { sessionId });
          } catch (error) {
            console.warn(`Error cleaning up session ${sessionId}:`, error);
          }
          
          this.sessions.delete(sessionId);
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  // Get session info (for debugging/monitoring)
  public getSessionInfo(): Array<{id: string; cwd: string; lastActivity: Date; socketId: string}> {
    return Array.from(this.sessions.values()).map(session => ({
      id: session.id,
      cwd: session.workingDirectory,
      lastActivity: session.lastActivity,
      socketId: session.socket.id
    }));
  }

  // Cleanup all sessions
  public async cleanup(): Promise<void> {
    console.log('Cleaning up all terminal sessions...');
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    for (const [sessionId, session] of this.sessions) {
      try {
        session.pty.kill();
      } catch (error) {
        console.warn(`Error killing PTY for session ${sessionId}:`, error);
      }
    }

    this.sessions.clear();
  }
}

export default TerminalHandler;