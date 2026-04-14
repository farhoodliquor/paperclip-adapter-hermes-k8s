import type { AdapterModel } from "@paperclipai/adapter-utils";
import { models as staticModels } from "../index.js";
import { getCoreApi } from "./k8s-client.js";

export async function listModels(kubeconfigPath?: string, namespace?: string): Promise<AdapterModel[]> {
  const resolvedNamespace = namespace ?? process.env.PAPERCLIP_NAMESPACE ?? "default";
  const configMapName = "hermes-models";

  try {
    const coreApi = getCoreApi(kubeconfigPath);
    const cm = await coreApi.readNamespacedConfigMap({ name: configMapName, namespace: resolvedNamespace });
    const data = cm.data ?? {};
    const modelsJson = data["models.json"] ?? data.models;
    if (!modelsJson) return [...staticModels];

    const parsed = JSON.parse(modelsJson);
    if (!Array.isArray(parsed)) return [...staticModels];

    const dynamicModels: AdapterModel[] = parsed
      .filter((m: unknown): m is { id: string; label?: string } =>
        typeof m === "object" && m !== null && typeof (m as Record<string, unknown>).id === "string",
      )
      .map((m) => ({ id: m.id, label: m.label ?? m.id }));

    if (dynamicModels.length === 0) return [...staticModels];

    // Merge: dynamic models first, then static models not already present
    const seen = new Set(dynamicModels.map((m) => m.id));
    for (const m of staticModels) {
      if (!seen.has(m.id)) dynamicModels.push(m);
    }

    return dynamicModels;
  } catch {
    return [...staticModels];
  }
}
