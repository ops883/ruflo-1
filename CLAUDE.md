# Claude Code Configuration - Ruflo V3

> Public release train: `@claude-flow/cli`, `claude-flow`, and `ruflo`.
> Use package manifests and the registry as version truth; do not copy stale
> version or capability counts into agent guidance.

## Capability Brain and Governed Implementation

Ruflo is the coordination ledger and policy decision point. Claude Code
executes code, tests, commands, and file changes. A Ruflo coordination call
records work; it does not perform the implementation.

When registered, call
`guidance_brain({ mode: "recommend", task: "..." })` before complex Ruflo
work. Use its live registry rather than guessing tool names. Treat
`registered`, `configured`, `reachable`, `healthy`, and `authorized` as
separate facts. If unavailable, continue with compatible guidance tools, CLI
discovery, and these repository instructions.

Use this loop: recall → inspect → route → plan → execute → test → validate →
benchmark → optimize → receipt → handoff → separately authorized publish.

## Concurrent Automated Development

- Parallelize independent research, tests, reviews, and non-overlapping
  implementation.
- Never allow two writers in one worktree. Give every writing agent an isolated
  worktree and explicit file ownership.
- Read-only agents may share a checkout; writing agents may not.
- Only the integration owner edits shared manifests and lockfiles or reconciles
  overlapping changes.
- Continue independent local work after spawning agents; wait only when a real
  dependency blocks progress. Do not repeatedly poll.
- A lease or work claim coordinates ownership; it never grants authority.
- Bind tests, benchmarks, policy decisions, and handoffs to an exact clean
  commit or immutable dirty-worktree snapshot.
- Darwin, Flywheel, MetaHarness, memory, and neural systems may propose and
  evaluate candidates, but cannot self-promote or expand tools, network,
  secrets, spend, concurrency, or release authority.

---

## Swarm Orchestration

- MUST initialize the swarm using MCP tools when starting complex tasks
- MUST spawn concurrent agents using Claude Code's Task tool
- Never use MCP tools alone for execution — Task tool agents do the actual work

### MCP + Task Tool in SAME Message

- MUST call MCP tools AND Task tool in ONE message for complex work
- Always call MCP first, then IMMEDIATELY call Task tool to spawn agents

### 3-Tier Model Routing (ADR-026, ADR-143)

| Tier | Handler | Latency | Cost | Use Cases |
|------|---------|---------|------|-----------|
| **1** | Deterministic codemod | ~1ms | $0 | Structural transforms with **no LLM**: `var-to-const`, `remove-console`, `add-logging` |
| **2** | Haiku | ~500ms | $0.0002 | Simple tasks, low complexity (<30%) |
| **3** | Sonnet/Opus | 2-5s | $0.003-0.015 | Complex reasoning, architecture, security (>30%) |

- Always check for `[CODEMOD_AVAILABLE]` or `[TASK_MODEL_RECOMMENDATION]` before spawning agents
- When you see `[CODEMOD_AVAILABLE]`, call the `hooks_codemod` MCP tool (intent + file) — it applies the transform deterministically via the TypeScript compiler at $0, no LLM. Deterministic intents only: `var-to-const`, `remove-console`, `add-logging`
- `add-types`, `add-error-handling`, `async-await` need judgement and route to a model (Tier 2/3) — they are **not** $0 codemods (see ADR-143)
- Agent Booster (`agent-booster`) is a fast-apply merge engine for arbitrary LLM-produced edit snippets, not an intent-transform engine — it is **not** the Tier-1 path

## Swarm Configuration & Anti-Drift

### Anti-Drift Coding Swarm (PREFERRED DEFAULT)

- ALWAYS use hierarchical topology for coding swarms
- Keep maxAgents at 6-8 for tight coordination
- Use specialized strategy for clear role boundaries
- Use `raft` consensus for hive-mind (leader maintains authoritative state)
- Run frequent checkpoints via `post-task` hooks
- Keep shared memory namespace for all agents
- Keep task cycles short with verification gates

```javascript
mcp__ruv-swarm__swarm_init({
  topology: "hierarchical",
  maxAgents: 8,
  strategy: "specialized"
})
```

## Intelligence System (RuVector)

V3 includes the RuVector Intelligence System (measured numbers: see [audit](docs/reviews/intelligence-system-audit-2026-05-29.md) + [`scripts/benchmark-intelligence.mjs`](scripts/benchmark-intelligence.mjs)):
- **SONA**: Self-Optimizing Neural Architecture (measured 0.0043ms/adapt, target <0.05ms met)
- **MoE**: Mixture of Experts for specialized routing (gate converges — confidence 0.13→0.88 after rewards)
- **HNSW**: measured ~1.9x at N=20k, ~3.2x–4.7x at N=5k vs brute force (recall@10 ~0.99); ANN wins above the crossover, ruvector NAPI backend (WASM not active on test host)
- **EWC++**: Elastic Weight Consolidation (prevents forgetting)
- **Flash Attention**: integration available; speedup dropped from docs pending an in-tree benchmark (was: 2.49x–7.47x, inherited unverified from upstream — removed to avoid a credibility claim we can't reproduce)

The 4-step intelligence pipeline:
1. **RETRIEVE** — Fetch relevant patterns via HNSW
2. **JUDGE** — Evaluate with verdicts (success/failure)
3. **DISTILL** — Extract key learnings via LoRA
4. **CONSOLIDATE** — Prevent catastrophic forgetting via EWC++

## Embeddings Package (v3.0.0-alpha.12)

Features:
- **sql.js**: Cross-platform SQLite persistent cache (WASM, no native compilation)
- **Document chunking**: Configurable overlap and size
- **Normalization**: L2, L1, min-max, z-score
- **Hyperbolic embeddings**: Poincare ball model for hierarchical data
- **agentic-flow ONNX integration**: speedup unverified (no benchmark; backend reported `onnx`, model all-MiniLM-L6-v2, 384-dim)
- **Neural substrate**: Integration with RuVector

## V3 Performance Targets

> Source of truth: [`docs/reviews/intelligence-system-audit-2026-05-29.md`](docs/reviews/intelligence-system-audit-2026-05-29.md) + [`scripts/benchmark-intelligence.mjs`](scripts/benchmark-intelligence.mjs). Numbers below are measured unless marked "target/unverified".

| Metric | Measured / Target | Status |
|--------|-------------------|--------|
| HNSW Search | ~1.9x at N=20k, ~3.2x–4.7x at N=5k vs brute force (recall@10 ~0.99); ties/loses below crossover | **Measured** (ruvector NAPI; 150x-12,500x NOT reproduced — was brute-force fallback) |
| Int8 Quantization | 3.84x compression, reconstruction cosine 0.99999 | **Measured** |
| RaBitQ Quantization | 32x compression, 0.60ms/query (14,760-vec index) | **Measured** |
| SONA Adaptation | 0.0043ms/adapt (target <0.05ms met) | **Measured** |
| MoE Gate | converges — confidence 0.13→0.88, Q 0→99.8 after rewards | **Measured** |
| Flash Attention | integration available; measured speedup pending benchmark | **Not measured** — prior "2.49x–7.47x" figure was inherited from upstream marketing, never reproduced in-tree; dropped to avoid a credibility claim we can't verify |
| MCP Response | <100ms | target |
| CLI Startup | <500ms | target |

## Claude Code ↔ AgentDB Memory Bridge

Claude Code's auto-memory (`~/.claude/projects/*/memory/*.md`) is bridged to AgentDB with ONNX vector embeddings for semantic search.

### MCP Tools

| Tool | Description |
|------|-------------|
| `memory_import_claude` | Import Claude Code memories into AgentDB with 384-dim ONNX embeddings. Use `allProjects: true` to import from ALL projects. |
| `memory_bridge_status` | Show bridge health — Claude files, AgentDB entries, SONA state, connection status |
| `memory_search_unified` | Semantic search across ALL namespaces (claude-memories, auto-memory, patterns, tasks, feedback) |

### Auto-Import on Session Start

The `SessionStart` hook automatically imports current project's memories into AgentDB. For manual import of all projects:

```bash
# Via MCP tool (from Claude Code)
memory_import_claude({ allProjects: true })

# Via helper hook (from terminal)
node .claude/helpers/auto-memory-hook.mjs import-all
```

### Unified Search

Search across both Claude Code memories and AgentDB entries:

```bash
# Via MCP tool
memory_search_unified({ query: "authentication security", limit: 5 })

# Results include source attribution: claude-code, auto-memory, or agentdb
```

### Intelligence Pipeline

| Component | Status | Details |
|-----------|--------|---------|
| ONNX Embeddings | Active | all-MiniLM-L6-v2, 384 dimensions |
| SONA Learning | Active | Pattern matching + trajectory recording |
| ReasoningBank | Active | Pattern storage with file persistence |
| AgentDB sql.js | Active | SQLite with vector_indexes table |

## MetaHarness Integration (ADR-150)

Ruflo integrates with the upstream `metaharness` / `@metaharness/*` ecosystem as a sibling agent-harness scaffolding system (same author, designed around ruflo's primitives). MetaHarness packages are optional peer dependencies and are never required at runtime.

### Architectural constraint (load-bearing)

**Ruflo remains operational if every MetaHarness package is removed.** Four rules:
1. **Removable**: `npm ls --without @metaharness/*` must still produce a working CLI
2. **Optional in package.json**: `@metaharness/*` packages MUST be optional peers, never normal dependencies
3. **Graceful degradation**: every code path that touches MetaHarness catches `MODULE_NOT_FOUND` and falls back
4. **CI gate**: `.github/workflows/no-metaharness-smoke.yml` enforces all three by static grep + runtime drill on every PR

## Gateway-Delegated Development (meta-llm dev-bridge)

For complex reasoning, architecture decisions, or hard bug-fixes, **delegate via the
`metallm_delegate` MCP tool rather than solving inline.** The meta-llm gateway governs the
work: it routes cheap-tier-first, escalates genuinely-hard tasks to the frontier (Fable),
and meters every call — so delegation is cost-governed and preserves the main session's context.

- **Default to `cognitum-auto`** — the gateway picks the tier by difficulty. Only pass an
  explicit tier (`cognitum-low|mid|high`) when you must force one.
- Prompt-wrapping does **not** inflate cost — the gateway normalizes host scaffolds so an
  everyday sub-task still routes to the cheap tier. Trust `cognitum-auto`.
- Use **`metallm_delegate`** for agentic sub-tasks needing tools/files in a working dir
  (its `cwd` is sandboxed); use **`metallm_ask`** for a single-shot question — it returns
  the gateway's real metered cost + resolved tier/model in-band.
- Reserve the main (inline) session for orchestration, integration, and final review;
  push expensive per-sub-task reasoning through the gateway.

**Setup (per developer, local — never committed):** register the `metallm-dev-bridge` MCP
server via a local `.mcp.json` (gitignored) and export your gateway key as `COGNITUM_DEV_KEY`
in your shell. Build steps + the exact `.mcp.json` block are in the internal meta-llm
dev-bridge README. **Never commit the key or an inline gateway URL.**

### `ask` vs `delegate` — pick by task shape (load-bearing)

**Use `metallm_ask` for single-shot facts, summaries, classification, and small code
questions. Use `metallm_delegate` only when the task needs autonomous multi-step execution
or isolated agent context.**

Why the split is strict: `metallm_delegate` spawns a full `claude -p` sub-agent, which loads
its entire harness context **even for a trivial task** — measured floor ≈ **$0.26/call**
(~43k input tokens) before any real work. `metallm_ask` is a single gateway completion —
measured ≈ **$0.0001** for a small query, ~2500× cheaper. So delegating casually is
expensive at volume; `delegate` pays off only when offloading the sub-task's context from
the main session is worth the floor. When in doubt, `ask`.

Routing caveat (tracked): `metallm_ask` **auto** currently over-tiers some trivial prompts to
`mid` (sonnet-5) instead of `low` — the bridge's `/v1/messages` path may miss ADR-236
host-normalization (meta-llm issue #38). Forced tiers work correctly; cost impact is small
per call but real at volume.
