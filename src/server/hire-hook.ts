import type { HireApprovedPayload, HireApprovedHookResult } from "@paperclipai/adapter-utils";
import { getCoreApi, getAuthzApi } from "./k8s-client.js";

async function checkPermission(
  authzApi: ReturnType<typeof getAuthzApi>,
  namespace: string,
  verb: string,
  resource: string,
  group: string,
): Promise<boolean | "unknown"> {
  try {
    const review = await authzApi.createSelfSubjectAccessReview({
      body: {
        apiVersion: "authorization.k8s.io/v1",
        kind: "SelfSubjectAccessReview",
        spec: { resourceAttributes: { namespace, verb, resource, group } },
      },
    });
    return review.status?.allowed ?? false;
  } catch {
    return "unknown";
  }
}

export async function onHireApproved(
  payload: HireApprovedPayload,
  adapterConfig: Record<string, unknown>,
): Promise<HireApprovedHookResult> {
  const kubeconfigPath =
    typeof adapterConfig.kubeconfig === "string" && adapterConfig.kubeconfig.trim()
      ? adapterConfig.kubeconfig.trim()
      : undefined;

  const namespace =
    typeof adapterConfig.namespace === "string" && adapterConfig.namespace.trim()
      ? adapterConfig.namespace.trim()
      : undefined;

  if (!namespace) {
    return {
      ok: true,
      detail: { skipped: true, reason: "no explicit namespace configured; will use pod namespace at runtime" },
    };
  }

  const coreApi = getCoreApi(kubeconfigPath);
  const authzApi = getAuthzApi(kubeconfigPath);
  const detail: Record<string, unknown> = {
    agentId: payload.agentId,
    agentName: payload.agentName,
    namespace,
  };

  try {
    await coreApi.readNamespace({ name: namespace });
    detail.namespaceExists = true;
  } catch {
    detail.namespaceExists = false;
    detail.namespaceNote = `Namespace "${namespace}" does not exist or is not readable; Jobs will fail until it is created.`;
  }

  // Job mode permissions
  const canCreateJobs = await checkPermission(authzApi, namespace, "create", "jobs", "batch");
  detail.canCreateJobs = canCreateJobs;

  // Gateway mode permissions
  const [canCreateServices, canDeleteServices, canCreateDeployments, canDeleteDeployments, canGetPods] =
    await Promise.all([
      checkPermission(authzApi, namespace, "create", "services", ""),
      checkPermission(authzApi, namespace, "delete", "services", ""),
      checkPermission(authzApi, namespace, "create", "deployments", "apps"),
      checkPermission(authzApi, namespace, "delete", "deployments", "apps"),
      checkPermission(authzApi, namespace, "get", "pods", ""),
    ]);

  detail.canCreateServices = canCreateServices;
  detail.canDeleteServices = canDeleteServices;
  detail.canCreateDeployments = canCreateDeployments;
  detail.canDeleteDeployments = canDeleteDeployments;
  detail.canGetPods = canGetPods;

  return { ok: true, detail };
}
