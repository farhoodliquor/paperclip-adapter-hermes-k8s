/**
 * Config field schema for the hermes_k8s adapter.
 * Consumed by Paperclip UI's generic SchemaConfigFields component for external adapters,
 * which fetches GET /api/adapters/hermes_k8s/config-schema.
 */

import type { AdapterConfigSchema } from "@paperclipai/adapter-utils";

export function getConfigSchema(): AdapterConfigSchema {
  return {
    fields: [
      // Core (adapter-specific only; model, promptTemplate, extraArgs, env,
      // timeoutSec, graceSec are provided by the platform)
      {
        key: "provider",
        label: "Provider",
        type: "select",
        options: [
          { label: "Auto-detect", value: "auto" },
          { label: "OpenAI", value: "openai" },
          { label: "Anthropic", value: "anthropic" },
          { label: "Google", value: "google" },
          { label: "OpenRouter", value: "openrouter" },
          { label: "Nous", value: "nous" },
        ],
        hint: "Leave blank to auto-detect from model name",
        group: "core",
      },
      {
        key: "mode",
        label: "Execution mode",
        type: "select",
        options: [
          { label: "Gateway (perpetual)", value: "gateway" },
          { label: "Job (one-shot)", value: "job" },
        ],
        default: "gateway",
        hint: "Gateway runs Hermes as a long-lived pod; Job spawns a fresh pod per run.",
        group: "core",
      },
      {
        key: "variant",
        label: "Variant",
        type: "text",
        hint: "Provider-specific reasoning variant",
        group: "core",
      },
      {
        key: "dangerouslySkipPermissions",
        label: "Skip permissions",
        type: "toggle",
        default: true,
        hint: "Inject runtime config with permission.external_directory=allow",
        group: "core",
      },
      {
        key: "bootstrapPromptTemplate",
        label: "Bootstrap prompt",
        type: "textarea",
        hint: "In gateway mode, sent as ephemeral system prompt on every run. Only for new sessions in job mode.",
        group: "core",
      },
      // Gateway
      {
        key: "gatewayStartupTimeoutSec",
        label: "Gateway startup timeout (sec)",
        type: "number",
        default: 120,
        hint: "Time to wait for gateway pod to become ready before giving up",
        group: "gateway",
      },
      {
        key: "gatewayApiServerPort",
        label: "Gateway API port",
        type: "number",
        default: 8642,
        hint: "Internal port for the gateway API server",
        group: "gateway",
      },
      {
        key: "gatewayMaxIterations",
        label: "Gateway max iterations",
        type: "number",
        default: 90,
        hint: "Max agent turns per run (HERMES_MAX_ITERATIONS)",
        group: "gateway",
      },

      // Kubernetes
      {
        key: "namespace",
        label: "Namespace",
        type: "text",
        group: "kubernetes",
      },
      {
        key: "image",
        label: "Container image",
        type: "text",
        hint: "Override image; defaults to running Deployment image",
        group: "kubernetes",
      },
      {
        key: "imagePullPolicy",
        label: "Image pull policy",
        type: "select",
        options: [
          { label: "IfNotPresent", value: "IfNotPresent" },
          { label: "Always", value: "Always" },
          { label: "Never", value: "Never" },
        ],
        group: "kubernetes",
      },
      {
        key: "kubeconfig",
        label: "Kubeconfig path",
        type: "text",
        hint: "Absolute path; defaults to in-cluster service account",
        group: "kubernetes",
      },
      {
        key: "cwd",
        label: "Working directory",
        type: "text",
        hint: "Override working directory inside the container; defaults to /paperclip",
        group: "kubernetes",
      },
      {
        key: "resources.requests.cpu",
        label: "CPU request",
        type: "text",
        hint: "e.g. 500m, 1",
        group: "kubernetes",
      },
      {
        key: "resources.requests.memory",
        label: "Memory request",
        type: "text",
        hint: "e.g. 512Mi, 1Gi",
        group: "kubernetes",
      },
      {
        key: "resources.limits.cpu",
        label: "CPU limit",
        type: "text",
        hint: "e.g. 2, 4",
        group: "kubernetes",
      },
      {
        key: "resources.limits.memory",
        label: "Memory limit",
        type: "text",
        hint: "e.g. 2Gi, 4Gi",
        group: "kubernetes",
      },
      {
        key: "nodeSelector",
        label: "Node selector",
        type: "textarea",
        hint: "JSON object",
        group: "kubernetes",
      },
      {
        key: "tolerations",
        label: "Tolerations",
        type: "textarea",
        hint: "JSON array",
        group: "kubernetes",
      },
      {
        key: "labels",
        label: "Extra labels",
        type: "textarea",
        hint: "JSON object",
        group: "kubernetes",
      },
      {
        key: "ttlSecondsAfterFinished",
        label: "TTL after finish (sec)",
        type: "number",
        default: 300,
        group: "kubernetes",
      },
      {
        key: "retainJobs",
        label: "Retain jobs for debugging",
        type: "toggle",
        group: "kubernetes",
      },
    ],
  };
}
