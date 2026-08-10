---
name: npm-publish
description: Publishing @claude-flow/cli, claude-flow, and ruflo to npm plus the matching GitHub release — versioning policy, GCP-secret npm auth, signing-key handling, and known failure modes.
---

## Publishing to npm

### Versioning policy (stable releases — alpha series ended at 3.7.0-alpha.81, 2026-05-23)

- **From 3.7.0 onward we ship stable semver**, NOT alpha pre-releases.
- Bump rules (semver discipline):
  - **PATCH** (3.7.0 → 3.7.1): bug fixes only, no API change, no schema change
  - **MINOR** (3.7.0 → 3.8.0): backward-compatible additions (new MCP tool, new flag, new agent type)
  - **MAJOR** (3.x → 4.0.0): breaking change in CLI surface, MCP tool signature, file layout, or default behavior
- Default tag is `latest` (no `--tag alpha`). The `alpha` and `v3alpha` dist-tags continue to exist for historical compatibility — point them at the same version as `latest`.
- Never publish a pre-release (`-alpha.N`, `-beta.N`, `-rc.N`) unless the user explicitly asks for a pre-release flow.

### Publishing Rules

- The normal public release train is exactly THREE packages:
  `@claude-flow/cli`, `claude-flow`, and `ruflo`.
- Internal `@claude-flow/*` components are bundled into the public artifacts;
  do not publish them standalone as part of the normal release.
- MUST update ALL dist-tags for ALL THREE packages after publishing (latest + alpha + v3alpha all point to the same version)
- Publish order: `@claude-flow/cli` first, then `claude-flow` (umbrella), then `ruflo` (alias umbrella)
- MUST run verification for ALL THREE before telling user publishing is complete
- Run `node scripts/audit-umbrella-version-lockstep.mjs` before packing or
  publishing.
- Publish from a clean reviewed commit/tag-equivalent worktree. Do not ship
  unrelated uncommitted changes.
- A fresh worktree has two separate dependency trees to install before anything
  builds: `npm install` at repo root (npm workspaces), AND `pnpm install` inside
  `v3/` (a separate pnpm workspace — root `prepare-root-publish.mjs` shells out to
  `pnpm --filter` to build `v3/@claude-flow/{shared,hooks,guidance}`, which fails
  with `spawn ENOENT` on `tsc` if `v3/node_modules` was never populated).
- Use the existing authenticated `ruvnet` npm session. Do not replace it with a
  token from another GCP project.

**`npm publish` auth — FIXED (2026-07-30):** use the `NPM_TOKEN` secret directly,
via a throwaway `.npmrc` with `NPM_CONFIG_USERCONFIG` — same pattern as the
helpers-signing-key handling. It is mirrored in two GCP projects — `ruv-dev`
(version 3+) and `cognitum-20260110` (version 7+) — so either project's copy
is current; use whichever `gcloud` session is already authenticated. This is a
granular access token ("ruflo publishjing", expires 2026-10-28) with
`package: write` + `bypass_2fa: true`, scoped broadly enough to cover
`@claude-flow/cli`, `claude-flow`, and `ruflo` (plus the `cognitum`/
`cognitum-one` orgs). Confirmed end-to-end against the real registry (not just
a permissions probe): `npm publish` for `@claude-flow/cli` succeeded via this
token with zero OTP/WebAuthn prompt, and
`npm dist-tag add` against both a scoped (`@claude-flow/cli`) and unscoped
(`claude-flow`) package also went through with no prompt.

**Why the earlier `NPM_TOKEN` version failed:** versions 1/2 of that secret
were older classic automation tokens, and npm has been restricting tokens that
bypass 2FA for writes account-wide (the login flow prints this notice —
`gh.io/npm-gat-bypass2fa-deprecation`). Version 3 is a **granular access
token** created explicitly for this purpose, which is npm's supported
replacement path (its own 2FA-bypass flag still works for a granular token,
unlike the deprecated classic automation tokens). If this token's `bypass_2fa`
flag or scope ever gets narrowed/expired (check expiry above), the fallback
is the WebAuthn dance below — but try this path first every time.

```bash
gcloud secrets versions access latest --secret=NPM_TOKEN --project=ruv-dev > /tmp/.npmrc-publish-raw
printf '//registry.npmjs.org/:_authToken=%s\n' "$(cat /tmp/.npmrc-publish-raw)" > /tmp/.npmrc-publish
rm -f /tmp/.npmrc-publish-raw
NPM_CONFIG_USERCONFIG=/tmp/.npmrc-publish npm publish   # from the package dir, with signing-key env vars for @claude-flow/cli
NPM_CONFIG_USERCONFIG=/tmp/.npmrc-publish npm dist-tag add <pkg>@<version> alpha
NPM_CONFIG_USERCONFIG=/tmp/.npmrc-publish npm dist-tag add <pkg>@<version> v3alpha
shred -u /tmp/.npmrc-publish 2>/dev/null || rm -f /tmp/.npmrc-publish   # ALWAYS clean up, same discipline as the signing key
```

**Fallback — WebAuthn procedure, if the token above is dead:** the `ruvnet`
account's 2FA method is a WebAuthn security key, not TOTP (no numeric
`--otp=<code>` exists). This must be driven by the human (an agent cannot
approve a WebAuthn browser prompt):
1. Human goes to npmjs.com → account 2FA settings → turns OFF "Require
   two-factor authentication for write actions" (narrows to auth-only, not a
   full 2FA disable), then runs `npm login` in their own terminal to refresh
   the session under the new setting.
2. Agent can then run `npm publish` directly via Bash with no further prompt.
3. **`npm dist-tag add` still requires a fresh WebAuthn approval PER CALL**
   regardless of the write-2FA setting — 6 individual browser approvals for a
   3-package release (alpha + v3alpha × 3), not 1. Tell the human up front.
- After every dist-tag call (or if unsure), verify with
  `npm view <pkg> dist-tags --json` — don't trust the CLI's own stdout alone, since
  a WebAuthn prompt that's still pending in the browser produces no terminal
  output an agent can see.
- Confirm the version actually landed (`npm view <pkg>@<version> version`) before
  telling the user publishing succeeded, same reasoning: a mid-publish approval
  that never gets answered fails silently from an agent's point of view.

**Helpers signing key (required for `@claude-flow/cli` publish):** `npm publish`'s
`prepublishOnly` runs `scripts/sign-helpers.mjs`, which needs a private key to sign
`.claude/helpers/helpers.manifest.json`. The secret lives in GCP Secret Manager in the
**`ruv-dev`** project (not `cognitum-20260110` or `claude-flow` — checked both, not there),
secret name `ruflo-helpers-signing-key`:

```bash
cd v3/@claude-flow/cli
RUFLO_HELPERS_SIGNING_SECRET=ruflo-helpers-signing-key RUFLO_HELPERS_SIGNING_PROJECT=ruv-dev \
  npm publish
```

(`ruv-dev` also holds `ruflo-config-signing-key`; do not replace the existing
authenticated npm session with a token from another project.)

**Handling the signing key without leaking it (learned 2026-07-14, hard way):**
an earlier Windows path invoked `gcloud` without its required `.cmd` suffix. The
fallback command printed the PEM into captured tool output and a session transcript.
GCP secret v1 was destroyed and a fresh v2 was rotated in (commit 0052b1b06 /
PR #2673). `sign-helpers.mjs` now selects `gcloud.cmd` on Windows and supports a
stdin-only fallback. **Rules:**
- NEVER invoke `gcloud secrets versions access` in a way that lets the payload reach
  tool output. Use the built-in `RUFLO_HELPERS_SIGNING_SECRET` path above, or pipe
  directly into the signer:
  `gcloud secrets versions access latest --secret=ruflo-helpers-signing-key --project=ruv-dev | node scripts/sign-helpers.mjs --stdin-key`.
- `--stdin-key` refuses interactive entry, validates Ed25519 key type, and never
  echoes parser input. A local file via `RUFLO_HELPERS_SIGNING_KEY` remains the
  air-gapped fallback.
- If a rotation IS needed, keep the private half in `~/.ruflo/helpers-signing.key`
  only, print ONLY the public half (via `Ed25519 pub export` from Node crypto), upload
  new private via `gcloud secrets versions add … --data-file=`, then
  `gcloud secrets versions destroy <old>` to make the old irrecoverable.

**Windows `prepublishOnly` failure (learned 2026-07-14):** the CLI's `prepublishOnly`
chain (`cp ../../../README.md ./README.md && rm -rf plugins && mkdir -p plugins && cp -r ...`)
is POSIX-shell-only. On Windows, npm runs it via `cmd.exe /d /s /c` which chokes on
`mkdir -p` (interprets `-p` as a directory name) and `cp -r` (no such command). Two
workarounds until the script is rewritten in cross-platform Node:
1. Run the prep steps manually in Git Bash, then `npm publish --ignore-scripts`.
2. Or use a POSIX shell for the whole publish: `SHELL=bash npm publish` — but this
   doesn't always take effect on Windows depending on npm version.
Option 1 is what worked for v3.29.0. Track proper fix in ruvnet/ruflo issue for
cross-platform prepublish.

**Concurrent-session helper corruption (real, observed, be paranoid):** multiple Claude Code
sessions can have their own `npm exec @claude-flow/cli@latest mcp start` MCP server running
concurrently with `cwd` inside this repo (check with `readlink /proc/<pid>/cwd` on
`pgrep -f "npm exec @claude-flow/cli@latest mcp start"`). If one of those resolved an older
cached `@latest` (predating the `semver.gte` downgrade-guard in
`helper-refresh.ts:autoRefreshHelpersIfStale`), it will silently overwrite this repo's
hand-maintained `.claude/helpers/hook-handler.cjs` / `intelligence.cjs` (root AND package
copies) — and `helpers.manifest.json` + `.helpers-version` — with its own older bundled
content, mid-session, with no warning. Observed live 2026-07-13: this happened *twice* in
one publish flow, once right after a manual revert and once right after signing (silently
invalidating a freshly-signed manifest). **Mitigation:** never trust the on-disk state of
those files between tool calls — `git diff --stat` them immediately before any `git add`/
`sign-helpers.mjs`/`npm publish` step, `git checkout HEAD --` revert if dirty, and chain
revert → sign → verify → add → commit as ONE bash invocation (`&&`-joined) to minimize the
race window. `npm publish`'s own `prepublishOnly` re-signs fresh at pack time regardless, so
what matters is the on-disk state at the *exact moment* `npm publish` runs, not before.

```bash
# Replace 3.7.1 below with your chosen stable version (patch/minor/major per the rules above)

# STEP 1: Build and publish @claude-flow/cli
cd v3/@claude-flow/cli
npm version 3.7.1 --no-git-tag-version
npm run build
npm publish                              # default tag is `latest` — no --tag flag
npm dist-tag add @claude-flow/cli@3.7.1 alpha     # historical compat
npm dist-tag add @claude-flow/cli@3.7.1 v3alpha   # historical compat

# STEP 2: Publish claude-flow umbrella
cd /Users/cohen/Projects/ruflo                    # or your repo root
npm version 3.7.1 --no-git-tag-version
npm publish
npm dist-tag add claude-flow@3.7.1 alpha
npm dist-tag add claude-flow@3.7.1 v3alpha

# STEP 3: Publish ruflo wrapper (CRITICAL — DON'T FORGET — this is what users run)
cd ruflo
npm version 3.7.1 --no-git-tag-version
npm publish
npm dist-tag add ruflo@3.7.1 alpha
npm dist-tag add ruflo@3.7.1 v3alpha
```

**Verification (run before telling user publishing is complete):**

```bash
for pkg in @claude-flow/cli claude-flow ruflo; do
  echo "$pkg: $(npm view $pkg@latest version)"
  npm view $pkg dist-tags --json
done
# All three must show latest === alpha === v3alpha === new version
```

### All Tags That Must Be Updated

| Package | Tag | Command Users Run |
|---------|-----|-------------------|
| `@claude-flow/cli` | `latest` | `npx @claude-flow/cli@latest` |
| `@claude-flow/cli` | `alpha` | `npx @claude-flow/cli@alpha` (legacy compat) |
| `@claude-flow/cli` | `v3alpha` | `npx @claude-flow/cli@v3alpha` (legacy compat) |
| `claude-flow` | `latest` | `npx claude-flow@latest` |
| `claude-flow` | `alpha` | `npx claude-flow@alpha` (legacy compat) |
| `claude-flow` | `v3alpha` | `npx claude-flow@v3alpha` (legacy compat) |
| `ruflo` | `latest` | `npx ruflo@latest` |
| `ruflo` | `alpha` | `npx ruflo@alpha` (legacy compat) |
| `ruflo` | `v3alpha` | `npx ruflo@v3alpha` (legacy compat) |

- Never forget the `ruflo` package — it's the thin wrapper users actually run via `npx ruflo`
- The legacy `alpha` and `v3alpha` tags MUST stay pointed at the latest stable so old install commands keep working
- `ruflo` source is in `/ruflo/` — it depends on `@claude-flow/cli`
- Also remember to update `ruflo/package.json` overrides when adding new pinned transitives (see #2112 lesson — root overrides do NOT propagate to the published `ruflo` wrapper)

### GitHub Release after publish

Every stable bump SHOULD have a matching `gh release create v<version>` with consolidated release notes pointing at the gist if one exists. Example:

```bash
git tag v3.7.1 main
git push origin v3.7.1
gh release create v3.7.1 --title "v3.7.1 — <one-line headline>" \
  --notes-file /tmp/release-notes.md
```
