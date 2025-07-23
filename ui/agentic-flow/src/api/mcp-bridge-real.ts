/**
 * Real MCP Tools Bridge
 * Provides access to 71+ MCP tools through real Claude Flow MCP server integration
 */

import { MCPToolResult, MCPToolSchema } from '../../server/mcp-handler';

export interface MCPTool {
  name: string;
  description: string;
  parameters: any;
  category: ToolCategory;
}

export type ToolCategory = 
  | 'coordination'
  | 'monitoring'
  | 'memory'
  | 'neural'
  | 'github'
  | 'system'
  | 'workflow'
  | 'daa'
  | 'sparc';

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
  metadata?: {
    tokenUsage?: number;
    memoryUsage?: number;
    agentId?: string;
    swarmId?: string;
    timestamp?: string;
  };
}

export interface ToolExecutionOptions {
  timeout?: number;
  retryCount?: number;
  cacheResult?: boolean;
  trackMetrics?: boolean;
}

/**
 * Real MCP Tools Bridge Class
 * Connects to the actual Claude Flow MCP server
 */
export class RealMCPBridge {
  private availableTools = new Map<string, MCPToolSchema>();
  private toolCache = new Map<string, any>();
  private executionHistory: Array<{
    tool: string;
    timestamp: Date;
    duration: number;
    success: boolean;
  }> = [];
  private isInitialized = false;
  private serverUrl: string;

  constructor(serverUrl: string = '/api/mcp') {
    this.serverUrl = serverUrl;
  }

  /**
   * Initialize the MCP bridge
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      await this.discoverTools();
      this.isInitialized = true;
      console.log('Real MCP Bridge initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Real MCP Bridge:', error);
      // Use fallback static tools
      this.loadStaticTools();
      this.isInitialized = true;
    }
  }

  /**
   * Discover available tools from the real MCP server
   */
  private async discoverTools(): Promise<void> {
    try {
      const response = await fetch(`${this.serverUrl}/tools`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to discover tools: ${response.statusText}`);
      }
      
      const tools: MCPToolSchema[] = await response.json();
      this.availableTools.clear();
      
      for (const tool of tools) {
        this.availableTools.set(tool.name, tool);
      }
      
      console.log(`Discovered ${tools.length} MCP tools from server`);
    } catch (error) {
      console.error('Tool discovery failed:', error);
      throw error;
    }
  }

  /**
   * Load static tools as fallback
   */
  private loadStaticTools(): void {
    const staticTools: MCPToolSchema[] = [
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
        name: 'neural_train',
        description: 'Train neural patterns',
        parameters: {
          type: 'object',
          properties: {
            pattern_type: { type: 'string', enum: ['coordination', 'optimization', 'prediction'] },
            training_data: { type: 'string' }
          },
          required: ['pattern_type', 'training_data']
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
      },
      {
        name: 'github_repo_analyze',
        description: 'Analyze GitHub repository',
        parameters: {
          type: 'object',
          properties: {
            repo: { type: 'string' },
            analysis_type: { type: 'string', enum: ['code_quality', 'performance', 'security'] }
          },
          required: ['repo']
        }
      }
    ];
    
    for (const tool of staticTools) {
      this.availableTools.set(tool.name, tool);
    }
    
    console.log(`Loaded ${staticTools.length} static MCP tools as fallback`);
  }

  /**
   * Get all available MCP tools
   */
  async getAvailableTools(): Promise<MCPTool[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    return Array.from(this.availableTools.values()).map(schema => ({
      name: schema.name,
      description: schema.description,
      parameters: schema.parameters,
      category: this.categorizeTool(schema.name)
    }));
  }

  /**
   * Categorize tool based on name
   */
  private categorizeTool(toolName: string): ToolCategory {
    if (toolName.startsWith('swarm_') || toolName.startsWith('agent_') || toolName.startsWith('task_')) {
      return 'coordination';
    } else if (toolName.includes('monitor') || toolName.includes('metrics') || toolName.includes('status')) {
      return 'monitoring';
    } else if (toolName.startsWith('memory_')) {
      return 'memory';
    } else if (toolName.startsWith('neural_')) {
      return 'neural';
    } else if (toolName.startsWith('github_')) {
      return 'github';
    } else if (toolName.startsWith('workflow_')) {
      return 'workflow';
    } else if (toolName.startsWith('daa_')) {
      return 'daa';
    } else if (toolName.startsWith('sparc_')) {
      return 'sparc';
    } else {
      return 'system';
    }
  }

  /**
   * Execute an MCP tool using the real MCP server
   */
  async executeTool(
    toolName: string, 
    parameters: any = {}, 
    options: ToolExecutionOptions = {}
  ): Promise<ToolExecutionResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const startTime = Date.now();
    
    try {
      // Make HTTP request to MCP server endpoint
      const response = await fetch(`${this.serverUrl}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          toolName,
          parameters,
          options
        })
      });
      
      if (!response.ok) {
        throw new Error(`Tool execution failed: ${response.statusText}`);
      }
      
      const result: MCPToolResult = await response.json();
      
      // Track execution history
      this.executionHistory.push({
        tool: toolName,
        timestamp: new Date(),
        duration: result.executionTime,
        success: result.success
      });
      
      // Store in cache if requested
      if (options.cacheResult && result.success) {
        await this.cacheToolResult(toolName, parameters, result.data);
      }
      
      // Track metrics if requested
      if (options.trackMetrics) {
        await this.trackToolMetrics(toolName, result.executionTime, result.success);
      }
      
      return {
        success: result.success,
        data: result.data,
        error: result.error,
        executionTime: result.executionTime,
        metadata: {
          agentId: result.metadata?.agentId || parameters.agentId,
          swarmId: result.metadata?.swarmId,
          tokenUsage: await this.estimateTokenUsage(toolName, parameters),
          timestamp: result.metadata?.timestamp
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
      
      // Track metrics for failure
      if (options.trackMetrics) {
        await this.trackToolMetrics(toolName, executionTime, false);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime
      };
    }
  }

  /**
   * Get tool by name
   */
  async getTool(name: string): Promise<MCPTool | undefined> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const schema = this.availableTools.get(name);
    if (!schema) return undefined;
    
    return {
      name: schema.name,
      description: schema.description,
      parameters: schema.parameters,
      category: this.categorizeTool(schema.name)
    };
  }

  /**
   * Get tools by category
   */
  async getToolsByCategory(category: ToolCategory): Promise<MCPTool[]> {
    const tools = await this.getAvailableTools();
    return tools.filter(t => t.category === category);
  }

  /**
   * Search tools by keyword
   */
  async searchTools(keyword: string): Promise<MCPTool[]> {
    const tools = await this.getAvailableTools();
    const lowerKeyword = keyword.toLowerCase();
    
    return tools.filter(t => 
      t.name.toLowerCase().includes(lowerKeyword) ||
      t.description.toLowerCase().includes(lowerKeyword)
    );
  }

  /**
   * Cache tool result
   */
  private async cacheToolResult(toolName: string, parameters: any, result: any): Promise<void> {
    const cacheKey = `tool:${toolName}:${JSON.stringify(parameters)}`;
    this.toolCache.set(cacheKey, {
      result,
      timestamp: new Date(),
      ttl: 3600 // 1 hour
    });
  }

  /**
   * Track tool metrics
   */
  private async trackToolMetrics(toolName: string, executionTime: number, success: boolean): Promise<void> {
    const metrics = {
      lastExecution: new Date(),
      executionTime,
      success,
      totalExecutions: this.executionHistory.filter(h => h.tool === toolName).length
    };
    
    console.log(`Tool metrics for ${toolName}:`, metrics);
    
    // Could extend to send metrics to monitoring endpoint
    try {
      await fetch(`${this.serverUrl}/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: toolName,
          metrics
        })
      });
    } catch (error) {
      console.warn('Failed to send metrics to server:', error);
    }
  }

  /**
   * Estimate token usage for a tool
   */
  private async estimateTokenUsage(toolName: string, parameters: any): Promise<number> {
    const paramStr = JSON.stringify(parameters);
    const baseTokens = 50; // Base tokens for tool execution
    const paramTokens = Math.ceil(paramStr.length / 4); // Rough estimation
    
    return baseTokens + paramTokens;
  }

  /**
   * Get execution history
   */
  getExecutionHistory(limit?: number): Array<{
    tool: string;
    timestamp: Date;
    duration: number;
    success: boolean;
  }> {
    if (limit) {
      return this.executionHistory.slice(-limit);
    }
    return [...this.executionHistory];
  }

  /**
   * Clear execution history
   */
  clearExecutionHistory(): void {
    this.executionHistory = [];
  }

  /**
   * Get tool statistics
   */
  getToolStatistics(): Record<string, {
    totalExecutions: number;
    successRate: number;
    avgExecutionTime: number;
  }> {
    const stats: Record<string, any> = {};
    
    for (const execution of this.executionHistory) {
      if (!stats[execution.tool]) {
        stats[execution.tool] = {
          totalExecutions: 0,
          successCount: 0,
          totalTime: 0
        };
      }
      
      stats[execution.tool].totalExecutions++;
      if (execution.success) {
        stats[execution.tool].successCount++;
      }
      stats[execution.tool].totalTime += execution.duration;
    }
    
    // Calculate final statistics
    const finalStats: Record<string, any> = {};
    for (const [tool, data] of Object.entries(stats)) {
      finalStats[tool] = {
        totalExecutions: data.totalExecutions,
        successRate: data.successCount / data.totalExecutions,
        avgExecutionTime: data.totalTime / data.totalExecutions
      };
    }
    
    return finalStats;
  }

  /**
   * Check if a tool is available
   */
  hasToolOr(toolName: string): boolean {
    return this.availableTools.has(toolName);
  }

  /**
   * Validate tool parameters
   */
  async validateParameters(toolName: string, parameters: any): Promise<{
    valid: boolean;
    errors?: string[];
  }> {
    const tool = await this.getTool(toolName);
    if (!tool) {
      return {
        valid: false,
        errors: [`Unknown tool: ${toolName}`]
      };
    }

    const errors: string[] = [];
    const paramSchema = tool.parameters;

    // Check required parameters
    if (paramSchema.required) {
      for (const required of paramSchema.required) {
        if (!(required in parameters)) {
          errors.push(`Missing required parameter: ${required}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

// Singleton instance
let realMCPBridge: RealMCPBridge | null = null;

/**
 * Get or create Real MCP Bridge instance
 */
export function getRealMCPBridge(serverUrl?: string): RealMCPBridge {
  if (!realMCPBridge) {
    realMCPBridge = new RealMCPBridge(serverUrl);
  }
  return realMCPBridge;
}