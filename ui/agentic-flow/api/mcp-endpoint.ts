/**
 * MCP API Endpoint
 * Handles HTTP requests for MCP tool execution and discovery
 */

import express from 'express';
import { getMCPHandler, initializeMCPHandler } from '../server/mcp-handler';

const router = express.Router();

// Initialize MCP handler on first request
let handlerInitialized = false;

async function ensureHandler() {
  if (!handlerInitialized) {
    try {
      await initializeMCPHandler();
      handlerInitialized = true;
      console.log('MCP Handler initialized for API endpoint');
    } catch (error) {
      console.error('Failed to initialize MCP Handler:', error);
      throw error;
    }
  }
}

/**
 * GET /api/mcp/tools
 * Discover available MCP tools
 */
router.get('/tools', async (req, res) => {
  try {
    await ensureHandler();
    const handler = getMCPHandler();
    const tools = await handler.discoverTools();
    
    res.json(tools);
  } catch (error) {
    console.error('Failed to discover tools:', error);
    res.status(500).json({
      error: 'Failed to discover tools',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/mcp/execute
 * Execute an MCP tool
 */
router.post('/execute', async (req, res) => {
  try {
    await ensureHandler();
    const { toolName, parameters = {}, options = {} } = req.body;
    
    if (!toolName) {
      return res.status(400).json({
        error: 'Missing required parameter: toolName'
      });
    }
    
    const handler = getMCPHandler();
    const result = await handler.executeTool(toolName, parameters);
    
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
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

/**
 * GET /api/mcp/status
 * Get MCP handler status and statistics
 */
router.get('/status', async (req, res) => {
  try {
    await ensureHandler();
    const handler = getMCPHandler();
    const stats = handler.getStats();
    
    res.json({
      ready: handler.isReady(),
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get status:', error);
    res.status(500).json({
      ready: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/mcp/metrics
 * Store tool execution metrics
 */
router.post('/metrics', async (req, res) => {
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
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/mcp/validate
 * Validate tool parameters before execution
 */
router.post('/validate', async (req, res) => {
  try {
    await ensureHandler();
    const { toolName, parameters = {} } = req.body;
    
    if (!toolName) {
      return res.status(400).json({
        valid: false,
        errors: ['Missing required parameter: toolName']
      });
    }
    
    const handler = getMCPHandler();
    const tools = await handler.discoverTools();
    const tool = tools.find(t => t.name === toolName);
    
    if (!tool) {
      return res.json({
        valid: false,
        errors: [`Unknown tool: ${toolName}`]
      });
    }
    
    // Basic validation (could be extended with JSON schema validation)
    const errors: string[] = [];
    
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
      errors: [error instanceof Error ? error.message : 'Validation error']
    });
  }
});

/**
 * WebSocket endpoint for streaming tool execution
 * Note: WebSocket support requires additional setup with Socket.IO
 * For now, we'll provide polling-based status updates via HTTP
 */
router.get('/stream/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;
    
    // In a real implementation, you would track execution status
    // and provide streaming updates. For now, return mock status.
    res.json({
      executionId,
      status: 'completed',
      message: 'WebSocket streaming not yet implemented - use polling',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Stream error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;