import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/server/execute.ts",  // K8s API calls - requires live cluster
        "src/server/test.ts",     // K8s API calls - requires live cluster
        "src/server/k8s-client.ts", // K8s API calls - requires live cluster
        "src/server/job-manifest.ts", // K8s object builders - requires live cluster
        "src/server/gateway-client.ts", // HTTP client - requires live gateway
        "src/server/gateway-manager.ts", // K8s API calls - requires live cluster
        "src/server/gateway-manifest.ts", // K8s object builders - requires live cluster
        "src/server/hire-hook.ts", // K8s API calls - requires live cluster
        "src/server/models.ts", // K8s API calls - requires live cluster
        "src/server/quota.ts", // K8s API calls - requires live cluster
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
