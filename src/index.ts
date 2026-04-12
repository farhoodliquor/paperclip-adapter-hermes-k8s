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

Runs Hermes inside an isolated Kubernetes Job pod instead of the main
Paperclip process. The Job inherits the container image, imagePullSecrets,
DNS config, and PVC from the running Paperclip Deployment automatically.

Adapter-specific core fields (model, promptTemplate, extraArgs, env,
timeoutSec, and graceSec are provided by the platform):
- provider (string, optional): AI provider (anthropic, openai, google, etc.); auto-detected from model if not specified
- variant (string, optional): provider-specific reasoning/profile variant passed as --variant
- dangerouslySkipPermissions (boolean, optional): inject runtime config with permission.external_directory=allow; defaults to true
- bootstrapPromptTemplate (string, optional): first-run prompt template (only used when no existing session)

Kubernetes fields:
- namespace (string, optional): namespace for Jobs; defaults to the Deployment namespace
- image (string, optional): override container image; defaults to the running Deployment image
- imagePullPolicy (string, optional): image pull policy; default "IfNotPresent"
- serviceAccountName (string, optional): K8s service account for Job pods; defaults to namespace default
- kubeconfig (string, optional): absolute path to a kubeconfig file on disk; defaults to in-cluster service account auth
- cwd (string, optional): override working directory inside the container; defaults to /paperclip
- resources.requests.cpu (string, optional): CPU request (e.g. 500m, 1)
- resources.requests.memory (string, optional): memory request (e.g. 512Mi, 1Gi)
- resources.limits.cpu (string, optional): CPU limit (e.g. 2, 4)
- resources.limits.memory (string, optional): memory limit (e.g. 2Gi, 4Gi)
- nodeSelector (object, optional): node selector for Job pods
- tolerations (array, optional): tolerations for Job pods
- labels (object, optional): extra labels added to Job metadata
- ttlSecondsAfterFinished (number, optional): auto-cleanup delay; default 300
- retainJobs (boolean, optional): skip cleanup on completion for debugging

Platform-provided fields (do not duplicate in adapter config):
- model, promptTemplate, extraArgs, env, timeoutSec, graceSec

Inherited from Deployment (no config needed):
- ANTHROPIC_API_KEY, OPENAI_API_KEY, and other provider keys
- GOOGLE_GENERATIVE_AI_API_KEY
- PAPERCLIP_API_URL
- Container image, imagePullSecrets, DNS config, PVC mount, security context

Notes:
- Session resume works via the shared /paperclip PVC (HOME=/paperclip)
- Skills are bundled in the container image
- Prompts are delivered via a busybox init container writing to an emptyDir volume
- Hermes is a multi-provider AI agent that can work with various model backends
`;

export { createServerAdapter } from "./server/index.js";
