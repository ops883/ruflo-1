/**
 * Mastra Integration Layer
 * Connects UI backend to the real Mastra system
 */

import { EventEmitter } from 'events';
import { Server } from 'socket.io';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface MastraConfig {
  port: number;
  baseUrl?: string;
  io: Server;
}

export interface MastraAgent {
  id: string;
  name: string;
  description: string;
  model: {
    provider: string;
    name: string;
  };
  instructions: string;
  tools: string[];
  status: 'idle' | 'busy' | 'active' | 'error';
}

export interface MastraWorkflow {
  id: string;
  name: string;
  description: string;
  steps: any[];
  status: 'idle' | 'running' | 'completed' | 'failed';
}

export interface MastraTool {
  name: string;
  description: string;
  inputSchema: any;
  status: 'available' | 'busy' | 'error';
}

export class MastraIntegration extends EventEmitter {
  private config: MastraConfig;
  private connected: boolean = false;
  private baseUrl: string;
  private agents: Map<string, MastraAgent> = new Map();
  private workflows: Map<string, MastraWorkflow> = new Map();
  private tools: Map<string, MastraTool> = new Map();

  constructor(config: MastraConfig) {
    super();
    this.config = config;
    this.baseUrl = config.baseUrl || `http://localhost:${config.port}`;
  }

  async initialize(): Promise<void> {
    try {
      // Try to connect to Mastra
      await this.testConnection();
      
      // Load initial data
      await this.loadAgents();
      await this.loadWorkflows();
      await this.loadTools();
      
      this.connected = true;
      console.log('✅ Mastra integration initialized');
    } catch (error) {
      console.warn('⚠️ Mastra server not available, using fallback mode');
      this.setupFallbackMode();
      this.connected = false; // Still false for fallback mode
    }
  }

  private async testConnection(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/health`, {
      timeout: 5000
    });
    
    if (!response.ok) {
      throw new Error(`Mastra server responded with status: ${response.status}`);
    }
  }

  private setupFallbackMode(): void {
    // Create fallback agents based on the real Mastra configuration
    const fallbackAgents: MastraAgent[] = [
      {
        id: 'coordinator',
        name: 'Coordinator Agent',
        description: 'Coordinator agent for team management and task delegation',
        model: {
          provider: 'anthropic',
          name: 'claude-3-sonnet-20240229'
        },
        instructions: 'You are a coordinator agent responsible for forming teams, breaking down complex goals, delegating tasks, monitoring performance, and resolving conflicts.',
        tools: ['createTeam', 'sendMessage'],
        status: 'idle'
      },
      {
        id: 'executor',
        name: 'Executor Agent',
        description: 'Executor agent for task execution and implementation',
        model: {
          provider: 'anthropic',
          name: 'claude-3-sonnet-20240229'
        },
        instructions: 'You are an executor agent responsible for executing tasks, implementing solutions, reporting progress, handling errors, and collaborating with other agents.',
        tools: ['executeWorkflow', 'monitorSystem'],
        status: 'idle'
      },
      {
        id: 'researcher',
        name: 'Researcher Agent',
        description: 'Research agent for information gathering and analysis',
        model: {
          provider: 'anthropic',
          name: 'claude-3-sonnet-20240229'
        },
        instructions: 'You are a research agent specialized in gathering information, analyzing data, identifying patterns, providing research reports, and fact-checking.',
        tools: ['sendMessage', 'monitorSystem'],
        status: 'idle'
      },
      {
        id: 'architect',
        name: 'Architect Agent',
        description: 'Architecture agent for system design and planning',
        model: {
          provider: 'anthropic',
          name: 'claude-3-sonnet-20240229'
        },
        instructions: 'You are an architecture agent responsible for designing system architectures, creating technical specifications, planning implementation strategies, and ensuring scalability.',
        tools: ['createTeam', 'executeWorkflow'],
        status: 'idle'
      }
    ];

    fallbackAgents.forEach(agent => {
      this.agents.set(agent.id, agent);
    });

    // Create fallback workflows
    const fallbackWorkflows: MastraWorkflow[] = [
      {
        id: 'software-development',
        name: 'Software Development',
        description: 'Complete software development workflow with research, architecture, coding, testing, and review',
        steps: [
          { id: 'coordinate', type: 'agent', agent: 'coordinator' },
          { id: 'research', type: 'agent', agent: 'researcher' },
          { id: 'architect', type: 'agent', agent: 'architect' },
          { id: 'implement', type: 'agent', agent: 'executor' }
        ],
        status: 'idle'
      },
      {
        id: 'problem-solving',
        name: 'Problem Solving',
        description: 'Structured problem-solving workflow',
        steps: [
          { id: 'analyze', type: 'agent', agent: 'coordinator' },
          { id: 'research', type: 'agent', agent: 'researcher' },
          { id: 'design', type: 'agent', agent: 'architect' },
          { id: 'implement', type: 'agent', agent: 'executor' }
        ],
        status: 'idle'
      }
    ];

    fallbackWorkflows.forEach(workflow => {
      this.workflows.set(workflow.id, workflow);
    });

    // Create fallback tools
    const fallbackTools: MastraTool[] = [
      {
        name: 'createTeam',
        description: 'Create a new team of agents for a specific goal',
        inputSchema: {
          type: 'object',
          properties: {
            teamName: { type: 'string' },
            goal: { type: 'string' },
            agentTypes: { type: 'array', items: { type: 'string' } }
          }
        },
        status: 'available'
      },
      {
        name: 'sendMessage',
        description: 'Send a message through the agentic-flow message system',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            message: { type: 'string' },
            recipientId: { type: 'string' }
          }
        },
        status: 'available'
      },
      {
        name: 'executeWorkflow',
        description: 'Execute an agentic-flow workflow',
        inputSchema: {
          type: 'object',
          properties: {
            workflowName: { type: 'string' },
            input: { type: 'object' }
          }
        },
        status: 'available'
      },
      {
        name: 'monitorSystem',
        description: 'Monitor the agentic-flow system health and performance',
        inputSchema: {
          type: 'object',
          properties: {
            includeDetails: { type: 'boolean' }
          }
        },
        status: 'available'
      }
    ];

    fallbackTools.forEach(tool => {
      this.tools.set(tool.name, tool);
    });

    console.log('📋 Fallback mode enabled with 4 agents, 2 workflows, and 4 tools');
  }

  // ===== AGENT OPERATIONS =====

  private async loadAgents(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/agents`);
      if (response.ok) {
        const agents = await response.json();
        agents.forEach((agent: any) => {
          this.agents.set(agent.id, {
            id: agent.id,
            name: agent.name,
            description: agent.description,
            model: agent.model,
            instructions: agent.instructions,
            tools: agent.tools || [],
            status: 'idle'
          });
        });
      }
    } catch (error) {
      console.warn('Could not load agents from Mastra server');
    }
  }

  async getAgents(): Promise<MastraAgent[]> {
    if (this.connected) {
      try {
        const response = await fetch(`${this.baseUrl}/agents`);
        if (response.ok) {
          const agents = await response.json();
          return agents.map((agent: any) => ({
            id: agent.id,
            name: agent.name,
            description: agent.description,
            model: agent.model,
            instructions: agent.instructions,
            tools: agent.tools || [],
            status: 'idle'
          }));
        }
      } catch (error) {
        console.error('Failed to fetch agents:', error);
      }
    }
    
    return Array.from(this.agents.values());
  }

  async runAgent(agentId: string, input: any): Promise<any> {
    if (this.connected) {
      try {
        const response = await fetch(`${this.baseUrl}/agents/${agentId}/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input })
        });

        if (response.ok) {
          const result = await response.json();
          
          // Notify UI
          this.config.io.emit('mastra:agent:executed', {
            agentId,
            input,
            result,
            timestamp: new Date().toISOString()
          });

          return result;
        }
      } catch (error) {
        console.error('Failed to run agent:', error);
      }
    }

    // Fallback simulation
    const agent = this.agents.get(agentId);
    if (agent) {
      const result = {
        agentId,
        status: 'completed',
        output: `Simulated execution of ${agent.name} with input: ${JSON.stringify(input)}`,
        timestamp: new Date().toISOString()
      };

      // Notify UI
      this.config.io.emit('mastra:agent:executed', {
        agentId,
        input,
        result,
        timestamp: new Date().toISOString()
      });

      return result;
    }

    throw new Error(`Agent ${agentId} not found`);
  }

  // ===== WORKFLOW OPERATIONS =====

  private async loadWorkflows(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/workflows`);
      if (response.ok) {
        const workflows = await response.json();
        workflows.forEach((workflow: any) => {
          this.workflows.set(workflow.id, {
            id: workflow.id,
            name: workflow.name,
            description: workflow.description,
            steps: workflow.steps || [],
            status: 'idle'
          });
        });
      }
    } catch (error) {
      console.warn('Could not load workflows from Mastra server');
    }
  }

  async getWorkflows(): Promise<MastraWorkflow[]> {
    if (this.connected) {
      try {
        const response = await fetch(`${this.baseUrl}/workflows`);
        if (response.ok) {
          const workflows = await response.json();
          return workflows.map((workflow: any) => ({
            id: workflow.id,
            name: workflow.name,
            description: workflow.description,
            steps: workflow.steps || [],
            status: 'idle'
          }));
        }
      } catch (error) {
        console.error('Failed to fetch workflows:', error);
      }
    }
    
    return Array.from(this.workflows.values());
  }

  async runWorkflow(workflowId: string, input: any): Promise<any> {
    if (this.connected) {
      try {
        const response = await fetch(`${this.baseUrl}/workflows/${workflowId}/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input })
        });

        if (response.ok) {
          const result = await response.json();
          
          // Notify UI
          this.config.io.emit('mastra:workflow:executed', {
            workflowId,
            input,
            result,
            timestamp: new Date().toISOString()
          });

          return result;
        }
      } catch (error) {
        console.error('Failed to run workflow:', error);
      }
    }

    // Fallback simulation
    const workflow = this.workflows.get(workflowId);
    if (workflow) {
      // Update workflow status
      workflow.status = 'running';
      this.workflows.set(workflowId, workflow);

      const result = {
        workflowId,
        status: 'completed',
        steps: workflow.steps.map(step => ({
          id: step.id,
          status: 'completed',
          output: `Simulated execution of step ${step.id}`
        })),
        finalOutput: `Simulated execution of ${workflow.name} with input: ${JSON.stringify(input)}`,
        timestamp: new Date().toISOString()
      };

      // Update workflow status
      workflow.status = 'completed';
      this.workflows.set(workflowId, workflow);

      // Notify UI
      this.config.io.emit('mastra:workflow:executed', {
        workflowId,
        input,
        result,
        timestamp: new Date().toISOString()
      });

      return result;
    }

    throw new Error(`Workflow ${workflowId} not found`);
  }

  // ===== TOOL OPERATIONS =====

  private async loadTools(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/tools`);
      if (response.ok) {
        const tools = await response.json();
        tools.forEach((tool: any) => {
          this.tools.set(tool.name, {
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema || {},
            status: 'available'
          });
        });
      }
    } catch (error) {
      console.warn('Could not load tools from Mastra server');
    }
  }

  async getTools(): Promise<MastraTool[]> {
    if (this.connected) {
      try {
        const response = await fetch(`${this.baseUrl}/tools`);
        if (response.ok) {
          const tools = await response.json();
          return tools.map((tool: any) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema || {},
            status: 'available'
          }));
        }
      } catch (error) {
        console.error('Failed to fetch tools:', error);
      }
    }
    
    return Array.from(this.tools.values());
  }

  async executeTool(toolName: string, input: any): Promise<any> {
    if (this.connected) {
      try {
        const response = await fetch(`${this.baseUrl}/tools/${toolName}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input })
        });

        if (response.ok) {
          const result = await response.json();
          
          // Notify UI
          this.config.io.emit('mastra:tool:executed', {
            toolName,
            input,
            result,
            timestamp: new Date().toISOString()
          });

          return result;
        }
      } catch (error) {
        console.error('Failed to execute tool:', error);
      }
    }

    // Fallback simulation
    const tool = this.tools.get(toolName);
    if (tool) {
      const result = {
        toolName,
        status: 'completed',
        output: `Simulated execution of ${tool.name} with input: ${JSON.stringify(input)}`,
        timestamp: new Date().toISOString()
      };

      // Notify UI
      this.config.io.emit('mastra:tool:executed', {
        toolName,
        input,
        result,
        timestamp: new Date().toISOString()
      });

      return result;
    }

    throw new Error(`Tool ${toolName} not found`);
  }

  // ===== SYSTEM OPERATIONS =====

  async getSystemStatus(): Promise<any> {
    if (this.connected) {
      try {
        const response = await fetch(`${this.baseUrl}/health`);
        if (response.ok) {
          const status = await response.json();
          return {
            connected: true,
            server: status,
            agents: this.agents.size,
            workflows: this.workflows.size,
            tools: this.tools.size,
            timestamp: new Date().toISOString()
          };
        }
      } catch (error) {
        console.error('Failed to get system status:', error);
      }
    }

    return {
      connected: false,
      mode: 'fallback',
      agents: this.agents.size,
      workflows: this.workflows.size,
      tools: this.tools.size,
      timestamp: new Date().toISOString()
    };
  }

  // ===== UTILITY METHODS =====

  isConnected(): boolean {
    return this.connected;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async cleanup(): Promise<void> {
    this.agents.clear();
    this.workflows.clear();
    this.tools.clear();
    this.connected = false;
    console.log('✅ Mastra integration cleanup complete');
  }
}