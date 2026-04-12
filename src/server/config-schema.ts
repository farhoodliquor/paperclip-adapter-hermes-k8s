/**
 * Config field schema for the hermes_k8s adapter.
 * Consumed by Paperclip UI's generic SchemaConfigFields component for external adapters,
 * which fetches GET /api/adapters/hermes_k8s/config-schema.
 */

import type { AdapterConfigSchema } from "@paperclipai/adapter-utils";

export function getConfigSchema(): AdapterConfigSchema {
  return {
    fields: [
      // Core
      {
        key: "model",
        label: "Model",
        type: "text",
        hint: "e.g. anthropic/claude-sonnet-4-6",
        required: true,
        group: "core",
      },
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
        key: "promptTemplate",
        label: "Prompt template",
        type: "textarea",
        hint: "Template with {{agent.id}}, {{runId}}, etc.",
        group: "core",
      },
      {
        key: "bootstrapPromptTemplate",
        label: "Bootstrap prompt",
        type: "textarea",
        hint: "First-run prompt template (only used when no existing session)",
        group: "core",
      },
      {
        key: "extraArgs",
        label: "Extra CLI args",
        type: "textarea",
        hint: "Additional args appended to hermes run command",
        group: "core",
      },
      {
        key: "env",
        label: "Environment variables",
        type: "textarea",
        hint: "JSON object of KEY=VALUE pairs; overrides inherited Deployment env",
        group: "core",
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
        key: "serviceAccountName",
        label: "Service account",
        type: "text",
        hint: "K8s service account for Job pods; defaults to namespace default",
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
        key: "resources",
        label: "Resources",
        type: "textarea",
        hint: "JSON: { requests: { cpu, memory }, limits: { cpu, memory } }",
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

      // Operational
      {
        key: "timeoutSec",
        label: "Timeout (sec)",
        type: "number",
        default: 0,
        hint: "0 means no timeout",
        group: "operational",
      },
      {
        key: "graceSec",
        label: "Grace period (sec)",
        type: "number",
        default: 60,
        group: "operational",
      },
    ],
  };
}
