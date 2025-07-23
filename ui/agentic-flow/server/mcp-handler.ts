/**
 * MCP Server Handler
 * Interfaces with the real Claude Flow MCP server to execute actual MCP tools
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface MCPToolResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
  metadata?: {
    toolName: string;
    parameters: any;
    timestamp: string;
    agentId?: string;
    swarmId?: string;
  };
}

export interface MCPToolSchema {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPServerConfig {
  command: string;
  args: string[];
  timeout: number;
  maxConcurrentTools: number;
}

export class MCPHandler extends EventEmitter {
  private servers: Map<string, ChildProcess> = new Map();
  private toolQueue: Array<{
    toolName: string;
    parameters: any;
    resolve: (result: MCPToolResult) => void;
    reject: (error: Error) => void;
    startTime: number;
  }> = [];
  private executingTools = 0;
  private config: MCPServerConfig;

  constructor(config: Partial<MCPServerConfig> = {}) {
    super();
    
    this.config = {
      command: 'npx',
      args: ['claude-flow@alpha', 'mcp', 'start'],
      timeout: 30000,
      maxConcurrentTools: 5,
      ...config
    };
  }

  /**
   * Initialize the MCP server connection
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('Starting Claude Flow MCP server...');
      
      const server = spawn(this.config.command, this.config.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'production' }
      });

      this.servers.set('main', server);

      server.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log(`MCP Server: ${output}`);
        
        // Check if server is ready
        if (output.includes('MCP server started') || output.includes('Server listening')) {
          resolve();
        }
        
        // Parse tool responses
        this.parseServerOutput(output);
      });

      server.stderr?.on('data', (data) => {
        const error = data.toString();
        console.error(`MCP Server Error: ${error}`);
        this.emit('error', new Error(error));
      });

      server.on('close', (code) => {
        console.log(`MCP server closed with code ${code}`);
        this.servers.delete('main');
        this.emit('close', code);
      });

      server.on('error', (error) => {
        console.error('MCP server error:', error);
        reject(error);
      });

      // Timeout if server doesn't start
      setTimeout(() => {
        if (this.servers.has('main')) {
          resolve(); // Assume it's working if process is still running
        }
      }, 5000);
    });
  }

  /**
   * Discover available MCP tools from the server
   */
  async discoverTools(): Promise<MCPToolSchema[]> {
    try {
      // Execute tool discovery command
      const result = await this.executeTool('list_tools', {});
      
      if (result.success && result.data) {
        return result.data.tools || [];
      }
      
      // Fallback to predefined tools if discovery fails
      return this.getStaticToolList();
    } catch (error) {
      console.error('Tool discovery failed:', error);
      return this.getStaticToolList();
    }
  }

  /**
   * Execute an MCP tool
   */
  async executeTool(toolName: string, parameters: any = {}): Promise<MCPToolResult> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      // Add to queue
      this.toolQueue.push({
        toolName,
        parameters,
        resolve,
        reject,
        startTime
      });
      
      // Process queue
      this.processQueue();
      
      // Set timeout
      setTimeout(() => {
        reject(new Error(`Tool execution timeout: ${toolName}`));
      }, this.config.timeout);
    });
  }

  /**
   * Process the tool execution queue
   */
  private async processQueue(): Promise<void> {
    if (this.executingTools >= this.config.maxConcurrentTools || this.toolQueue.length === 0) {
      return;
    }

    const toolExecution = this.toolQueue.shift();
    if (!toolExecution) return;

    this.executingTools++;

    try {
      const result = await this.executeToolDirect(
        toolExecution.toolName,
        toolExecution.parameters,
        toolExecution.startTime
      );
      
      toolExecution.resolve(result);
    } catch (error) {
      toolExecution.reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.executingTools--;
      this.processQueue(); // Process next in queue
    }
  }

  /**
   * Execute tool directly via Claude Flow CLI
   */
  private async executeToolDirect(
    toolName: string,
    parameters: any,
    startTime: number
  ): Promise<MCPToolResult> {
    return new Promise((resolve, reject) => {
      const args = this.buildToolCommand(toolName, parameters);
      console.log(`Executing: npx claude-flow@alpha ${args.join(' ')}`);
      
      const process = spawn('npx', ['claude-flow@alpha', ...args], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        const executionTime = Date.now() - startTime;
        
        if (code === 0) {
          try {
            // Try to parse JSON output
            let data = stdout.trim();
            try {
              data = JSON.parse(data);
            } catch {
              // Keep as string if not JSON
            }

            resolve({
              success: true,
              data,
              executionTime,
              metadata: {
                toolName,
                parameters,
                timestamp: new Date().toISOString()
              }
            });
          } catch (error) {
            reject(new Error(`Failed to parse tool output: ${error}`));
          }
        } else {
          resolve({
            success: false,
            error: stderr || `Tool execution failed with code ${code}`,
            executionTime,
            metadata: {
              toolName,
              parameters,
              timestamp: new Date().toISOString()
            }
          });
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Tool execution error: ${error.message}`));
      });
    });
  }

  /**
   * Build command arguments for Claude Flow tool execution
   */
  private buildToolCommand(toolName: string, parameters: any): string[] {
    const args: string[] = [];

    // Map tool names to Claude Flow commands
    switch (toolName) {
      case 'swarm_init':
        args.push('swarm');
        if (parameters.topology) args.push('--topology', parameters.topology);
        if (parameters.maxAgents) args.push('--agents', parameters.maxAgents.toString());
        break;
        
      case 'agent_spawn':
        args.push('agent', 'spawn');
        if (parameters.type) args.push('--type', parameters.type);
        if (parameters.name) args.push('--name', parameters.name);
        break;
        
      case 'task_orchestrate':
        args.push('swarm', parameters.task || 'default task');
        if (parameters.strategy) args.push('--strategy', parameters.strategy);
        break;
        
      case 'memory_usage':
        args.push('memory', parameters.action || 'list');
        if (parameters.key) args.push('--key', parameters.key);
        if (parameters.value) args.push('--value', parameters.value);
        break;
        
      case 'neural_status':
        args.push('training', 'status');
        break;
        
      case 'neural_train':
        args.push('training', 'neural', 'train');
        if (parameters.pattern_type) args.push('--pattern', parameters.pattern_type);
        break;
        
      case 'performance_report':
        args.push('analysis', 'performance');
        if (parameters.format) args.push('--format', parameters.format);
        break;
        
      case 'swarm_status':
        args.push('status');
        break;
        
      case 'github_repo_analyze':
        args.push('github', 'analyze');
        if (parameters.repo) args.push('--repo', parameters.repo);
        break;
        
      default:
        // Generic tool execution
        args.push('mcp', 'execute', toolName);
        if (Object.keys(parameters).length > 0) {
          args.push('--params', JSON.stringify(parameters));
        }
        break;
    }

    return args;
  }

  /**
   * Parse server output for tool responses
   */
  private parseServerOutput(output: string): void {
    try {
      // Look for JSON responses in the output
      const jsonMatch = output.match(/\{[^}]*\}/);
      if (jsonMatch) {
        const response = JSON.parse(jsonMatch[0]);
        this.emit('tool-response', response);
      }
    } catch (error) {
      // Not JSON output, ignore
    }
  }

  /**
   * Get static tool list as fallback
   */
  private getStaticToolList(): MCPToolSchema[] {
    return [
      {
        name: 'swarm_init',
        description: 'Initialize swarm with topology and configuration',
        parameters: {
          type: 'object',
          properties: {
            topology: { type: 'string', enum: ['hierarchical', 'mesh', 'ring', 'star'] },
            maxAgents: { type: 'number', default: 8 }
          },
          required: ['topology']
        }
      },
      {
        name: 'agent_spawn',
        description: 'Create specialized AI agents',
        parameters: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['coordinator', 'researcher', 'coder', 'analyst', 'architect', 'tester'] },
            name: { type: 'string' }
          },
          required: ['type']
        }
      },
      {
        name: 'task_orchestrate',
        description: 'Orchestrate complex task workflows',
        parameters: {
          type: 'object',
          properties: {
            task: { type: 'string' },
            strategy: { type: 'string', enum: ['parallel', 'sequential', 'adaptive'] }
          },
          required: ['task']
        }
      },
      {
        name: 'memory_usage',
        description: 'Store/retrieve persistent memory',
        parameters: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['store', 'retrieve', 'list', 'delete'] },
            key: { type: 'string' },
            value: { type: 'string' }
          },
          required: ['action']
        }
      },
      {
        name: 'neural_status',
        description: 'Check neural network status',
        parameters: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'performance_report',
        description: 'Generate performance reports',
        parameters: {
          type: 'object',
          properties: {
            format: { type: 'string', enum: ['summary', 'detailed', 'json'] },
            timeframe: { type: 'string', enum: ['24h', '7d', '30d'] }
          }
        }
      },
      {
        name: 'swarm_status',
        description: 'Monitor swarm health and performance',
        parameters: {
          type: 'object',
          properties: {}
        }
      }
    ];
  }

  /**
   * Stop all MCP servers
   */
  async shutdown(): Promise<void> {
    for (const [name, server] of this.servers) {
      console.log(`Stopping MCP server: ${name}`);
      server.kill('SIGTERM');
      
      // Force kill after timeout
      setTimeout(() => {
        if (!server.killed) {
          server.kill('SIGKILL');
        }
      }, 5000);
    }
    
    this.servers.clear();
    this.toolQueue.length = 0;
    this.executingTools = 0;
  }

  /**
   * Check if handler is ready
   */
  isReady(): boolean {
    return this.servers.size > 0;
  }

  /**
   * Get execution statistics
   */
  getStats(): {
    activeServers: number;
    queuedTools: number;
    executingTools: number;
  } {
    return {
      activeServers: this.servers.size,
      queuedTools: this.toolQueue.length,
      executingTools: this.executingTools
    };
  }
}

// Singleton instance
let mcpHandler: MCPHandler | null = null;

/**
 * Get or create MCP handler instance
 */
export function getMCPHandler(config?: Partial<MCPServerConfig>): MCPHandler {
  if (!mcpHandler) {
    mcpHandler = new MCPHandler(config);
  }
  return mcpHandler;
}

/**
 * Initialize MCP handler if not already done
 */
export async function initializeMCPHandler(config?: Partial<MCPServerConfig>): Promise<MCPHandler> {
  const handler = getMCPHandler(config);
  
  if (!handler.isReady()) {
    await handler.initialize();
  }
  
  return handler;
}