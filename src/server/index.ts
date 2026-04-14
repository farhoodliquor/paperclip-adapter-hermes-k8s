import type { ServerAdapterModule } from "@paperclipai/adapter-utils";
import { type, models, agentConfigurationDoc } from "../index.js";
import { execute } from "./execute.js";
import { testEnvironment } from "./test.js";
import { sessionCodec } from "./session.js";
import { getConfigSchema } from "./config-schema.js";
import { onHireApproved } from "./hire-hook.js";
import { getQuotaWindows } from "./quota.js";
import { listModels } from "./models.js";

export function createServerAdapter(): ServerAdapterModule {
  const adapter: ServerAdapterModule = {
    type,
    execute,
    testEnvironment,
    sessionCodec,
    models,
    supportsLocalAgentJwt: true,
    agentConfigurationDoc,
    getConfigSchema,

    // Phase 2: Session management
    sessionManagement: {
      supportsSessionResume: true,
      nativeContextManagement: "likely",
      defaultSessionCompaction: {
        enabled: true,
        maxSessionRuns: 0,
        maxRawInputTokens: 0,
        maxSessionAgeHours: 0,
      },
    },

    // Phase 3: Lifecycle hook
    onHireApproved,

    // Phase 4: K8s quota reporting
    getQuotaWindows: () => getQuotaWindows(),

    // Phase 5: Dynamic model discovery
    listModels: () => listModels(),
  };

  // Phase 1: Capability flags — forward-compatible with upcoming adapter-utils release
  // These fields are defined in the fork's ServerAdapterModule but not yet published.
  const extended = adapter as ServerAdapterModule & Record<string, unknown>;
  extended.supportsInstructionsBundle = true;
  extended.instructionsPathKey = "instructionsFilePath";
  extended.requiresMaterializedRuntimeSkills = true;

  return extended;
}

export { execute, testEnvironment, sessionCodec };
