---
name: agent-teams-comms
description: Named-agent SendMessage coordination patterns for Claude Code multi-agent teams — pipeline, fan-out/fan-in, and supervisor/worker templates, plus Agent Teams hooks.
---

## Agent Teams & Comms System

Agent Teams turns Claude Code into a multi-agent system where named agents communicate in real-time via `SendMessage`. The comms system is the primary coordination mechanism — agents talk to each other, not just to the lead.

### Architecture

```
Team Lead (you)
  ├── SendMessage ←→ architect (named agent)
  ├── SendMessage ←→ developer (named agent)
  ├── SendMessage ←→ tester (named agent)
  └── SendMessage ←→ reviewer (named agent)
       ↕ agents can message each other by name
```

### Core Principle: Named Agents + SendMessage

Every agent MUST have a `name` so it's addressable. Communication happens via `SendMessage`, not polling or shared memory.

```javascript
// STEP 1: Spawn named agents (all in ONE message, background)
Task({
  prompt: "Design the API. When done, send your design to 'developer' via SendMessage.",
  subagent_type: "system-architect",
  name: "architect",
  run_in_background: true
})
Task({
  prompt: "Wait for architect's design via SendMessage. Then implement it. Send code to 'tester'.",
  subagent_type: "coder",
  name: "developer",
  run_in_background: true
})
Task({
  prompt: "Wait for developer's code via SendMessage. Write tests. Send results to 'reviewer'.",
  subagent_type: "tester",
  name: "tester",
  run_in_background: true
})

// STEP 2: Kick off the pipeline by messaging the first agent
SendMessage({
  to: "architect",
  summary: "Start API design",
  message: "Design a REST API for user management with CRUD endpoints. Send the design to 'developer' when done."
})
```

### SendMessage Protocol

```javascript
// Lead → Teammate: assign work
SendMessage({ to: "developer", summary: "Implement auth", message: "Build OAuth2 flow..." })

// Lead → Teammate: redirect priorities
SendMessage({ to: "developer", summary: "Prioritize auth", message: "Auth endpoint is blocking tester, do it first." })

// Lead → Teammate: provide context from another agent's results
SendMessage({ to: "tester", summary: "Architect output", message: "The architect designed these endpoints: [details]. Write tests for them." })

// Lead → Teammate: graceful shutdown
SendMessage({ to: "developer", message: { type: "shutdown_request" } })
```

### Coordination Patterns

**Pipeline (A → B → C)** — each agent messages the next when done:
```
architect ──SendMessage──→ developer ──SendMessage──→ tester ──SendMessage──→ reviewer
```
Tell each agent WHO to message next in their prompt.

**Fan-out / Fan-in** — lead spawns parallel agents, collects results:
```
         ┌→ researcher-1 ──→┐
lead ────┼→ researcher-2 ──→├──→ lead synthesizes
         └→ researcher-3 ──→┘
```
Spawn with `run_in_background: true`. Results arrive as task completions.

**Supervisor / Worker** — lead assigns, workers report back:
```
lead ←──SendMessage──→ worker-1
lead ←──SendMessage──→ worker-2
lead ←──SendMessage──→ worker-3
```
Lead sends tasks via SendMessage, workers respond with results.

### Agent Prompt Template (Comms-Aware)

When spawning agents that need to coordinate, include comms instructions:

```javascript
Task({
  prompt: `You are the architect for this feature team.

YOUR TASK: Design the database schema for user management.

COMMS PROTOCOL:
- When your design is ready, send it to "developer" via SendMessage
- If you need clarification, message the team lead (just output text)
- Include file paths and key decisions in your message

DELIVERABLE: Schema design with entity relationships, indexes, and migration plan.`,
  subagent_type: "system-architect",
  name: "architect",
  run_in_background: true
})
```

### Full Team Spawn Example

```javascript
// Create shared task list first
TaskCreate({ subject: "Design schema", description: "...", activeForm: "Designing" })
TaskCreate({ subject: "Implement models", description: "...", activeForm: "Implementing" })
TaskCreate({ subject: "Write tests", description: "...", activeForm: "Testing" })
TaskCreate({ subject: "Security review", description: "...", activeForm: "Reviewing" })

// Spawn ALL named agents in ONE message
Task({
  prompt: "Design the schema. SendMessage to 'developer' with your design when done. Update task #1.",
  subagent_type: "system-architect", name: "architect", run_in_background: true
})
Task({
  prompt: "Wait for schema from 'architect'. Implement models + endpoints. SendMessage to 'tester'. Update task #2.",
  subagent_type: "coder", name: "developer", run_in_background: true
})
Task({
  prompt: "Wait for code from 'developer'. Write integration tests. SendMessage results to 'security'. Update task #3.",
  subagent_type: "tester", name: "tester", run_in_background: true
})
Task({
  prompt: "Wait for test results from 'tester'. Review for vulnerabilities. Update task #4.",
  subagent_type: "security-auditor", name: "security", run_in_background: true
})
```

### Agent Teams Hooks

| Hook | Trigger | Purpose |
|------|---------|---------|
| `TeammateIdle` | Teammate finishes turn | Auto-assign pending tasks via SendMessage |
| `TaskCompleted` | Task marked complete | Train patterns, notify lead via SendMessage |

```bash
npx claude-flow@v3alpha hooks teammate-idle --auto-assign true
npx claude-flow@v3alpha hooks task-completed -i task-123 --train-patterns true
```

### Rules

1. **Always name agents** — use `name: "role-name"` so they're addressable
2. **Comms over memory** — use SendMessage for real-time coordination, memory for persistence
3. **Pipeline prompts** — tell each agent WHO to message next and WHAT to send
4. **Spawn all at once** — all Task calls in ONE message with `run_in_background: true`
5. **Don't poll** — agents message back when done; wait for task completion notifications
6. **Graceful shutdown** — send `{ type: "shutdown_request" }` before TeamDelete
7. **Lead synthesizes** — when agents complete, review ALL results before responding to user
