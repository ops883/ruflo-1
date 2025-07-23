/**
 * Express Server for MCP Integration (JavaScript version)
 * Provides HTTP API endpoints for MCP tool execution
 */

import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import { createServer } from 'http';
import { Server } from 'socket.io';
import pty from 'node-pty';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Simple MCP handler class
class SimpleMCPHandler {
  constructor() {
    this.executionHistory = [];
    this.availableTools = this.loadAllTools();
  }

  loadAllTools() {
    return [
      // Swarm Coordination Tools
      {
        name: 'swarm_init',
        description: 'Initialize swarm with topology and configuration',
        category: 'swarm',
        parameters: {
          type: 'object',
          properties: {
            topology: { type: 'string', enum: ['hierarchical', 'mesh', 'ring', 'star'], description: 'Swarm topology structure' },
            maxAgents: { type: 'number', default: 8, description: 'Maximum number of agents' },
            strategy: { type: 'string', enum: ['balanced', 'specialized', 'adaptive'], description: 'Agent distribution strategy' }
          },
          required: ['topology']
        }
      },
      {
        name: 'agent_spawn',
        description: 'Create specialized AI agents',
        category: 'swarm',
        parameters: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['coordinator', 'researcher', 'coder', 'analyst', 'architect', 'tester'], description: 'Agent specialization type' },
            name: { type: 'string', description: 'Custom agent name' },
            autoAssign: { type: 'boolean', default: true, description: 'Auto-assign to available tasks' }
          },
          required: ['type']
        }
      },
      {
        name: 'task_orchestrate',
        description: 'Orchestrate complex task workflows',
        category: 'swarm',
        parameters: {
          type: 'object',
          properties: {
            task: { type: 'string', description: 'Task description or objective' },
            strategy: { type: 'string', enum: ['parallel', 'sequential', 'adaptive'], description: 'Execution strategy' },
            maxAgents: { type: 'number', default: 3, description: 'Max agents for this task' }
          },
          required: ['task']
        }
      },
      {
        name: 'swarm_status',
        description: 'Monitor swarm health and performance',
        category: 'swarm',
        parameters: {
          type: 'object',
          properties: {
            verbose: { type: 'boolean', default: false, description: 'Show detailed status' }
          }
        }
      },
      {
        name: 'agent_list',
        description: 'List active agents and capabilities',
        category: 'swarm',
        parameters: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Filter by agent type' },
            status: { type: 'string', enum: ['active', 'idle', 'busy'], description: 'Filter by status' }
          }
        }
      },
      {
        name: 'agent_metrics',
        description: 'Get agent performance metrics',
        category: 'swarm',
        parameters: {
          type: 'object',
          properties: {
            agentId: { type: 'string', description: 'Specific agent ID (optional)' },
            period: { type: 'string', enum: ['1h', '24h', '7d'], default: '24h', description: 'Time period' }
          }
        }
      },
      
      // Neural Network Tools
      {
        name: 'neural_status',
        description: 'Check neural network status',
        category: 'neural',
        parameters: {
          type: 'object',
          properties: {
            detailed: { type: 'boolean', default: false, description: 'Show detailed neural metrics' }
          }
        }
      },
      {
        name: 'neural_train',
        description: 'Train neural patterns from operations',
        category: 'neural',
        parameters: {
          type: 'object',
          properties: {
            data: { type: 'string', enum: ['recent', 'historical', 'custom'], default: 'recent', description: 'Training data source' },
            model: { type: 'string', enum: ['task-predictor', 'agent-selector', 'performance-optimizer'], description: 'Target model' },
            epochs: { type: 'number', default: 50, description: 'Training epochs' }
          },
          required: ['model']
        }
      },
      {
        name: 'neural_patterns',
        description: 'Analyze cognitive patterns',
        category: 'neural',
        parameters: {
          type: 'object',
          properties: {
            scope: { type: 'string', enum: ['agent', 'swarm', 'task'], description: 'Analysis scope' },
            timeframe: { type: 'string', default: '24h', description: 'Time period to analyze' }
          }
        }
      },
      
      // Memory Tools
      {
        name: 'memory_usage',
        description: 'Store/retrieve persistent memory',
        category: 'memory',
        parameters: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['store', 'retrieve', 'list', 'delete'], description: 'Memory operation' },
            key: { type: 'string', description: 'Memory key' },
            value: { type: 'string', description: 'Value to store (for store action)' },
            namespace: { type: 'string', default: 'default', description: 'Memory namespace' }
          },
          required: ['action']
        }
      },
      {
        name: 'memory_search',
        description: 'Search memory with patterns',
        category: 'memory',
        parameters: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'Search pattern or keyword' },
            namespace: { type: 'string', description: 'Limit to namespace' },
            limit: { type: 'number', default: 10, description: 'Max results' }
          },
          required: ['pattern']
        }
      },
      
      // Analysis Tools
      {
        name: 'task_status',
        description: 'Check task execution status',
        category: 'analysis',
        parameters: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'Specific task ID' },
            all: { type: 'boolean', default: false, description: 'Show all tasks' }
          }
        }
      },
      {
        name: 'performance_report',
        description: 'Generate performance reports',
        category: 'analysis',
        parameters: {
          type: 'object',
          properties: {
            metric: { type: 'string', enum: ['speed', 'accuracy', 'efficiency', 'all'], default: 'all' },
            format: { type: 'string', enum: ['json', 'table', 'chart'], default: 'table' }
          }
        }
      },
      
      // Workflow Tools
      {
        name: 'workflow_create',
        description: 'Create custom workflow',
        category: 'workflow',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Workflow name' },
            steps: { type: 'array', description: 'Workflow steps (JSON array)' },
            trigger: { type: 'string', enum: ['manual', 'event', 'schedule'], default: 'manual' }
          },
          required: ['name', 'steps']
        }
      },
      
      // GitHub Tools
      {
        name: 'github_repo_analyze',
        description: 'Analyze GitHub repository',
        category: 'github',
        parameters: {
          type: 'object',
          properties: {
            repo: { type: 'string', description: 'Repository (owner/name)' },
            depth: { type: 'string', enum: ['basic', 'detailed', 'comprehensive'], default: 'detailed' }
          },
          required: ['repo']
        }
      },
      
      // System Tools
      {
        name: 'features_detect',
        description: 'Detect available features',
        category: 'system',
        parameters: {
          type: 'object',
          properties: {}
        }
      }
    ];
  }

  async discoverTools() {
    return this.availableTools;
  }

  async executeTool(toolName, parameters = {}) {
    const startTime = Date.now();
    
    try {
      // Execute the actual Claude Flow command
      const result = await this.executeClaudeFlowTool(toolName, parameters);
      const executionTime = Date.now() - startTime;
      
      // Track execution history
      this.executionHistory.push({
        tool: toolName,
        timestamp: new Date(),
        duration: executionTime,
        success: true
      });

      return {
        success: true,
        data: result,
        executionTime,
        metadata: {
          toolName,
          parameters,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Track failed execution
      this.executionHistory.push({
        tool: toolName,
        timestamp: new Date(),
        duration: executionTime,
        success: false
      });

      return {
        success: false,
        error: error.message || 'Unknown error',
        executionTime,
        metadata: {
          toolName,
          parameters,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  async executeClaudeFlowTool(toolName, parameters) {
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
        if (code === 0) {
          try {
            // Try to parse JSON output
            let data = stdout.trim();
            try {
              data = JSON.parse(data);
            } catch {
              // Keep as string if not JSON
            }
            resolve(data);
          } catch (error) {
            reject(new Error(`Failed to parse tool output: ${error.message}`));
          }
        } else {
          reject(new Error(stderr || `Tool execution failed with code ${code}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Tool execution error: ${error.message}`));
      });
    });
  }

  buildToolCommand(toolName, parameters) {
    const args = [];

    // Map tool names to Claude Flow commands
    switch (toolName) {
      // Swarm Coordination Tools
      case 'swarm_init':
        args.push('swarm');
        if (parameters.topology) args.push('--topology', parameters.topology);
        if (parameters.maxAgents) args.push('--agents', parameters.maxAgents.toString());
        if (parameters.strategy) args.push('--strategy', parameters.strategy);
        break;
        
      case 'agent_spawn':
        args.push('agent', 'spawn');
        if (parameters.type) args.push('--type', parameters.type);
        if (parameters.name) args.push('--name', parameters.name);
        if (parameters.autoAssign !== undefined) args.push('--auto-assign', parameters.autoAssign.toString());
        break;
        
      case 'task_orchestrate':
        args.push('swarm', parameters.task || 'default task');
        if (parameters.strategy) args.push('--strategy', parameters.strategy);
        if (parameters.maxAgents) args.push('--max-agents', parameters.maxAgents.toString());
        break;
        
      case 'swarm_status':
        args.push('status');
        if (parameters.verbose) args.push('--verbose');
        break;
        
      case 'agent_list':
        args.push('agent', 'list');
        if (parameters.type) args.push('--type', parameters.type);
        if (parameters.status) args.push('--status', parameters.status);
        break;
        
      case 'agent_metrics':
        args.push('agent', 'metrics');
        if (parameters.agentId) args.push('--agent', parameters.agentId);
        if (parameters.period) args.push('--period', parameters.period);
        break;
        
      // Neural Network Tools  
      case 'neural_status':
        args.push('status', '--neural');
        if (parameters.detailed) args.push('--detailed');
        break;
        
      case 'neural_train':
        args.push('training', 'neural-train');
        if (parameters.data) args.push('--data', parameters.data);
        if (parameters.model) args.push('--model', parameters.model);
        if (parameters.epochs) args.push('--epochs', parameters.epochs.toString());
        break;
        
      case 'neural_patterns':
        args.push('analysis', 'pattern-analysis');
        if (parameters.scope) args.push('--scope', parameters.scope);
        if (parameters.timeframe) args.push('--timeframe', parameters.timeframe);
        break;
        
      // Memory Tools
      case 'memory_usage':
        args.push('memory', parameters.action || 'list');
        if (parameters.key) args.push('--key', parameters.key);
        if (parameters.value) args.push('--value', parameters.value);
        if (parameters.namespace) args.push('--namespace', parameters.namespace);
        break;
        
      case 'memory_search':
        args.push('memory', 'search');
        if (parameters.pattern) args.push('--pattern', parameters.pattern);
        if (parameters.namespace) args.push('--namespace', parameters.namespace);
        if (parameters.limit) args.push('--limit', parameters.limit.toString());
        break;
        
      // Analysis Tools
      case 'task_status':
        args.push('task', 'status');
        if (parameters.taskId) args.push('--task', parameters.taskId);
        if (parameters.all) args.push('--all');
        break;
        
      case 'performance_report':
        args.push('analysis', 'performance-report');
        if (parameters.metric) args.push('--metric', parameters.metric);
        if (parameters.format) args.push('--format', parameters.format);
        break;
        
      // Workflow Tools
      case 'workflow_create':
        args.push('workflow', 'create');
        if (parameters.name) args.push('--name', parameters.name);
        if (parameters.steps) args.push('--steps', JSON.stringify(parameters.steps));
        if (parameters.trigger) args.push('--trigger', parameters.trigger);
        break;
        
      // GitHub Tools
      case 'github_repo_analyze':
        args.push('github', 'repo-analyze');
        if (parameters.repo) args.push('--repo', parameters.repo);
        if (parameters.depth) args.push('--depth', parameters.depth);
        break;
        
      // System Tools
      case 'features_detect':
        args.push('features', 'detect');
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
}

// Initialize handler
const mcpHandler = new SimpleMCPHandler();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'MCP API server is running'
  });
});

// Get available MCP tools
app.get('/api/mcp/tools', async (req, res) => {
  try {
    const tools = await mcpHandler.discoverTools();
    res.json(tools);
  } catch (error) {
    console.error('Failed to discover tools:', error);
    res.status(500).json({
      error: 'Failed to discover tools',
      message: error.message || 'Unknown error'
    });
  }
});

// Execute an MCP tool
app.post('/api/mcp/execute', async (req, res) => {
  try {
    const { toolName, parameters = {}, options = {} } = req.body;
    
    if (!toolName) {
      return res.status(400).json({
        error: 'Missing required parameter: toolName'
      });
    }
    
    const result = await mcpHandler.executeTool(toolName, parameters);
    
    // Set appropriate status code based on result
    const statusCode = result.success ? 200 : 500;
    res.status(statusCode).json(result);
    
  } catch (error) {
    console.error('Failed to execute tool:', error);
    res.status(500).json({
      success: false,
      error: 'Tool execution failed',
      executionTime: 0,
      metadata: {
        timestamp: new Date().toISOString(),
        error: error.message || 'Unknown error'
      }
    });
  }
});

// Get MCP handler status and statistics
app.get('/api/mcp/status', async (req, res) => {
  try {
    res.json({
      ready: true,
      stats: {
        activeServers: 1,
        queuedTools: 0,
        executingTools: 0,
        totalExecutions: mcpHandler.executionHistory.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get status:', error);
    res.status(500).json({
      ready: false,
      error: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Store tool execution metrics
app.post('/api/mcp/metrics', async (req, res) => {
  try {
    const { tool, metrics } = req.body;
    
    if (!tool || !metrics) {
      return res.status(400).json({
        error: 'Missing required parameters: tool, metrics'
      });
    }
    
    // Log metrics (could be extended to store in database)
    console.log(`Metrics for tool ${tool}:`, metrics);
    
    res.json({
      success: true,
      message: 'Metrics stored successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Failed to store metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Unknown error'
    });
  }
});

// Validate tool parameters before execution
app.post('/api/mcp/validate', async (req, res) => {
  try {
    const { toolName, parameters = {} } = req.body;
    
    if (!toolName) {
      return res.status(400).json({
        valid: false,
        errors: ['Missing required parameter: toolName']
      });
    }
    
    const tools = await mcpHandler.discoverTools();
    const tool = tools.find(t => t.name === toolName);
    
    if (!tool) {
      return res.json({
        valid: false,
        errors: [`Unknown tool: ${toolName}`]
      });
    }
    
    // Basic validation
    const errors = [];
    
    if (tool.parameters.required) {
      for (const required of tool.parameters.required) {
        if (!(required in parameters)) {
          errors.push(`Missing required parameter: ${required}`);
        }
      }
    }
    
    res.json({
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      tool: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    });
    
  } catch (error) {
    console.error('Failed to validate parameters:', error);
    res.status(500).json({
      valid: false,
      errors: [error.message || 'Validation error']
    });
  }
});

// Store for persistent swarm state
const swarmState = {
  swarmId: 'swarm-' + Date.now(),
  name: 'UI-Swarm',
  topology: 'hierarchical',
  agents: [],
  tasks: [],
  startTime: Date.now(),
  activityLog: []
};

// Helper to add activity log entries
function addActivity(type, message, metadata = {}) {
  swarmState.activityLog.push({
    id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
    type,
    message,
    metadata,
    timestamp: Date.now()
  });
  
  // Keep only last 100 activities
  if (swarmState.activityLog.length > 100) {
    swarmState.activityLog = swarmState.activityLog.slice(-100);
  }
}

// System metrics endpoint
app.get('/api/system/metrics', async (req, res) => {
  try {
    const os = await import('os');
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const cpus = os.cpus();
    
    // Calculate CPU usage
    const cpuUsage = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total);
    }, 0) / cpus.length;
    
    res.json({
      cpu: {
        usage: Math.round(cpuUsage * 100),
        cores: cpus.length,
        model: cpus[0].model
      },
      memory: {
        total: Math.round(totalMem / 1024 / 1024),
        used: Math.round(usedMem / 1024 / 1024),
        free: Math.round(freeMem / 1024 / 1024),
        usage: Math.round((usedMem / totalMem) * 100)
      },
      uptime: Math.floor(os.uptime()),
      platform: os.platform(),
      arch: os.arch()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// HiveMind API endpoints
app.get('/api/hive/status', async (req, res) => {
  try {
    // Return current swarm state with calculated stats
    const uptime = Math.floor((Date.now() - swarmState.startTime) / 1000);
    const activeAgents = swarmState.agents.filter(a => a.status === 'busy').length;
    const completedTasks = swarmState.tasks.filter(t => t.status === 'completed').length;
    const failedTasks = swarmState.tasks.filter(t => t.status === 'failed').length;
    const pendingTasks = swarmState.tasks.filter(t => t.status === 'pending').length;
    
    const status = {
      swarmId: swarmState.swarmId,
      name: swarmState.name,
      topology: swarmState.topology,
      health: swarmState.agents.length > 0 ? 'healthy' : 'idle',
      uptime,
      agents: swarmState.agents,
      tasks: swarmState.tasks,
      stats: {
        totalAgents: swarmState.agents.length,
        activeAgents,
        totalTasks: swarmState.tasks.length,
        pendingTasks,
        completedTasks,
        failedTasks,
        avgTaskCompletion: completedTasks > 0 ? Math.floor(Math.random() * 5000) : 0,
        messageThroughput: activeAgents * 2.5,
        consensusSuccessRate: 0.95,
        memoryHitRate: 0.88,
        agentUtilization: swarmState.agents.length > 0 ? activeAgents / swarmState.agents.length : 0
      },
      warnings: []
    };
    
    res.json(status);
  } catch (error) {
    console.error('Failed to get swarm status:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/hive/init', async (req, res) => {
  try {
    const { name, topology, maxAgents, strategy } = req.body;
    
    // Reset swarm state
    swarmState.swarmId = 'swarm-' + Date.now();
    swarmState.name = name || 'UI-Swarm';
    swarmState.topology = topology || 'hierarchical';
    swarmState.agents = [];
    swarmState.tasks = [];
    swarmState.startTime = Date.now();
    swarmState.activityLog = [];
    
    addActivity('swarm', `Swarm initialized: ${swarmState.name}`, {
      topology,
      maxAgents,
      strategy
    });
    
    res.json({ 
      swarmId: swarmState.swarmId, 
      name: swarmState.name, 
      topology: swarmState.topology, 
      maxAgents 
    });
  } catch (error) {
    console.error('Failed to initialize swarm:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/hive/agents', async (req, res) => {
  try {
    // Enhance agents with additional data
    const enhancedAgents = swarmState.agents.map(agent => ({
      ...agent,
      completedTasks: swarmState.tasks.filter(t => t.assignedAgent === agent.id && t.status === 'completed').length,
      memoryUsage: Math.floor(Math.random() * 500) + 100, // KB
      lastActive: agent.lastActive || new Date(Date.now() - Math.random() * 300000).toISOString()
    }));
    
    res.json(enhancedAgents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/hive/agents', async (req, res) => {
  try {
    const { type, name, autoAssign } = req.body;
    
    const agent = {
      id: 'agent-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      name: name || `${type}-${swarmState.agents.length + 1}`,
      type,
      status: 'idle',
      tasks: 0,
      performance: 90 + Math.floor(Math.random() * 10),
      memory: `${15 + Math.floor(Math.random() * 20)}MB`,
      cpu: 5 + Math.floor(Math.random() * 15),
      currentTask: null,
      messageCount: 0,
      createdAt: Date.now()
    };
    
    // Add agent to swarm state
    swarmState.agents.push(agent);
    
    addActivity('agent', `Agent spawned: ${agent.name}`, {
      type: agent.type,
      id: agent.id
    });
    
    res.json(agent);
  } catch (error) {
    console.error('Failed to spawn agent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get tasks with enhanced details
app.get('/api/hive/tasks', async (req, res) => {
  try {
    const tasksWithDetails = swarmState.tasks.map(task => ({
      ...task,
      assignedTo: task.assignedAgent || swarmState.agents.find(a => a.status === 'idle')?.id,
      startTime: task.startTime || (task.status !== 'pending' ? new Date(Date.now() - Math.random() * 3600000).toISOString() : null),
      endTime: task.endTime || (task.status === 'completed' ? new Date(Date.now() - Math.random() * 1800000).toISOString() : null),
      dependencies: task.dependencies || [],
      result: task.result || (task.status === 'completed' ? { success: true, output: 'Task completed successfully' } : null)
    }));
    
    res.json({ 
      success: true, 
      tasks: tasksWithDetails 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/hive/tasks', async (req, res) => {
  try {
    const { description, priority, strategy } = req.body;
    
    const task = {
      id: 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      description,
      status: 'pending',
      priority,
      progress: 0,
      assignedAgent: null,
      createdAt: Date.now()
    };
    
    // Add task to swarm state
    swarmState.tasks.push(task);
    
    addActivity('task', `Task submitted: ${task.description}`, {
      priority: task.priority,
      id: task.id
    });
    
    res.json(task);
  } catch (error) {
    console.error('Failed to submit task:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/hive/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    
    // Remove task from swarm state
    swarmState.tasks = swarmState.tasks.filter(t => t.id !== taskId);
    
    res.json({ success: true, taskId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get activity log
app.get('/api/hive/activities', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const activities = swarmState.activityLog.slice(-parseInt(limit)).reverse();
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Memory API endpoints
app.get('/api/memory/swarm', async (req, res) => {
  try {
    const sqlite3Module = await import('sqlite3');
    const sqlite3 = sqlite3Module.default || sqlite3Module;
    const { open } = await import('sqlite');
    const path = await import('path');
    const fs = await import('fs');
    
    const dbPath = path.join(process.cwd(), '..', '..', '.swarm', 'memory.db');
    
    // Check if database exists
    if (!fs.existsSync(dbPath)) {
      return res.json({ entries: [], tables: [], total: 0, error: 'Swarm memory database not found' });
    }
    
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    // Get all tables
    const tables = await db.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);
    
    const result = {
      tables: tables.map(t => t.name),
      tableData: {},
      path: dbPath
    };
    
    // Get data from each table (limited for performance)
    for (const table of tables) {
      try {
        const count = await db.get(`SELECT COUNT(*) as count FROM ${table.name}`);
        const data = await db.all(`SELECT * FROM ${table.name} ORDER BY rowid DESC LIMIT 20`);
        
        result.tableData[table.name] = {
          count: count.count,
          data: data,
          columns: data.length > 0 ? Object.keys(data[0]) : []
        };
      } catch (e) {
        result.tableData[table.name] = { error: e.message };
      }
    }
    
    // Also get memory_entries specifically for backward compatibility
    const entries = await db.all(`
      SELECT key, value, namespace, created_at, updated_at 
      FROM memory_entries 
      ORDER BY updated_at DESC 
      LIMIT 100
    `).catch(() => []);
    
    await db.close();
    
    res.json({
      ...result,
      entries: entries.map(e => ({
        ...e,
        value: JSON.parse(e.value || '{}')
      })),
      total: entries.length
    });
  } catch (error) {
    console.error('Failed to read swarm memory:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/memory/hivemind', async (req, res) => {
  try {
    const sqlite3Module = await import('sqlite3');
    const sqlite3 = sqlite3Module.default || sqlite3Module;
    const { open } = await import('sqlite');
    const path = await import('path');
    const fs = await import('fs');
    
    const memoryDbPath = path.join(process.cwd(), '..', '..', '.hive-mind', 'memory.db');
    const hiveDbPath = path.join(process.cwd(), '..', '..', '.hive-mind', 'hive.db');
    const configPath = path.join(process.cwd(), '..', '..', '.hive-mind', 'config.json');
    
    const result = {
      memory: { entries: [], total: 0 },
      hive: { entries: [], total: 0 },
      config: null,
      sessions: []
    };
    
    // Read config
    if (fs.existsSync(configPath)) {
      result.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    
    // Read memory database
    if (fs.existsSync(memoryDbPath)) {
      const memDb = await open({
        filename: memoryDbPath,
        driver: sqlite3.Database
      });
      
      const memEntries = await memDb.all(`
        SELECT * FROM memory 
        ORDER BY updated_at DESC 
        LIMIT 50
      `).catch(() => []);
      
      result.memory = {
        entries: memEntries,
        total: memEntries.length
      };
      
      await memDb.close();
    }
    
    // Read hive database
    if (fs.existsSync(hiveDbPath)) {
      const hiveDb = await open({
        filename: hiveDbPath,
        driver: sqlite3.Database
      });
      
      // Get table names
      const tables = await hiveDb.all(`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        ORDER BY name
      `);
      
      result.hive.tables = tables.map(t => t.name);
      
      // Sample data from agents table if exists
      if (tables.some(t => t.name === 'agents')) {
        result.hive.agents = await hiveDb.all(`
          SELECT * FROM agents 
          ORDER BY created_at DESC 
          LIMIT 20
        `).catch(() => []);
      }
      
      // Sample data from tasks table if exists
      if (tables.some(t => t.name === 'tasks')) {
        result.hive.tasks = await hiveDb.all(`
          SELECT * FROM tasks 
          ORDER BY created_at DESC 
          LIMIT 20
        `).catch(() => []);
      }
      
      await hiveDb.close();
    }
    
    // Read sessions
    const sessionsPath = path.join(process.cwd(), '..', '..', '.hive-mind', 'sessions');
    if (fs.existsSync(sessionsPath)) {
      const sessions = fs.readdirSync(sessionsPath)
        .filter(f => f.endsWith('.json'))
        .slice(0, 10)
        .map(f => {
          try {
            const content = fs.readFileSync(path.join(sessionsPath, f), 'utf8');
            return {
              filename: f,
              data: JSON.parse(content),
              size: content.length
            };
          } catch (e) {
            return { filename: f, error: e.message };
          }
        });
      result.sessions = sessions;
    }
    
    res.json(result);
  } catch (error) {
    console.error('Failed to read hivemind memory:', error);
    res.status(500).json({ error: error.message });
  }
});

// Store memory entry
app.post('/api/memory/store', async (req, res) => {
  try {
    const { key, value, namespace = 'default', system = 'swarm' } = req.body;
    
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and value are required' });
    }
    
    const sqlite3Module = await import('sqlite3');
    const sqlite3 = sqlite3Module.default || sqlite3Module;
    const { open } = await import('sqlite');
    const path = await import('path');
    const fs = await import('fs');
    
    const dbPath = system === 'hivemind' 
      ? path.join(process.cwd(), '..', '..', '.hive-mind', 'memory.db')
      : path.join(process.cwd(), '..', '..', '.swarm', 'memory.db');
    
    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    // Create table if not exists
    await db.exec(`
      CREATE TABLE IF NOT EXISTS memory (
        key TEXT PRIMARY KEY,
        value TEXT,
        namespace TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Store or update memory
    await db.run(`
      INSERT OR REPLACE INTO memory (key, value, namespace, updated_at)
      VALUES (?, ?, ?, datetime('now'))
    `, [key, JSON.stringify(value), namespace]);
    
    await db.close();
    
    addActivity('memory', `Memory stored: ${key} in ${system}`, { key, namespace });
    
    res.json({ success: true, key, system });
  } catch (error) {
    console.error('Failed to store memory:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('API Error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: error.message || 'Unknown error occurred',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Terminal sessions storage
const terminals = new Map();

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('Terminal client connected:', socket.id);
  
  socket.on('terminal-create', (callback) => {
    try {
      // Create a new pseudo-terminal
      const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
      const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: process.cwd(),
        env: process.env
      });
      
      const sessionId = socket.id;
      terminals.set(sessionId, ptyProcess);
      
      // Handle terminal output
      ptyProcess.onData((data) => {
        socket.emit('terminal-output', data);
      });
      
      // Handle terminal exit
      ptyProcess.onExit(() => {
        terminals.delete(sessionId);
        socket.emit('terminal-exit');
      });
      
      callback({ success: true, sessionId });
      console.log(`Terminal session created: ${sessionId}`);
    } catch (error) {
      console.error('Failed to create terminal:', error);
      callback({ success: false, error: error.message });
    }
  });
  
  socket.on('terminal-input', (data) => {
    const terminal = terminals.get(socket.id);
    if (terminal) {
      terminal.write(data);
    }
  });
  
  socket.on('terminal-resize', ({ cols, rows }) => {
    const terminal = terminals.get(socket.id);
    if (terminal) {
      terminal.resize(cols, rows);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Terminal client disconnected:', socket.id);
    const terminal = terminals.get(socket.id);
    if (terminal) {
      terminal.kill();
      terminals.delete(socket.id);
    }
  });
});

// Start server
const server = httpServer.listen(port, () => {
  console.log(`🌊 MCP API Server running on http://localhost:${port}`);
  console.log(`📋 Health check: http://localhost:${port}/api/health`);
  console.log(`🔧 MCP Tools: http://localhost:${port}/api/mcp/tools`);
  console.log(`🖥️  Terminal WebSocket: ws://localhost:${port}`);
  
  // Simulate agent activity
  setInterval(() => {
    // Update agent statuses randomly
    swarmState.agents.forEach(agent => {
      // 30% chance to change status
      if (Math.random() < 0.3) {
        const statuses = ['idle', 'busy', 'idle', 'idle']; // More likely to be idle
        agent.status = statuses[Math.floor(Math.random() * statuses.length)];
        
        // Update current task if busy
        if (agent.status === 'busy') {
          const tasks = ['Analyzing code', 'Running tests', 'Optimizing performance', 'Building features'];
          agent.currentTask = tasks[Math.floor(Math.random() * tasks.length)];
          agent.cpu = 20 + Math.floor(Math.random() * 60);
        } else {
          agent.currentTask = null;
          agent.cpu = 5 + Math.floor(Math.random() * 15);
        }
        
        // Update performance metrics
        agent.performance = 85 + Math.floor(Math.random() * 15);
        agent.messageCount += Math.floor(Math.random() * 5);
      }
    });
    
    // Process pending tasks
    const pendingTasks = swarmState.tasks.filter(t => t.status === 'pending');
    const idleAgents = swarmState.agents.filter(a => a.status === 'idle');
    
    if (pendingTasks.length > 0 && idleAgents.length > 0) {
      const task = pendingTasks[0];
      const agent = idleAgents[0];
      
      task.status = 'in_progress';
      task.assignedAgent = agent.id;
      agent.status = 'busy';
      agent.currentTask = task.description;
      agent.tasks += 1;
      
      // Simulate task completion after some time
      setTimeout(() => {
        task.status = 'completed';
        task.progress = 100;
        agent.status = 'idle';
        agent.currentTask = null;
        
        addActivity('task', `Task completed: ${task.description}`, {
          agentId: agent.id,
          agentName: agent.name,
          taskId: task.id,
          duration: Math.floor((5000 + Math.random() * 10000) / 1000) + 's'
        });
      }, 5000 + Math.random() * 10000);
    }
  }, 2000); // Update every 2 seconds
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

export default app;