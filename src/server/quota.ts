import type { ProviderQuotaResult, QuotaWindow } from "@paperclipai/adapter-utils";
import { getCoreApi } from "./k8s-client.js";

export async function getQuotaWindows(kubeconfigPath?: string, namespace?: string): Promise<ProviderQuotaResult> {
  const resolvedNamespace = namespace ?? process.env.PAPERCLIP_NAMESPACE ?? "default";

  try {
    const coreApi = getCoreApi(kubeconfigPath);
    const quotaList = await coreApi.listNamespacedResourceQuota({ namespace: resolvedNamespace });

    if (quotaList.items.length === 0) {
      return { provider: "kubernetes", ok: true, windows: [], source: `namespace/${resolvedNamespace}` };
    }

    const windows: QuotaWindow[] = [];

    for (const quota of quotaList.items) {
      const name = quota.metadata?.name ?? "unknown";
      const hard = quota.status?.hard ?? {};
      const used = quota.status?.used ?? {};

      for (const resource of ["cpu", "memory", "pods", "requests.cpu", "requests.memory", "limits.cpu", "limits.memory"]) {
        const hardVal = hard[resource];
        const usedVal = used[resource];
        if (hardVal === undefined) continue;

        const hardNum = parseResourceValue(String(hardVal));
        const usedNum = parseResourceValue(String(usedVal ?? "0"));
        const usedPercent = hardNum > 0 ? Math.round((usedNum / hardNum) * 100) : null;

        windows.push({
          label: `${name}/${resource}`,
          usedPercent,
          resetsAt: null,
          valueLabel: `${usedVal ?? "0"} / ${hardVal}`,
        });
      }
    }

    return { provider: "kubernetes", ok: true, windows, source: `namespace/${resolvedNamespace}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { provider: "kubernetes", ok: false, error: msg, windows: [] };
  }
}

function parseResourceValue(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;

  // CPU: millicores
  if (trimmed.endsWith("m")) return parseFloat(trimmed) / 1000;

  // Memory suffixes
  const memSuffixes: Record<string, number> = {
    Ki: 1024,
    Mi: 1024 ** 2,
    Gi: 1024 ** 3,
    Ti: 1024 ** 4,
    k: 1000,
    M: 1000 ** 2,
    G: 1000 ** 3,
    T: 1000 ** 4,
  };

  for (const [suffix, multiplier] of Object.entries(memSuffixes)) {
    if (trimmed.endsWith(suffix)) {
      return parseFloat(trimmed) * multiplier;
    }
  }

  return parseFloat(trimmed) || 0;
}
