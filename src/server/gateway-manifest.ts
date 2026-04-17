import type * as k8s from "@kubernetes/client-node";
import type { AdapterExecutionContext } from "@paperclipai/adapter-utils";
import {
  asString,
  asNumber,
  asBoolean,
  parseObject,
  buildPaperclipEnv,
} from "@paperclipai/adapter-utils/server-utils";
import type { SelfPodInfo } from "./k8s-client.js";

function sanitizeForK8sName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 8);
}

export interface GatewayBuildInput {
  ctx: AdapterExecutionContext;
  selfPod: SelfPodInfo;
  apiKey: string;
}

export interface GatewayBuildResult {
  deployment: k8s.V1Deployment;
  service: k8s.V1Service;
  deploymentName: string;
  serviceName: string;
  namespace: string;
}

function buildGatewayEnvVars(
  ctx: AdapterExecutionContext,
  selfPod: SelfPodInfo,
  config: Record<string, unknown>,
  apiKey: string,
): k8s.V1EnvVar[] {
  const { agent, context } = ctx;
  const envConfig = parseObject(config.env);

  // Layer 1: PAPERCLIP_* base vars
  const paperclipEnv = buildPaperclipEnv(agent);

  const setIfPresent = (envKey: string, value: unknown) => {
    if (typeof value === "string" && value.trim().length > 0) {
      paperclipEnv[envKey] = value.trim();
    }
  };

  setIfPresent("PAPERCLIP_TASK_ID", context.taskId ?? context.issueId);
  setIfPresent("PAPERCLIP_WORKSPACE_CWD", parseObject(context.paperclipWorkspace).cwd);
  setIfPresent("PAPERCLIP_WORKSPACE_SOURCE", parseObject(context.paperclipWorkspace).source);
  setIfPresent("PAPERCLIP_WORKSPACE_ID", parseObject(context.paperclipWorkspace).workspaceId);
  setIfPresent("PAPERCLIP_WORKSPACE_REPO_URL", parseObject(context.paperclipWorkspace).repoUrl);
  setIfPresent("PAPERCLIP_WORKSPACE_REPO_REF", parseObject(context.paperclipWorkspace).repoRef);
  setIfPresent("PAPERCLIP_WORKSPACE_BRANCH", parseObject(context.paperclipWorkspace).branchName);
  setIfPresent("AGENT_HOME", parseObject(context.paperclipWorkspace).agentHome);

  if (ctx.authToken) {
    paperclipEnv.PAPERCLIP_API_KEY = ctx.authToken;
  }

  // Inherit PAPERCLIP_API_URL from Deployment env
  if (selfPod.inheritedEnv.PAPERCLIP_API_URL) {
    paperclipEnv.PAPERCLIP_API_URL = selfPod.inheritedEnv.PAPERCLIP_API_URL;
  }

  // Layer 2: Inherited from Deployment (API keys, etc.)
  const merged: Record<string, string> = {
    ...selfPod.inheritedEnv,
    ...paperclipEnv,
  };

  // Layer 3: User-defined overrides from adapterConfig.env
  for (const [key, value] of Object.entries(envConfig)) {
    if (typeof value === "string") merged[key] = value;
  }

  // Gateway-specific env vars
  merged.HERMES_API_SERVER_HOST = "0.0.0.0";
  merged.HERMES_API_SERVER_PORT = String(asNumber(config.gatewayApiServerPort, 8642));
  merged.HERMES_API_SERVER_KEY = apiKey;
  merged.HERMES_DISABLE_PROJECT_CONFIG = "true";
  merged.HOME = "/paperclip";

  // Hermes max iterations (per-run turn limit)
  const maxIterations = asNumber(config.gatewayMaxIterations, 90);
  merged.HERMES_MAX_ITERATIONS = String(maxIterations);

  // Convert to V1EnvVar array
  const envVars: k8s.V1EnvVar[] = Object.entries(merged).map(([name, value]) => ({
    name,
    value,
  }));

  return envVars;
}

export function buildGatewayManifest(input: GatewayBuildInput): GatewayBuildResult {
  const { ctx, selfPod, apiKey } = input;
  const { agent, config: rawConfig } = ctx;
  const config = parseObject(rawConfig);

  const namespace = asString(config.namespace, "") || selfPod.namespace;
  const image = asString(config.image, "") || selfPod.image;
  const port = asNumber(config.gatewayApiServerPort, 8642);
  const resources = parseObject(config.resources);
  const nodeSelector = parseObject(config.nodeSelector);
  const tolerations = Array.isArray(config.tolerations) ? config.tolerations : [];
  const extraLabels = parseObject(config.labels);
  const imagePullPolicy = asString(config.imagePullPolicy, "IfNotPresent");
  const serviceAccountName = asString(config.serviceAccountName, "") || undefined;

  const agentSlug = sanitizeForK8sName(agent.id);
  const deploymentName = `hermes-gateway-${agentSlug}`;
  const serviceName = `hermes-gateway-${agentSlug}`;

  // Labels applied to both Deployment and Pod template
  const labels: Record<string, string> = {
    "app.kubernetes.io/managed-by": "paperclip",
    "app.kubernetes.io/component": "agent-gateway",
    "paperclip.io/agent-id": agent.id,
    "paperclip.io/company-id": agent.companyId,
    "paperclip.io/adapter-type": "hermes_k8s",
  };
  for (const [key, value] of Object.entries(extraLabels)) {
    if (typeof value === "string") labels[key] = value;
  }

  // Volumes
  const volumes: k8s.V1Volume[] = [];

  if (selfPod.pvcClaimName) {
    volumes.push({
      name: "data",
      persistentVolumeClaim: { claimName: selfPod.pvcClaimName },
    });
  }

  // Mount secret volumes inherited from the Deployment pod
  for (const sv of selfPod.secretVolumes) {
    volumes.push({
      name: sv.volumeName,
      secret: { secretName: sv.secretName, defaultMode: sv.defaultMode, optional: true },
    });
  }

  const volumeMounts: k8s.V1VolumeMount[] = [];
  if (selfPod.pvcClaimName) {
    volumeMounts.push({ name: "data", mountPath: "/paperclip" });
  }
  for (const sv of selfPod.secretVolumes) {
    volumeMounts.push({ name: sv.volumeName, mountPath: sv.mountPath, readOnly: true });
  }

  const securityContext: k8s.V1SecurityContext = {
    capabilities: { drop: ["ALL"] },
    readOnlyRootFilesystem: false,
    runAsNonRoot: true,
    runAsUser: 1000,
    allowPrivilegeEscalation: false,
  };

  const podSecurityContext: k8s.V1PodSecurityContext = {
    runAsNonRoot: true,
    runAsUser: 1000,
    runAsGroup: 1000,
    fsGroup: 1000,
    fsGroupChangePolicy: "OnRootMismatch",
  };

  // Resource defaults for the gateway container
  const resourceRequests = parseObject(resources.requests);
  const resourceLimits = parseObject(resources.limits);
  const containerResources: k8s.V1ResourceRequirements = {
    requests: {
      cpu: asString(resourceRequests.cpu, "1000m"),
      memory: asString(resourceRequests.memory, "2Gi"),
    },
    limits: {
      cpu: asString(resourceLimits.cpu, "4000m"),
      memory: asString(resourceLimits.memory, "8Gi"),
    },
  };

  const envVars = buildGatewayEnvVars(ctx, selfPod, config, apiKey);

  const deployment: k8s.V1Deployment = {
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: {
      name: deploymentName,
      namespace,
      labels,
      annotations: {
        "paperclip.io/adapter-type": "hermes_k8s",
        "paperclip.io/agent-name": agent.name,
      },
    },
    spec: {
      replicas: 1,
      selector: { matchLabels: { "paperclip.io/gateway-of": agent.id } },
      template: {
        metadata: { labels: { ...labels, "paperclip.io/gateway-of": agent.id } },
        spec: {
          restartPolicy: "Always",
          serviceAccountName,
          securityContext: podSecurityContext,
          ...(selfPod.imagePullSecrets.length > 0 ? { imagePullSecrets: selfPod.imagePullSecrets } : {}),
          ...(selfPod.dnsConfig ? { dnsConfig: selfPod.dnsConfig } : {}),
          ...(Object.keys(nodeSelector).length > 0 ? { nodeSelector: nodeSelector as Record<string, string> } : {}),
          ...(tolerations.length > 0 ? { tolerations: tolerations as k8s.V1Toleration[] } : {}),
          containers: [
            {
              name: "hermes-gateway",
              image,
              imagePullPolicy,
              command: ["hermes", "gateway", "run"],
              ports: [{ containerPort: port, name: "api" }],
              env: envVars,
              volumeMounts,
              securityContext,
              resources: containerResources,
              // Health probes
              startupProbe: {
                httpGet: { path: "/health", port: port as number, scheme: "HTTP" },
                initialDelaySeconds: 5,
                periodSeconds: 10,
                failureThreshold: 60, // 5 * 10 = 50s min, 60 * 10 = 600s max
              },
              livenessProbe: {
                httpGet: { path: "/health", port: port as number, scheme: "HTTP" },
                initialDelaySeconds: 15,
                periodSeconds: 15,
                failureThreshold: 3,
              },
              readinessProbe: {
                httpGet: { path: "/health", port: port as number, scheme: "HTTP" },
                initialDelaySeconds: 5,
                periodSeconds: 10,
                failureThreshold: 3,
              },
            },
          ],
          volumes,
        },
      },
    },
  };

  const service: k8s.V1Service = {
    apiVersion: "v1",
    kind: "Service",
    metadata: {
      name: serviceName,
      namespace,
      labels,
    },
    spec: {
      type: "ClusterIP",
      ports: [{ port, targetPort: port as number, name: "api" }],
      selector: { "paperclip.io/gateway-of": agent.id },
    },
  };

  return { deployment, service, deploymentName, serviceName, namespace };
}
