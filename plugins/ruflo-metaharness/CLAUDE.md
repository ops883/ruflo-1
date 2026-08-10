# MetaHarness Integration (ADR-150) — Command Surface & Operations

> The architectural constraint (load-bearing 4 rules) for MetaHarness integration lives in the root `/Users/francisco/ruflo/CLAUDE.md` under "MetaHarness Integration (ADR-150)" / "Architectural constraint (load-bearing)". This file covers everything else: the CLI/MCP command surface, routing integration, CI workflows, and cross-references.

### Command + tool surface

```bash
# CLI subcommands (npx ruflo metaharness …)
npx ruflo metaharness score                      # 5-dim readiness scorecard
npx ruflo metaharness genome                     # 7-section categorical report
npx ruflo metaharness mcp-scan --fail-on high    # static security findings
npx ruflo metaharness threat-model               # enterprise threat report
npx ruflo metaharness oia-audit --alert-on-worst high
                                                 # composite weekly audit → memory
npx ruflo metaharness audit-list --since 30d     # enumerate audit records
npx ruflo metaharness audit-trend \              # diff two audits (drift)
  --baseline-key <a> --current-key <b> --alert-on-worsening \
  --alert-on-distance-below 0.85               # iter 38 — structural-distance gate (ADR-152 §3.1)
npx ruflo metaharness similarity \               # iter 36 — ADR-152 §3.1 weighted similarity
  --a a.json --b b.json [--per-dimension] [--alert-below 0.5]
npx ruflo metaharness drift-from-history \       # iter 53 — 1-command drift (composes 3 primitives)
  [--baseline-since 7d] [--baseline-key <key>] [--baseline-file <path>] \
  [--threshold 0.95] [--alert-on-new-severity high] [--dry-run]
                                                 # iter 66 — --baseline-key skips audit-list (~14x faster)
                                                 # iter 67 — --baseline-file skips memory entirely (~19x faster)
                                                 # iter 78 — --alert-on-new-severity adds orthogonal finding-severity gate
npx ruflo metaharness mint --name foo --template vertical:coding --confirm
npx ruflo metaharness redblue init               # @metaharness/redblue — scaffold redblue.yaml
npx ruflo metaharness redblue run --mock-judge --tests 10
                                                 # $0 marker-fixture path (CI / offline)
npx ruflo metaharness redblue run --tests 50 --patch
                                                 # real model judge (needs OPENROUTER_API_KEY,
                                                 #   capped by max_cost_usd, default $3)
npx ruflo metaharness redblue attack prompt --count 3
                                                 # preview generated attack cases (no target call)
npx ruflo metaharness redblue patch --mock-judge # baseline → blue-team patch → retest delta
npx ruflo metaharness redblue report --in report.json
                                                 # render existing report as markdown
npx ruflo metaharness learn --host claude-code --model haiku --slice slices/lite.json
                                                 # metaharness@0.3.0 / upstream ADR-235 —
                                                 #   GEPA learning run; $0 dry-run default,
                                                 #   --run to spend; needs a metaharness
                                                 #   repo checkout (--repo / $METAHARNESS_REPO)
npx ruflo metaharness gepa --op genome           # darwin@0.8.0 GEPA library — load + validate
                                                 #   the shipped cand-6 genome (or --path <f>)
npx ruflo metaharness gepa --op render           # genome → the system prompt it compiles to
npx ruflo metaharness gepa --op analyze --transcript run.json
                                                 # classify failure modes in a transcript
npx ruflo metaharness evolve --bench .harness/bench.json
                                                 # Darwin proposes candidates; governed gates decide
npx ruflo metaharness bench verify --path .harness/bench.json
                                                 # create or verify stable benchmark corpora
npx ruflo metaharness flywheel run --proposer auto --max-concurrency 2
                                                 # bounded concurrent evaluation; does not promote
npx ruflo metaharness flywheel receipts          # inspect immutable evaluation receipts
npx ruflo metaharness flywheel promote <receipt-id> \
  --public-key ./approved-ed25519-public.pem --confirm
                                                 # explicit policy-authorized atomic promotion

# Dedicated command
npx ruflo eject --name my-harness                # lift ruflo project → standalone harness
                                                 # dry-run by default; refuses in-repo target

# Doctor health check
npx ruflo doctor --component metaharness         # report metaharness availability + version

# MCP tools (callable by Claude Code agents)
mcp__claude-flow__metaharness_score
mcp__claude-flow__metaharness_genome
mcp__claude-flow__metaharness_mcp_scan
mcp__claude-flow__metaharness_threat_model
mcp__claude-flow__metaharness_oia_audit
mcp__claude-flow__metaharness_audit_list
mcp__claude-flow__metaharness_audit_trend
mcp__claude-flow__metaharness_similarity          # iter 36 — ADR-152 §3.1 genome similarity
mcp__claude-flow__metaharness_drift_from_history  # iter 53 — 1-command drift detection
mcp__claude-flow__metaharness_bench               # ADR-153 — create/verify bench suites for evolve --bench
mcp__claude-flow__metaharness_evolve              # MAP-Elites driver — evolve a harness across bench suites
mcp__claude-flow__metaharness_security_bench      # security-focused benchmark suite gate
mcp__claude-flow__metaharness_redblue             # @metaharness/redblue — adversarial red/blue LLM testing (init|run|patch|attack|report)
mcp__claude-flow__metaharness_learn               # metaharness@0.3.0 — GEPA learning run ($0 dry-run default; run=true to spend)
mcp__claude-flow__metaharness_gepa                # darwin@0.8.0 — GEPA genome ops (genome|validate|render|analyze); gepaOptimize stays library-only
mcp__claude-flow__metaharness_flywheel            # ADR-322 — evaluate concurrently, inspect receipts/ledger, or explicitly promote
```

### Routing integration (ADR-148/149)

`@metaharness/router@~0.3.2` is wired as the cost-optimal model router behind the `CLAUDE_FLOW_ROUTER_NEURAL=1` triple-gate. The `routedBy` field on every routing decision carries `'metaharness-knn' | 'metaharness-krr' | 'fastgrnn'` when the neural path is active.

### SelfEvolvingRouter parallel-logging (ADR-150 Phase 2)

When `CLAUDE_FLOW_ROUTER_PARALLEL_LOG=1` is set, every `route()` call writes a paired-decision row (bandit pick + neural-augmented pick + outcome) to `.swarm/router-parallel.jsonl`. Analyze with:

```bash
node plugins/ruflo-metaharness/scripts/router-parallel-analyze.mjs \
  --input .swarm/router-parallel.jsonl --strict
```

The 3-criteria AND-gate from ADR-150 review-round-1: `quality > 2% AND cost < 1% AND latency < 5%`. Exit 1 in `--strict` mode if any criterion fails — promotion gate.

### CI workflows

- `metaharness-ci.yml` — score / mcp-scan / router-compat / eject-dryrun jobs on every PR touching `plugins/ruflo-metaharness/**`
- `no-metaharness-smoke.yml` — enforces the four architectural-constraint rules above on every PR
- `oia-audit-weekly.yml` — Sundays 04:17 UTC, runs composite audit, uploads 90-day artifact

### Cross-references

- [ADR-150](v3/docs/adr/ADR-150-metaharness-integration-surfaces.md) — decision + implementation notes
- [Issue #2399](https://github.com/ruvnet/ruflo/issues/2399) — phase tracker
- [Research gist](https://gist.github.com/ruvnet/19d166ff9acf368c9da4172d91ac9113) — graded evidence
- Upstream: `github.com/ruvnet/agent-harness-generator`
