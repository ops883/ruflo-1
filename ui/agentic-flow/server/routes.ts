/**
 * REST API Routes for Agentic Flow Backend
 */

import { Request, Response, Application } from 'express';
import { HiveMindIntegration } from './hive-integration.js';
import { MastraIntegration } from './mastra-integration.js';

export function setupRoutes(
  app: Application,
  hive: HiveMindIntegration,
  mastra: MastraIntegration
): void {

  // ===== API DOCUMENTATION =====
  app.get('/api/docs', (req: Request, res: Response) => {
    res.json({
      title: 'Agentic Flow Backend API',
      version: '2.0.0',
      description: 'Real integration with HiveMind and Mastra systems',
      endpoints: {
        swarm: {
          'POST /api/swarm/init': 'Initialize a new swarm',
          'GET /api/swarm/status': 'Get swarm status',
          'DELETE /api/swarm/:id': 'Destroy a swarm'
        },
        agents: {
          'POST /api/agents/spawn': 'Spawn a new agent',
          'GET /api/agents': 'List all agents',
          'GET /api/agents/metrics': 'Get agent metrics'
        },
        tasks: {
          'POST /api/tasks/orchestrate': 'Orchestrate a new task',
          'GET /api/tasks/status': 'Get task status',
          'GET /api/tasks/:id/results': 'Get task results'
        },
        memory: {
          'POST /api/memory/store': 'Store memory entry',
          'GET /api/memory/retrieve': 'Retrieve memory entry',
          'GET /api/memory/search': 'Search memory'
        },
        performance: {
          'GET /api/performance/report': 'Get performance report',
          'GET /api/performance/bottlenecks': 'Analyze bottlenecks',
          'GET /api/performance/tokens': 'Get token usage'
        },
        mastra: {
          'GET /api/mastra/agents': 'Get Mastra agents',
          'POST /api/mastra/agents/:id/run': 'Run Mastra agent',
          'GET /api/mastra/workflows': 'Get Mastra workflows',
          'POST /api/mastra/workflows/:id/run': 'Run Mastra workflow',
          'GET /api/mastra/tools': 'Get Mastra tools',
          'POST /api/mastra/tools/:name/execute': 'Execute Mastra tool'
        }
      },
      integrations: {
        hive: hive.isConnected() ? 'connected' : 'disconnected',
        mastra: mastra.isConnected() ? 'connected' : 'fallback'
      }
    });
  });

  // ===== SWARM OPERATIONS =====

  app.post('/api/swarm/init', async (req: Request, res: Response) => {
    try {
      const { topology = 'hierarchical', maxAgents = 5, strategy = 'balanced' } = req.body;
      
      const swarmId = await hive.initializeSwarm({
        topology,
        maxAgents,
        strategy
      });

      res.json({
        success: true,
        swarmId,
        topology,
        maxAgents,
        strategy,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  app.get('/api/swarm/status', async (req: Request, res: Response) => {
    try {
      const { swarmId } = req.query;
      const status = await hive.getSwarmStatus(swarmId as string);
      
      res.json({
        success: true,
        status,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // ===== AGENT OPERATIONS =====

  app.post('/api/agents/spawn', async (req: Request, res: Response) => {
    try {
      const { type, name, capabilities } = req.body;
      
      if (!type) {
        return res.status(400).json({
          success: false,
          error: 'Agent type is required',
          timestamp: new Date().toISOString()
        });
      }

      const agentId = await hive.spawnAgent({
        type,
        name,
        capabilities
      });

      res.json({
        success: true,
        agentId,
        type,
        name,
        capabilities,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  app.get('/api/agents', async (req: Request, res: Response) => {
    try {
      const { swarmId } = req.query;
      const agents = await hive.listAgents(swarmId as string);
      
      res.json({
        success: true,
        agents,
        count: agents.length,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // ===== TASK OPERATIONS =====

  app.post('/api/tasks/orchestrate', async (req: Request, res: Response) => {
    try {
      const { task, strategy, priority } = req.body;
      
      if (!task) {
        return res.status(400).json({
          success: false,
          error: 'Task description is required',
          timestamp: new Date().toISOString()
        });
      }

      const taskId = await hive.orchestrateTask(task, { strategy, priority });

      res.json({
        success: true,
        taskId,
        task,
        strategy: strategy || 'parallel',
        priority: priority || 'medium',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // ===== MEMORY OPERATIONS =====

  app.post('/api/memory/store', async (req: Request, res: Response) => {
    try {
      const { key, value, namespace = 'default' } = req.body;
      
      if (!key || value === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Key and value are required',
          timestamp: new Date().toISOString()
        });
      }

      await hive.storeMemory(key, value, namespace);

      res.json({
        success: true,
        key,
        namespace,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  app.get('/api/memory/retrieve', async (req: Request, res: Response) => {
    try {
      const { key, namespace = 'default' } = req.query;
      
      if (!key) {
        return res.status(400).json({
          success: false,
          error: 'Key is required',
          timestamp: new Date().toISOString()
        });
      }

      const value = await hive.retrieveMemory(key as string, namespace as string);

      res.json({
        success: true,
        key,
        namespace,
        value,
        found: value !== null,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // ===== PERFORMANCE OPERATIONS =====

  app.get('/api/performance/report', async (req: Request, res: Response) => {
    try {
      const report = await hive.getPerformanceReport();
      
      res.json({
        success: true,
        report,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // ===== MASTRA OPERATIONS =====

  app.get('/api/mastra/agents', async (req: Request, res: Response) => {
    try {
      const agents = await mastra.getAgents();
      
      res.json({
        success: true,
        agents,
        count: agents.length,
        connected: mastra.isConnected(),
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  app.post('/api/mastra/agents/:id/run', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { input } = req.body;

      const result = await mastra.runAgent(id, input);

      res.json({
        success: true,
        agentId: id,
        result,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  app.get('/api/mastra/workflows', async (req: Request, res: Response) => {
    try {
      const workflows = await mastra.getWorkflows();
      
      res.json({
        success: true,
        workflows,
        count: workflows.length,
        connected: mastra.isConnected(),
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  app.post('/api/mastra/workflows/:id/run', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { input } = req.body;

      const result = await mastra.runWorkflow(id, input);

      res.json({
        success: true,
        workflowId: id,
        result,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  app.get('/api/mastra/tools', async (req: Request, res: Response) => {
    try {
      const tools = await mastra.getTools();
      
      res.json({
        success: true,
        tools,
        count: tools.length,
        connected: mastra.isConnected(),
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  app.post('/api/mastra/tools/:name/execute', async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const { input } = req.body;

      const result = await mastra.executeTool(name, input);

      res.json({
        success: true,
        toolName: name,
        result,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // ===== SYSTEM STATUS =====

  app.get('/api/status', async (req: Request, res: Response) => {
    try {
      const [hiveSwarm, mastraStatus] = await Promise.all([
        hive.getCurrentSwarm(),
        mastra.getSystemStatus()
      ]);

      res.json({
        success: true,
        system: {
          backend: 'healthy',
          version: '2.0.0',
          uptime: process.uptime(),
          memory: process.memoryUsage()
        },
        integrations: {
          hive: {
            connected: hive.isConnected(),
            currentSwarm: hiveSwarm
          },
          mastra: mastraStatus
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // ===== ERROR HANDLING =====

  app.use('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'API endpoint not found',
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  });
}