export const type = "hermes_k8s";
export const label = "Hermes (Kubernetes)";

export const models = [
  { id: "anthropic/claude-opus-4-6", label: "Claude Opus 4.6" },
  { id: "anthropic/claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { id: "anthropic/claude-haiku-4-6", label: "Claude Haiku 4.6" },
  { id: "openai/gpt-5.2-codex", label: "GPT-5.2 Codex" },
  { id: "openai/gpt-5.4", label: "GPT-5.4" },
  { id: "openai/gpt-5.2", label: "GPT-5.2" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "meta/llama-4-405b", label: "Llama 4 405B" },
  { id: "mistralai/mistral-large-3", label: "Mistral Large 3" },
];

import type { CLIAdapterModule } from "@paperclipai/adapter-utils";
import { formatEvent } from "./cli/format-event.js";

export const cliAdapter: CLIAdapterModule = {
  type,
  formatStdoutEvent: (line: string, debug: boolean) => {
    const formatted = formatEvent(line, debug);
    if (formatted) {
      console.log(formatted);
    }
  },
};

export const agentConfigurationDoc = `# hermes_k8s agent configuration

Adapter: hermes_k8s

Runs Hermes inside an isolated Kubernetes pod instead of the main
Paperclip process. Two execution modes are available.

## Execution Modes

### mode: "gateway" (default) — Perpetual

Runs Hermes as a long-lived Kubernetes Deployment with an embedded API server
(port 8642). Paperclip sends work via the Hermes API (POST /v1/runs) on each
heartbeat. Sessions persist across heartbeats. The gateway never restarts on its
own — Paperclip kills it only when the agent is stopped.

Benefits:
- No pod startup latency on each run
- Sessions stay alive between heartbeats
- Bootstrap prompts injected on every run via the \`instructions\` field
- Shared PVC session state persists

### mode: "job" — One-shot (legacy)

Spawns a fresh Kubernetes Job per execute() call. Identical to the original
behavior. Use this for testing or when you need complete isolation between runs.

## Core Fields

Adapter-specific core fields (model, promptTemplate, extraArgs, env,
timeoutSec, and graceSec are provided by the platform):
- provider (string, optional): AI provider (anthropic, openai, google, etc.); auto-detected from model if not specified
- variant (string, optional): provider-specific reasoning/profile variant
- mode (string, optional): "gateway" (default) or "job"
- bootstrapPromptTemplate (string, optional): ephemeral system prompt injected on every run in gateway mode (sent as Hermes \`instructions\`); in job mode, only used when no existing session
- dangerouslySkipPermissions (boolean, optional): inject runtime config with permission.external_directory=allow; defaults to true

## Gateway Fields (mode: "gateway")

- gatewayStartupTimeoutSec (number, optional): time for gateway pod to become ready; default 120s
- gatewayApiServerPort (number, optional): internal port for the gateway API server; default 8642
- gatewayMaxIterations (number, optional): max agent turns per run (HERMES_MAX_ITERATIONS); default 90

## Kubernetes Fields

- namespace (string, optional): namespace for gateway/Job; defaults to the Deployment namespace
- image (string, optional): override container image; defaults to the running Deployment image
- imagePullPolicy (string, optional): image pull policy; default "IfNotPresent"
- serviceAccountName (string, optional): K8s service account; defaults to namespace default
- kubeconfig (string, optional): absolute path to a kubeconfig file on disk; defaults to in-cluster service account auth
- cwd (string, optional): override working directory inside the container; defaults to /paperclip
- resources (object, optional): { requests: { cpu, memory }, limits: { cpu, memory } }
- nodeSelector (object, optional): node selector for gateway/Job pods
- tolerations (array, optional): tolerations for gateway/Job pods
- labels (object, optional): extra labels added to gateway/Job metadata

## Operational Fields

- timeoutSec (number, optional): run timeout in seconds; 0 means no timeout
- graceSec (number, optional): additional grace before adapter gives up after deadline
- ttlSecondsAfterFinished (number, optional): auto-cleanup delay (job mode only); default 300
- retainJobs (boolean, optional): skip cleanup on completion for debugging (job mode only)

Inherited from Deployment (no config needed):
- ANTHROPIC_API_KEY, OPENAI_API_KEY, and other provider keys
- GOOGLE_GENERATIVE_AI_API_KEY
- PAPERCLIP_API_URL
- Container image, imagePullSecrets, DNS config, PVC mount, security context

Notes:
- Session resume in gateway mode: same Hermes session persists across heartbeats via session_id
- Session resume in job mode: works via the shared /paperclip PVC (HOME=/paperclip)
- Skills are bundled in the container image
- Hermes is a multi-provider AI agent that can work with various model backends
`;

export { createServerAdapter } from "./server/index.js";
