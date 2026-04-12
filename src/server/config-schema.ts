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
      },
      {
        key: "variant",
        label: "Variant",
        type: "text",
        hint: "Provider-specific reasoning variant",
      },
      {
        key: "dangerouslySkipPermissions",
        label: "Skip permissions",
        type: "toggle",
        default: true,
        hint: "Inject runtime config with permission.external_directory=allow",
      },
      {
        key: "promptTemplate",
        label: "Prompt template",
        type: "textarea",
        hint: "Template with {{agent.id}}, {{runId}}, etc.",
      },
      {
        key: "extraArgs",
        label: "Extra CLI args",
        type: "textarea",
        hint: "Additional args appended to hermes run command",
      },

      // Kubernetes
      {
        key: "namespace",
        label: "Namespace",
        type: "text",
      },
      {
        key: "image",
        label: "Container image",
        type: "text",
        hint: "Override image; defaults to running Deployment image",
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
      },
      {
        key: "kubeconfig",
        label: "Kubeconfig path",
        type: "text",
        hint: "Absolute path; defaults to in-cluster service account",
      },
      {
        key: "resources",
        label: "Resources",
        type: "textarea",
        hint: "JSON: { requests: { cpu, memory }, limits: { cpu, memory } }",
      },
      {
        key: "nodeSelector",
        label: "Node selector",
        type: "textarea",
        hint: "JSON object",
      },
      {
        key: "tolerations",
        label: "Tolerations",
        type: "textarea",
        hint: "JSON array",
      },
      {
        key: "labels",
        label: "Extra labels",
        type: "textarea",
        hint: "JSON object",
      },
      {
        key: "ttlSecondsAfterFinished",
        label: "TTL after finish (sec)",
        type: "number",
        default: 300,
      },
      {
        key: "retainJobs",
        label: "Retain jobs for debugging",
        type: "toggle",
      },

      // Operational
      {
        key: "timeoutSec",
        label: "Timeout (sec)",
        type: "number",
        default: 0,
        hint: "0 means no timeout",
      },
      {
        key: "graceSec",
        label: "Grace period (sec)",
        type: "number",
        default: 60,
      },
    ],
  };
}
