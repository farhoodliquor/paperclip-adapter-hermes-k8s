import type { HireApprovedPayload, HireApprovedHookResult } from "@paperclipai/adapter-utils";
import { getCoreApi, getAuthzApi } from "./k8s-client.js";

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

  try {
    const authzApi = getAuthzApi(kubeconfigPath);
    const review = await authzApi.createSelfSubjectAccessReview({
      body: {
        apiVersion: "authorization.k8s.io/v1",
        kind: "SelfSubjectAccessReview",
        spec: {
          resourceAttributes: {
            namespace,
            verb: "create",
            resource: "jobs",
            group: "batch",
          },
        },
      },
    });
    detail.canCreateJobs = review.status?.allowed ?? false;
  } catch {
    detail.canCreateJobs = "unknown";
  }

  return { ok: true, detail };
}
