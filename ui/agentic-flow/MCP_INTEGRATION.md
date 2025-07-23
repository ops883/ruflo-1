# MCP Tools Integration Documentation

## Overview

This document describes the complete integration of real Claude Flow MCP tools into the Agentic Flow UI. The integration provides a full-featured interface for discovering, configuring, and executing real MCP tools.

## Architecture

### Components

1. **MCP Handler** (`server/mcp-handler.ts`)
   - Interfaces directly with Claude Flow CLI
   - Executes real MCP tools via subprocess
   - Handles tool discovery and execution

2. **Real MCP Bridge** (`src/api/mcp-bridge-real.ts`)
   - HTTP client for MCP API endpoints
   - Tool discovery and validation
   - Result formatting and error handling

3. **Express API Server** (`server.js`)
   - RESTful endpoints for MCP operations
   - Real-time tool execution
   - Health monitoring and metrics

4. **MCPTools UI Component** (`src/components/mcp/MCPTools.tsx`)
   - Real-time tool discovery
   - Dynamic parameter input
   - Execution progress tracking
   - Result visualization

### API Endpoints

- `GET /api/health` - Server health check
- `GET /api/mcp/tools` - Discover available MCP tools
- `POST /api/mcp/execute` - Execute an MCP tool
- `GET /api/mcp/status` - Get server status and statistics
- `POST /api/mcp/metrics` - Store execution metrics
- `POST /api/mcp/validate` - Validate tool parameters

## Features Implemented

### ✅ Completed Features

1. **Real Tool Discovery**
   - Automatic discovery of 71+ Claude Flow MCP tools
   - Dynamic tool categorization
   - Schema-based parameter validation

2. **Real Tool Execution**
   - Direct execution via Claude Flow CLI
   - Real-time progress tracking
   - Comprehensive error handling

3. **UI Integration**
   - Loading states and error displays
   - Real tool parameter forms
   - Execution result visualization
   - Success/error status indicators

4. **Parameter Validation**
   - Real-time validation using tool schemas
   - Required parameter checking
   - Type validation and enum constraints

5. **Error Handling**
   - Comprehensive error capture
   - User-friendly error messages
   - Execution failure recovery

6. **Performance Tracking**
   - Execution time measurement
   - Success/failure metrics
   - Tool usage statistics

### 🔄 In Progress

1. **Complete Integration Testing**
   - Testing all 71+ MCP tools
   - Parameter validation testing
   - Error scenario testing

### ⏳ Pending Features

1. **Streaming Support**
   - WebSocket integration for long-running tools
   - Real-time progress updates
   - Cancellation support

2. **Intelligent Caching**
   - Result caching for frequently used tools
   - Cache invalidation strategies
   - Performance optimization

## Setup Instructions

### 1. Start the API Server

```bash
# Start MCP API server on port 3001
npm run dev:api
```

### 2. Start the Vite Dev Server

```bash
# Start UI development server on port 5173
npm run dev
```

### 3. Start Both Together

```bash
# Start both API and UI servers concurrently
npm run dev:full
```

### 4. Test the Integration

```bash
# Test health endpoint
curl http://localhost:3001/api/health

# Test tool discovery
curl http://localhost:3001/api/mcp/tools

# Test tool execution
curl -X POST http://localhost:3001/api/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{"toolName": "swarm_status", "parameters": {}}'
```

## Available MCP Tools

The integration currently supports these categories of tools:

### Coordination Tools
- `swarm_init` - Initialize swarm topology
- `agent_spawn` - Create specialized agents
- `task_orchestrate` - Orchestrate complex workflows

### Monitoring Tools
- `swarm_status` - Monitor swarm health
- `agent_metrics` - Get agent performance data
- `swarm_monitor` - Real-time monitoring

### Memory & Neural Tools
- `memory_usage` - Store/retrieve persistent memory
- `memory_search` - Search memory patterns
- `neural_status` - Check neural network status
- `neural_train` - Train neural patterns

### System Tools
- `performance_report` - Generate performance reports
- `bottleneck_analyze` - Identify bottlenecks
- `token_usage` - Analyze token consumption

### GitHub Integration
- `github_repo_analyze` - Repository analysis
- `github_pr_manage` - Pull request management
- `github_issue_track` - Issue tracking

## Usage Examples

### 1. Initialize a Swarm

```javascript
// Tool: swarm_init
// Parameters:
{
  "topology": "hierarchical",
  "maxAgents": 8
}
```

### 2. Spawn an Agent

```javascript
// Tool: agent_spawn
// Parameters:
{
  "type": "researcher",
  "name": "DataAnalyst"
}
```

### 3. Check System Status

```javascript
// Tool: swarm_status
// Parameters: {} (no parameters required)
```

## Technical Implementation Details

### Tool Discovery Process

1. UI component loads and calls `mcpBridge.getAvailableTools()`
2. Bridge makes HTTP GET request to `/api/mcp/tools`
3. API server calls `mcpHandler.discoverTools()`
4. Handler executes Claude Flow commands to discover tools
5. Tools are categorized and returned to UI

### Tool Execution Process

1. User selects tool and fills parameters
2. UI validates parameters against tool schema
3. Bridge makes HTTP POST request to `/api/mcp/execute`
4. API server validates request and calls `mcpHandler.executeTool()`
5. Handler spawns Claude Flow subprocess with tool command
6. Results are captured and returned to UI
7. UI displays formatted results with success/error status

### Error Handling Strategy

1. **Validation Errors**: Caught at parameter level before execution
2. **Execution Errors**: Captured from subprocess stderr
3. **Network Errors**: Handled at HTTP client level
4. **UI Errors**: Displayed with user-friendly messages
5. **Recovery**: Graceful fallback to static tool definitions

## Configuration

### Vite Proxy Configuration
```javascript
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
    },
  },
}
```

### Package.json Scripts
```json
{
  "dev:api": "nodemon server.js",
  "dev:full": "concurrently \"npm run dev:api\" \"npm run dev\"",
  "test:mcp": "curl -X GET http://localhost:3001/api/health"
}
```

## Troubleshooting

### Common Issues

1. **Port 3001 Already in Use**
   - Change port in `server.js`: `const port = process.env.PORT || 3002`

2. **Claude Flow Not Found**
   - Ensure Claude Flow is installed: `npm install -g claude-flow@alpha`

3. **CORS Issues**
   - Server includes CORS middleware for development

4. **Tool Execution Timeouts**
   - Adjust timeout in server: `setTimeout(..., 60000)` for longer operations

### Debug Mode

Enable debug logging by setting environment variable:
```bash
DEBUG=mcp:* npm run dev:api
```

## Next Steps

1. **Implement Streaming**: Add WebSocket support for real-time updates
2. **Add Caching**: Implement intelligent result caching
3. **Enhance UI**: Add tool favorites and recent tools
4. **Add Analytics**: Track tool usage patterns
5. **Performance**: Optimize for large-scale tool execution

## Security Considerations

1. **Input Validation**: All parameters are validated before execution
2. **Command Injection**: Parameters are properly escaped
3. **Rate Limiting**: Consider implementing rate limits for tool execution
4. **Authentication**: Add authentication for production deployment

## Performance Metrics

The integration tracks:
- Tool execution times
- Success/failure rates
- Most used tools
- Error patterns
- System resource usage

These metrics help optimize performance and identify issues early.