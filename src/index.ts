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

export const agentConfigurationDoc = `# hermes_k8s agent configuration

Adapter: hermes_k8s

Runs Hermes inside an isolated Kubernetes Job pod instead of the main
Paperclip process. The Job inherits the container image, imagePullSecrets,
DNS config, and PVC from the running Paperclip Deployment automatically.

Core fields:
- model (string, required): Hermes model id in provider/model format (e.g. anthropic/claude-sonnet-4-6)
- provider (string, optional): AI provider (anthropic, openai, google, etc.); auto-detected from model if not specified
- variant (string, optional): provider-specific reasoning/profile variant passed as --variant
- dangerouslySkipPermissions (boolean, optional): inject runtime config with permission.external_directory=allow; defaults to true
- promptTemplate (string, optional): run prompt template
- extraArgs (string[], optional): additional CLI args appended to the hermes command
- env (object, optional): KEY=VALUE environment variables; overrides inherited vars from the Deployment

Kubernetes fields:
- namespace (string, optional): namespace for Jobs; defaults to the Deployment namespace
- image (string, optional): override container image; defaults to the running Deployment image
- imagePullPolicy (string, optional): image pull policy; default "IfNotPresent"
- kubeconfig (string, optional): absolute path to a kubeconfig file on disk; defaults to in-cluster service account auth
- resources (object, optional): { requests: { cpu, memory }, limits: { cpu, memory } }
- nodeSelector (object, optional): node selector for Job pods
- tolerations (array, optional): tolerations for Job pods
- labels (object, optional): extra labels added to Job metadata
- ttlSecondsAfterFinished (number, optional): auto-cleanup delay; default 300
- retainJobs (boolean, optional): skip cleanup on completion for debugging

Operational fields:
- timeoutSec (number, optional): run timeout in seconds; 0 means no timeout
- graceSec (number, optional): additional grace before adapter gives up after Job deadline

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
