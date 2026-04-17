import { randomBytes } from "node:crypto";
import type { AdapterExecutionContext } from "@paperclipai/adapter-utils";
import { asNumber, parseObject } from "@paperclipai/adapter-utils/server-utils";
import { getAppsApi, getCoreApi, getSelfPodInfo } from "./k8s-client.js";
import { buildGatewayManifest } from "./gateway-manifest.js";

export interface GatewayEndpoint {
  deploymentName: string;
  serviceName: string;
  namespace: string;
  baseUrl: string;
  apiKey: string;
}

/**
 * Per-agent gateway cache — keyed by agentId.
 * Each entry is the gateway endpoint for that agent.
 */
const gatewayCache = new Map<string, GatewayEndpoint>();

function generateApiKey(): string {
  return randomBytes(24).toString("hex");
}

function sanitizeForK8sName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 8);
}

async function checkGatewayHealth(baseUrl: string, apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/health`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForGatewayHealth(
  baseUrl: string,
  apiKey: string,
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await checkGatewayHealth(baseUrl, apiKey)) return;
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error(`Timed out waiting for gateway to become healthy (${Math.round(timeoutMs / 1000)}s)`);
}

async function createSecret(
  namespace: string,
  name: string,
  apiKey: string,
  kubeconfigPath?: string,
): Promise<void> {
  const coreApi = getCoreApi(kubeconfigPath);
  await coreApi.createNamespacedSecret({
    namespace,
    body: {
      apiVersion: "v1",
      kind: "Secret",
      metadata: { name, namespace },
      type: "Opaque",
      stringData: { "api-key": apiKey },
    },
  });
}

async function deleteSecret(
  namespace: string,
  name: string,
  kubeconfigPath?: string,
): Promise<void> {
  const coreApi = getCoreApi(kubeconfigPath);
  try {
    await coreApi.deleteNamespacedSecret({ name, namespace });
  } catch (err) {
    // Ignore not-found
  }
}

async function deleteDeployment(
  namespace: string,
  name: string,
  kubeconfigPath?: string,
): Promise<void> {
  const appsApi = getAppsApi(kubeconfigPath);
  try {
    await appsApi.deleteNamespacedDeployment({ name, namespace });
  } catch (err) {
    // Ignore not-found
  }
}

async function deleteService(
  namespace: string,
  name: string,
  kubeconfigPath?: string,
): Promise<void> {
  const coreApi = getCoreApi(kubeconfigPath);
  try {
    await coreApi.deleteNamespacedService({ name, namespace });
  } catch (err) {
    // Ignore not-found
  }
}

async function deploymentExists(
  namespace: string,
  name: string,
  kubeconfigPath?: string,
): Promise<boolean> {
  const appsApi = getAppsApi(kubeconfigPath);
  try {
    await appsApi.readNamespacedDeployment({ name, namespace });
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Ensure a gateway Deployment + Service exists and is healthy for the given agent.
 * Returns the internal cluster URL and API key for the gateway.
 *
 * Creates on first call; subsequent calls reuse the cached endpoint if the
 * Deployment still exists.
 */
export async function ensureGateway(
  ctx: AdapterExecutionContext,
  kubeconfigPath?: string,
): Promise<GatewayEndpoint> {
  const agentId = ctx.agent.id;

  // Check cache first
  const cached = gatewayCache.get(agentId);
  if (cached) {
    const exists = await deploymentExists(cached.namespace, cached.deploymentName, kubeconfigPath);
    if (exists) {
      // Verify it's actually healthy
      const healthy = await checkGatewayHealth(cached.baseUrl, cached.apiKey);
      if (healthy) return cached;
      // If not healthy, fall through to recreate
    }
  }

  const config = parseObject(ctx.config);
  const startupTimeoutSec = asNumber(config.gatewayStartupTimeoutSec, 120);
  const startupTimeoutMs = startupTimeoutSec * 1000;

  // Introspect self-pod to inherit image, PVC, env vars, etc.
  const selfPod = await getSelfPodInfo(kubeconfigPath);

  // Generate a new API key for this gateway
  const apiKey = generateApiKey();
  const agentSlug = sanitizeForK8sName(agentId);
  const secretName = `hermes-gateway-${agentSlug}-auth`;

  const { deployment, service, deploymentName, serviceName, namespace } = buildGatewayManifest({
    ctx,
    selfPod,
    apiKey,
  });

  const baseUrl = `http://${serviceName}.${namespace}:8642`;

  // Create Secret, Service, Deployment
  await createSecret(namespace, secretName, apiKey, kubeconfigPath);
  await deleteService(namespace, serviceName, kubeconfigPath);
  await deleteDeployment(namespace, deploymentName, kubeconfigPath);

  const coreApi = getCoreApi(kubeconfigPath);
  await coreApi.createNamespacedService({ namespace, body: service });

  const appsApi = getAppsApi(kubeconfigPath);
  await appsApi.createNamespacedDeployment({ namespace, body: deployment });

  // Wait for gateway to become healthy
  await waitForGatewayHealth(baseUrl, apiKey, startupTimeoutMs);

  const endpoint: GatewayEndpoint = { deploymentName, serviceName, namespace, baseUrl, apiKey };
  gatewayCache.set(agentId, endpoint);
  return endpoint;
}

/**
 * Delete the gateway Deployment, Service, and Secret for a given agent.
 */
export async function deleteGateway(
  agentId: string,
  namespace: string,
  kubeconfigPath?: string,
): Promise<void> {
  const agentSlug = sanitizeForK8sName(agentId);
  const deploymentName = `hermes-gateway-${agentSlug}`;
  const serviceName = `hermes-gateway-${agentSlug}`;
  const secretName = `hermes-gateway-${agentSlug}-auth`;

  await Promise.all([
    deleteDeployment(namespace, deploymentName, kubeconfigPath),
    deleteService(namespace, serviceName, kubeconfigPath),
    deleteSecret(namespace, secretName, kubeconfigPath),
  ]);

  gatewayCache.delete(agentId);
}

/**
 * Get the cached gateway endpoint for an agent, if one exists.
 */
export function getCachedGateway(agentId: string): GatewayEndpoint | undefined {
  return gatewayCache.get(agentId);
}
