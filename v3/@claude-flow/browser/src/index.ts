/**
 * @claude-flow/browser
 * Browser automation for AI agents - integrates agent-browser with claude-flow swarms
 *
 * Features:
 * - 50+ MCP tools for browser automation
 * - AI-optimized snapshots with element refs (@e1, @e2)
 * - Multi-session support for swarm coordination
 * - Trajectory tracking for ReasoningBank/SONA learning
 * - Integration with agentic-flow optimizations
 */

// Domain types
export * from './domain/types.js';

// Infrastructure
export { AgentBrowserAdapter } from './infrastructure/agent-browser-adapter.js';
export type { AgentBrowserAdapterOptions } from './infrastructure/agent-browser-adapter.js';

// Application services
export {
  BrowserService,
  BrowserSwarmCoordinator,
  createBrowserService,
  createBrowserSwarm,
} from './application/browser-service.js';

// MCP tools
export { browserTools } from './mcp-tools/browser-tools.js';
export type { MCPTool } from './mcp-tools/browser-tools.js';

// Re-export main classes as defaults
import { BrowserService, createBrowserService, createBrowserSwarm } from './application/browser-service.js';
import { browserTools } from './mcp-tools/browser-tools.js';

export default {
  BrowserService,
  createBrowserService,
  createBrowserSwarm,
  browserTools,
};
