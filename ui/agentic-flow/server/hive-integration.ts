/**
 * HiveMind Integration Layer
 * Connects UI backend to the real HiveMind system
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface HiveMindConfig {
  databasePath: string;
  memoryPath: string;
  io: Server;
  claudeFlowPath?: string;
}

export interface SwarmState {
  swarmId: string;
  topology: string;
  agents: any[];
  tasks: any[];
  status: 'active' | 'idle' | 'error';
  performance: any;
}

export class HiveMindIntegration extends EventEmitter {
  private config: HiveMindConfig;
  private claudeFlowProcess: ChildProcess | null = null;
  private connected: boolean = false;
  private currentSwarm: SwarmState | null = null;
  private claudeFlowPath: string;

  constructor(config: HiveMindConfig) {
    super();
    this.config = config;
    this.claudeFlowPath = config.claudeFlowPath || path.join(__dirname, '../../../claude-flow');
  }

  async initialize(): Promise<void> {
    try {
      // Ensure directories exist
      await this.ensureDirectories();
      
      // Check if claude-flow binary exists
      await this.verifyClaudeFlow();
      
      this.connected = true;
      console.log('✅ HiveMind integration initialized');
    } catch (error) {
      console.error('❌ HiveMind initialization failed:', error);
      throw error;
    }
  }

  private async ensureDirectories(): Promise<void> {
    const dirs = [
      path.dirname(this.config.databasePath),
      this.config.memoryPath
    ];

    for (const dir of dirs) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    }
  }

  private async verifyClaudeFlow(): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn('npx', ['claude-flow@alpha', '--version'], {
        stdio: 'pipe',
        cwd: path.join(__dirname, '../../..')
      });

      let output = '';
      process.stdout?.on('data', (data) => {
        output += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Claude Flow available: ${output.trim()}`);
          resolve();
        } else {
          reject(new Error(`Claude Flow not available (exit code: ${code})`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to check claude-flow: ${error.message}`));
      });
    });
  }

  // ===== SWARM OPERATIONS =====

  async initializeSwarm(options: {
    topology: 'mesh' | 'hierarchical' | 'ring' | 'star';
    maxAgents?: number;
    strategy?: string;
  }): Promise<string> {
    return new Promise((resolve, reject) => {
      const swarmId = `swarm-${Date.now()}`;
      
      const args = [
        'claude-flow@alpha',
        'swarm',
        'init',
        '--topology', options.topology,
        '--max-agents', (options.maxAgents || 5).toString(),
        '--strategy', options.strategy || 'balanced',
        '--output', 'json'
      ];

      console.log('🔄 Initializing swarm:', args.join(' '));

      const process = spawn('npx', args, {
        stdio: 'pipe',
        cwd: path.join(__dirname, '../../..')
      });

      let output = '';
      let errorOutput = '';

      process.stdout?.on('data', (data) => {
        output += data.toString();
      });

      process.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            // Parse JSON output or create fallback response
            let result;
            try {
              result = JSON.parse(output);
            } catch {
              result = {
                swarmId,
                topology: options.topology,
                maxAgents: options.maxAgents || 5,
                status: 'initialized'
              };
            }

            this.currentSwarm = {
              swarmId,
              topology: options.topology,
              agents: [],
              tasks: [],
              status: 'active',
              performance: {}
            };

            // Notify UI via WebSocket
            this.config.io.emit('swarm:initialized', result);

            resolve(swarmId);
          } catch (error) {
            reject(new Error(`Failed to parse swarm init output: ${error}`));
          }
        } else {
          console.error('Swarm init stderr:', errorOutput);
          reject(new Error(`Swarm initialization failed: ${errorOutput}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to spawn swarm init process: ${error.message}`));
      });
    });
  }

  async getSwarmStatus(swarmId?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const args = ['claude-flow@alpha', 'swarm', 'status', '--output', 'json'];
      if (swarmId) {
        args.push('--swarm-id', swarmId);
      }

      const process = spawn('npx', args, {
        stdio: 'pipe',
        cwd: path.join(__dirname, '../../..')
      });

      let output = '';
      
      process.stdout?.on('data', (data) => {
        output += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            resolve(result);
          } catch {
            // Fallback response if JSON parsing fails
            resolve(this.currentSwarm || {
              swarmId: swarmId || 'unknown',
              status: 'active',
              agents: [],
              tasks: []
            });
          }
        } else {
          reject(new Error('Failed to get swarm status'));
        }
      });
    });
  }

  // ===== AGENT OPERATIONS =====

  async spawnAgent(options: {
    type: 'coordinator' | 'researcher' | 'coder' | 'analyst' | 'architect' | 'tester';
    name?: string;
    capabilities?: string[];
  }): Promise<string> {
    return new Promise((resolve, reject) => {
      const agentId = `agent-${options.type}-${Date.now()}`;
      
      const args = [
        'claude-flow@alpha',
        'agent',
        'spawn',
        '--type', options.type,
        '--name', options.name || `${options.type}-agent`,
        '--output', 'json'
      ];

      if (options.capabilities && options.capabilities.length > 0) {
        args.push('--capabilities', options.capabilities.join(','));
      }

      console.log('🤖 Spawning agent:', args.join(' '));

      const process = spawn('npx', args, {
        stdio: 'pipe',
        cwd: path.join(__dirname, '../../..')
      });

      let output = '';

      process.stdout?.on('data', (data) => {
        output += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            let result;
            try {
              result = JSON.parse(output);
            } catch {
              result = {
                agentId,
                type: options.type,
                name: options.name || `${options.type}-agent`,
                status: 'active',
                capabilities: options.capabilities || []
              };
            }

            // Update current swarm state
            if (this.currentSwarm) {
              this.currentSwarm.agents.push(result);
            }

            // Notify UI
            this.config.io.emit('agent:spawned', result);

            resolve(agentId);
          } catch (error) {
            reject(new Error(`Failed to parse agent spawn output: ${error}`));
          }
        } else {
          reject(new Error('Failed to spawn agent'));
        }
      });
    });
  }

  async listAgents(swarmId?: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const args = ['claude-flow@alpha', 'agent', 'list', '--output', 'json'];
      if (swarmId) {
        args.push('--swarm-id', swarmId);
      }

      const process = spawn('npx', args, {
        stdio: 'pipe',
        cwd: path.join(__dirname, '../../..')
      });

      let output = '';

      process.stdout?.on('data', (data) => {
        output += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            resolve(Array.isArray(result) ? result : []);
          } catch {
            // Fallback to current swarm agents
            resolve(this.currentSwarm?.agents || []);
          }
        } else {
          resolve(this.currentSwarm?.agents || []);
        }
      });
    });
  }

  // ===== TASK OPERATIONS =====

  async orchestrateTask(task: string, options?: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const taskId = `task-${Date.now()}`;
      
      const args = [
        'claude-flow@alpha',
        'task',
        'orchestrate',
        '--task', task,
        '--output', 'json'
      ];

      if (options?.strategy) {
        args.push('--strategy', options.strategy);
      }
      if (options?.priority) {
        args.push('--priority', options.priority);
      }

      console.log('📋 Orchestrating task:', args.join(' '));

      const process = spawn('npx', args, {
        stdio: 'pipe',
        cwd: path.join(__dirname, '../../..')
      });

      let output = '';

      process.stdout?.on('data', (data) => {
        output += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            let result;
            try {
              result = JSON.parse(output);
            } catch {
              result = {
                taskId,
                task,
                status: 'pending',
                priority: options?.priority || 'medium',
                strategy: options?.strategy || 'parallel'
              };
            }

            // Update current swarm state
            if (this.currentSwarm) {
              this.currentSwarm.tasks.push(result);
            }

            // Notify UI
            this.config.io.emit('task:orchestrated', result);

            resolve(taskId);
          } catch (error) {
            reject(new Error(`Failed to parse task orchestration output: ${error}`));
          }
        } else {
          reject(new Error('Failed to orchestrate task'));
        }
      });
    });
  }

  // ===== MEMORY OPERATIONS =====

  async storeMemory(key: string, value: any, namespace = 'default'): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        'claude-flow@alpha',
        'memory',
        'store',
        '--key', key,
        '--value', JSON.stringify(value),
        '--namespace', namespace
      ];

      const process = spawn('npx', args, {
        stdio: 'pipe',
        cwd: path.join(__dirname, '../../..')
      });

      process.on('close', (code) => {
        if (code === 0) {
          // Notify UI
          this.config.io.emit('memory:stored', { key, namespace, value });
          resolve();
        } else {
          reject(new Error('Failed to store memory'));
        }
      });
    });
  }

  async retrieveMemory(key: string, namespace = 'default'): Promise<any> {
    return new Promise((resolve, reject) => {
      const args = [
        'claude-flow@alpha',
        'memory',
        'retrieve',
        '--key', key,
        '--namespace', namespace,
        '--output', 'json'
      ];

      const process = spawn('npx', args, {
        stdio: 'pipe',
        cwd: path.join(__dirname, '../../..')
      });

      let output = '';

      process.stdout?.on('data', (data) => {
        output += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            resolve(result.value);
          } catch {
            resolve(output.trim() || null);
          }
        } else {
          resolve(null);
        }
      });
    });
  }

  // ===== PERFORMANCE OPERATIONS =====

  async getPerformanceReport(): Promise<any> {
    return new Promise((resolve, reject) => {
      const args = [
        'claude-flow@alpha',
        'performance',
        'report',
        '--format', 'json'
      ];

      const process = spawn('npx', args, {
        stdio: 'pipe',
        cwd: path.join(__dirname, '../../..')
      });

      let output = '';

      process.stdout?.on('data', (data) => {
        output += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            resolve(result);
          } catch {
            // Fallback performance data
            resolve({
              timestamp: new Date().toISOString(),
              swarms: this.currentSwarm ? 1 : 0,
              agents: this.currentSwarm?.agents.length || 0,
              tasks: this.currentSwarm?.tasks.length || 0,
              memory_entries: 0,
              avg_response_time: 0
            });
          }
        } else {
          reject(new Error('Failed to get performance report'));
        }
      });
    });
  }

  // ===== UTILITY METHODS =====

  isConnected(): boolean {
    return this.connected;
  }

  getCurrentSwarm(): SwarmState | null {
    return this.currentSwarm;
  }

  async cleanup(): Promise<void> {
    if (this.claudeFlowProcess) {
      this.claudeFlowProcess.kill();
      this.claudeFlowProcess = null;
    }
    this.connected = false;
    console.log('✅ HiveMind integration cleanup complete');
  }
}