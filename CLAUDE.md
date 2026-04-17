# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@farhoodliquor/paperclip-adapter-hermes-k8s` is a Paperclip adapter plugin that runs Hermes AI agents as isolated Kubernetes Job pods rather than inside the main Paperclip process. It handles the full lifecycle: Job creation, pod scheduling, log streaming, and result parsing.

## Common Commands

```bash
npm run build        # Compile TypeScript to dist/
npm run typecheck    # Type-check without emitting
npm test             # Run unit tests (vitest run)
npm run test:watch   # Run tests in watch mode
npm run coverage     # Run tests with coverage report
npm run clean        # Remove dist/
```

## Architecture

### Entry Points

- **`src/index.ts`** — Package root. Exports `createServerAdapter()`, `cliAdapter`, `type`, `models`, `agentConfigurationDoc`. Also registers the UI parser via `paperclip.adapterUiParser` in `package.json`.
- **`src/server/index.ts`** — `createServerAdapter()` assembles the `ServerAdapterModule`: `execute`, `testEnvironment`, `sessionCodec`, `models`, `getConfigSchema`, `agentConfigurationDoc`.
- **`src/cli/index.ts`** — Exports `formatEvent` as the CLI adapter's `formatStdoutEvent`.

### Execution Flow (`src/server/execute.ts`)

The `execute()` function is the core. It:

1. **Concurrency guard** — Lists running Jobs for this agent; blocks if one exists already.
2. **Introspects self-pod** via `getSelfPodInfo()` to inherit image, PVC, env vars, secrets.
3. **Builds Job manifest** via `buildJobManifest()`.
4. **Creates the K8s Job** via `BatchV1Api`.
5. **Waits for pod scheduling** via `waitForPod()`.
6. **Streams logs** via `streamPodLogs()` (Pod log following) concurrently with `waitForJobCompletion()`.
7. **Parses Hermes output** via `parseHermesText()` (from `src/server/parse.ts`).
8. **Returns `AdapterExecutionResult`** with session info, exit code, summary, and result JSON.

### Self-Pod Introspection (`src/server/k8s-client.ts`)

`getSelfPodInfo()` queries the K8s API for the current pod (via `HOSTNAME` env var) to extract:
- Container image (used as default for Job pods)
- `imagePullSecrets`, `dnsConfig`
- PVC claim name for `/paperclip` mount
- Secret volumes mounted on the main container
- Env vars from `INHERITED_ENV_KEYS` (API keys, `PAPERCLIP_API_URL`, etc.)

Results are cached. The kubeconfig is also cached per path (supports multiple kubeconfigs).

### Job Manifest Construction (`src/server/job-manifest.ts`)

`buildJobManifest()` constructs a `V1Job` with a two-container pattern:
- **Init container** (`busybox:1.36`): writes the prompt text to an `emptyDir` volume at `/tmp/prompt/prompt.txt`.
- **Hermes container**: reads the prompt via `cat /tmp/prompt/prompt.txt | hermes run --quiet ...`.

This avoids embedding the (potentially large) prompt in the Job spec's env vars.

The Job inherits:
- Image, imagePullSecrets, dnsConfig from the self-pod
- PVC mount at `/paperclip` for session resume
- Secret volumes (e.g., `~/.netrc`, git credentials)
- Env vars layered: inherited from Deployment → Paperclip context → user overrides

### Hermes Output Parsing

- **`src/server/parse.ts`** — `parseHermesText()` parses Hermes `--quiet` text output. Handles assistant lines (`┊ 💬`), tool completions (`┊ {emoji} {verb} {detail}`), session IDs (`session_id: ...`), errors, thinking blocks. Also `isHermesUnknownSessionError()` detects stale-session errors to clear session on next run.
- **`src/ui-parser.ts`** — `parseStdoutLine()` converts Hermes stdout lines into `TranscriptEntry` objects (tool_call, tool_result, assistant, thinking, stderr, system) for Paperclip UI rendering.

### Session Handling (`src/server/session.ts`)

The `sessionCodec` handles serializing/deserializing session IDs and workspace context. Supports multiple field name variants (`sessionId`, `session_id`, `sessionID`; `cwd`, `workdir`, `folder`).

### Config Schema (`src/server/config-schema.ts`)

`getConfigSchema()` returns an `AdapterConfigSchema` for the Paperclip UI's generic `SchemaConfigFields` component. Covers all adapter config fields: model, provider, variant, Kubernetes settings (namespace, image, kubeconfig, resources, etc.), and operational settings (timeoutSec, graceSec).

## Key Design Notes

- **Hermes `--quiet` mode**: The adapter always runs Hermes with `--quiet` for machine-parseable text output (not JSONL or JSON). The `--quiet` flag produces text lines like `┊ 💬 message`, `┊ 🔍 search foo  2.3s`, etc.
- **Concurrency guard**: Uses a label selector query on existing Jobs (`paperclip.io/agent-id`, `paperclip.io/adapter-type=hermes_k8s`) before creating a new Job. Prevents multiple simultaneous runs for the same agent.
- **Kubeconfig caching**: The `kcCache` Map keyed by kubeconfig path supports multiple concurrent agents with different kubeconfigs.
- **Graceful degradation**: If the concurrency guard K8s API call fails, it proceeds (heartbeat service enforces concurrency at a higher level).
- **Pod scheduling timeout**: 120 seconds fixed timeout for `waitForPod()` before declaring scheduling failure.
- **No `--session` on first run**: The `runtime.sessionId` is only passed as `--session` when non-empty (first run has no session yet, Hermes creates one).
