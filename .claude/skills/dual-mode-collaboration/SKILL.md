---
name: dual-mode-collaboration
description: Claude Code + Codex dual-mode collaboration protocol — parallel worker orchestration, collaboration templates, worker dependency levels, and the DualModeOrchestrator programmatic API.
---

## Dual-Mode Collaboration (Claude Code + Codex)

This repository uses **dual-mode orchestration** to run Claude Code (🔵) and OpenAI Codex (🟢) workers in parallel with shared memory coordination. Both platforms collaborate on development tasks with cross-learning.

### Why Dual-Mode?

| Single Platform | Dual-Mode Collaboration |
|----------------|------------------------|
| One model's perspective | Two AI platforms cross-validating |
| Limited reasoning styles | Complementary strengths |
| No external verification | Built-in code review |
| Sequential workflows | Parallel execution |

### Dual-Mode Swarm Protocol

For complex tasks, spawn both Claude and Codex workers in parallel:

```javascript
// STEP 1: Initialize dual-mode swarm
mcp__ruv-swarm__swarm_init({
  topology: "hierarchical",
  maxAgents: 8,
  strategy: "specialized"
})

// STEP 2: Spawn BOTH platforms in parallel via Task tool
// 🔵 Claude Code workers (architecture, security, testing)
Task("Architect", "Design the implementation. Store design in memory namespace 'collaboration'.", "system-architect")
Task("Tester", "Write tests based on architect's design. Read from 'collaboration' namespace.", "tester")
Task("Reviewer", "Review code quality and security. Store findings in 'collaboration'.", "reviewer")

// 🟢 Codex workers (implementation, optimization)
// Spawn via CLI for Codex platform
Bash("npx claude-flow-codex dual run --worker 'codex:coder:Implement the solution based on architect design' --namespace collaboration")
Bash("npx claude-flow-codex dual run --worker 'codex:optimizer:Optimize performance based on implementation' --namespace collaboration")

// STEP 3: Coordinate via shared memory
Bash("npx claude-flow@v3alpha memory store --namespace collaboration --key 'task-context' --value '[task description]'")
```

### Collaboration Templates (Pre-Built Pipelines)

| Template | Workers | Pipeline |
|----------|---------|----------|
| `feature` | 🔵 Architect → 🟢 Coder → 🔵 Tester → 🟢 Reviewer | Full feature development |
| `security` | 🔵 Analyst → 🟢 Scanner → 🔵 Reporter | Security audit workflow |
| `refactor` | 🔵 Architect → 🟢 Refactorer → 🔵 Tester | Code modernization |
| `bugfix` | 🔵 Researcher → 🟢 Coder → 🔵 Tester | Bug investigation & fix |

### Dual-Mode CLI Commands

```bash
# Run a collaboration template
npx claude-flow-codex dual run feature --task "Add user authentication with OAuth"
npx claude-flow-codex dual run security --target "./src"
npx claude-flow-codex dual run refactor --target "./src/legacy"

# Custom multi-platform swarm
npx claude-flow-codex dual run \
  --worker "claude:architect:Design the API structure" \
  --worker "codex:coder:Implement REST endpoints" \
  --worker "claude:tester:Write integration tests" \
  --worker "codex:reviewer:Review code quality" \
  --namespace "api-feature"

# Check collaboration status
npx claude-flow-codex dual status

# List available templates
npx claude-flow-codex dual templates
```

### Shared Memory Coordination

All workers share state via the `collaboration` namespace:

```bash
# Store context for cross-platform sharing
npx claude-flow@v3alpha memory store --namespace collaboration --key "design-decisions" --value "..."

# Search for patterns across all workers
npx claude-flow@v3alpha memory search --namespace collaboration --query "authentication patterns"

# Retrieve specific findings
npx claude-flow@v3alpha memory retrieve --namespace collaboration --key "security-findings"
```

### Cross-Platform Learning

Both platforms learn from each other's outputs:

```bash
# After successful collaboration, train patterns
npx claude-flow@v3alpha hooks post-task --task-id "dual-[id]" --success true --train-neural true

# Store successful collaboration patterns
npx claude-flow@v3alpha memory store --namespace patterns --key "dual-mode-[pattern]" --value "[what worked]"

# Transfer learnings to both platforms
npx claude-flow@v3alpha hooks transfer store --pattern "dual-collab-success"
```

### Worker Dependency Levels

Workers execute in dependency order:

```
Level 0: [🔵 Architect]           # No dependencies - runs first
Level 1: [🟢 Coder, 🔵 Tester]    # Depends on Architect
Level 2: [🔵 Reviewer]            # Depends on Coder + Tester
Level 3: [🟢 Optimizer]           # Depends on Reviewer approval
```

### Platform Strengths

| Task Type | Preferred Platform | Reason |
|-----------|-------------------|--------|
| Architecture & Design | 🔵 Claude | Strong reasoning, system thinking |
| Implementation | 🟢 Codex | Fast code generation |
| Security Review | 🔵 Claude | Careful analysis, threat modeling |
| Performance Optimization | 🟢 Codex | Code-level optimizations |
| Testing Strategy | 🔵 Claude | Coverage analysis, edge cases |
| Refactoring | 🟢 Codex | Bulk code transformations |

### Programmatic API

```typescript
import { DualModeOrchestrator, CollaborationTemplates } from '@claude-flow/codex';

const orchestrator = new DualModeOrchestrator({
  namespace: 'my-feature',
  memoryBackend: 'hybrid'
});

// Use pre-built template
const workers = CollaborationTemplates.featureDevelopment('Add OAuth login');

// Run collaboration
const results = await orchestrator.runCollaboration(workers, 'Implement OAuth feature');

// Access shared memory
const designDocs = await orchestrator.getMemory('design-decisions');
```
